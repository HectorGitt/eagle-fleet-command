"""EagleSight VRP engine - Google Cloud Function.

Deployed to Cloud Run at https://eagle-api-968838168792.us-central1.run.app
Entry point: optimize_fleet (functions-framework HTTP).

    gcloud functions deploy eagle-api         --gen2 --runtime python311 --region us-central1         --source backend/cloud_function --entry-point optimize_fleet         --trigger-http --allow-unauthenticated

The handler is a catch-all, so the frontend may POST to / or /optimize.
backend/main.py is the equivalent FastAPI app for local development; the two
share the same solver behaviour and response shape.
"""

import math
import functions_framework
from flask import jsonify
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

# ==========================================
# 0. CONSTANTS
# ==========================================
# Depot: Omatsola Complex, Alausa, Ikeja
DEPOT_COORDS = (6.615, 3.355)

# Average field-to-field speed for a tractor moving between sites (km/h)
AVERAGE_SPEED_KMH = 30

# Strict Day Shift: 6 AM - 6 PM
WORKDAY_START = 6
WORKDAY_END = 18

# A machine with fewer than this many hours before service is grounded
MAINTENANCE_GROUNDING_HOURS = 6

# Cost of leaving a job unassigned. Must dominate any routing cost (metres),
# so the solver only drops a job when no feasible slot exists.
DROP_PENALTY = 10_000_000

# Search budget for the local search phase (seconds)
SOLVER_TIME_LIMIT_SECONDS = 3


# ==========================================
# 1. THE SOLVER CLASS (VRP Engine)
# ==========================================
class VRPSolver:
    """Capacitated VRP with time windows over real lat/lng coordinates.

    Distances are metres and times are minutes so that fractional job
    durations and short inter-field hops survive the integer arithmetic
    OR-Tools requires.
    """

    def haversine_distance(self, loc1, loc2):
        """Calculate distance between two lat/lng points in km"""
        R = 6371
        lat1, lon1 = loc1
        lat2, lon2 = loc2

        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2) * math.sin(dlat / 2) + \
            math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
            math.sin(dlon / 2) * math.sin(dlon / 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        d = R * c
        return d

    def job_coords(self, job):
        """Coordinates for a job, falling back to the depot when unset.

        `job.get('latitude', default)` returns None when the key is present
        but null, which crashes the haversine maths - hence the explicit check.
        """
        lat = job.get('latitude')
        lng = job.get('longitude')
        if lat is None or lng is None:
            return DEPOT_COORDS
        return (float(lat), float(lng))

    def job_time_window(self, job):
        """Job time window in minutes from midnight, clamped to a sane range."""
        start = job.get('timeWindowStart')
        end = job.get('timeWindowEnd')
        start = WORKDAY_START if start is None else float(start)
        end = WORKDAY_END if end is None else float(end)

        start_min = max(0, min(int(round(start * 60)), 24 * 60))
        end_min = max(0, min(int(round(end * 60)), 24 * 60))
        if end_min < start_min:
            start_min, end_min = end_min, start_min
        return (start_min, end_min)

    def vehicle_capacity_minutes(self, tractor):
        """Working minutes a tractor may spend on a route.

        Capped by both the shift length and the hours left before its next
        service, so a machine is never routed past its maintenance window.
        """
        max_hours = float(tractor.get('maxHours') or 0)
        due_in = tractor.get('maintenanceDueIn')
        if due_in is not None:
            max_hours = min(max_hours, float(due_in))
        return max(0, int(round(max_hours * 60)))

    def create_data_model(self, tractors, jobs):
        data = {}
        locations = [DEPOT_COORDS]
        job_map = []
        # Vehicles may leave the depot any time during the working day
        time_windows = [(WORKDAY_START * 60, WORKDAY_END * 60)]
        service_times = [0]  # Depot has no service time

        for job in jobs:
            locations.append(self.job_coords(job))
            job_map.append(job)
            time_windows.append(self.job_time_window(job))
            service_times.append(max(0, int(round(float(job.get('durationHours') or 0) * 60))))

        data['locations'] = locations
        data['job_map'] = job_map
        data['time_windows'] = time_windows
        data['service_times'] = service_times

        # Distance matrix in metres, travel time matrix in whole minutes
        num_locations = len(locations)
        distance_matrix = []
        travel_time_matrix = []
        for from_node in range(num_locations):
            distance_row, time_row = [], []
            for to_node in range(num_locations):
                km = self.haversine_distance(locations[from_node], locations[to_node])
                distance_row.append(int(round(km * 1000)))
                time_row.append(int(math.ceil(km / AVERAGE_SPEED_KMH * 60)))
            distance_matrix.append(distance_row)
            travel_time_matrix.append(time_row)

        data['distance_matrix'] = distance_matrix
        data['travel_time_matrix'] = travel_time_matrix
        data['num_vehicles'] = len(tractors)
        data['depot'] = 0
        data['vehicle_capacities'] = [self.vehicle_capacity_minutes(t) for t in tractors]

        return data

    def solve(self, tractors, jobs):
        active_jobs = [j for j in jobs if j.get('status') != 'completed']

        if not active_jobs:
            return tractors, []

        data = self.create_data_model(tractors, active_jobs)

        manager = pywrapcp.RoutingIndexManager(
            len(data['locations']),
            data['num_vehicles'],
            data['depot']
        )
        routing = pywrapcp.RoutingModel(manager)

        # Distance Callback
        def distance_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return data['distance_matrix'][from_node][to_node]

        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        # Time Callback: travel time between sites plus the work done at the origin
        def time_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return data['travel_time_matrix'][from_node][to_node] + data['service_times'][from_node]

        time_callback_index = routing.RegisterTransitCallback(time_callback)

        routing.AddDimension(
            time_callback_index,
            WORKDAY_END * 60,   # slack: a tractor may idle until a window opens
            WORKDAY_END * 60,   # every route must be back at the depot by close of day
            False,              # start times are not forced to zero
            'Time')

        time_dimension = routing.GetDimensionOrDie('Time')

        # Job time windows
        for location_idx, time_window in enumerate(data['time_windows']):
            if location_idx == data['depot']:
                continue
            index = manager.NodeToIndex(location_idx)
            time_dimension.CumulVar(index).SetRange(time_window[0], time_window[1])

        depot_window = data['time_windows'][data['depot']]
        for vehicle_id in range(data['num_vehicles']):
            # Shift start and return windows
            time_dimension.CumulVar(routing.Start(vehicle_id)).SetRange(
                depot_window[0], depot_window[1])
            time_dimension.CumulVar(routing.End(vehicle_id)).SetRange(
                depot_window[0], depot_window[1])

            # --- Shift capacity: the fix for "one tractor takes every job" ---
            # Without this the objective only minimises distance, so a single
            # vehicle absorbs the whole fleet's work and maxHours is ignored.
            time_dimension.SetSpanUpperBoundForVehicle(
                data['vehicle_capacities'][vehicle_id], vehicle_id)

            routing.AddVariableMinimizedByFinalizer(
                time_dimension.CumulVar(routing.Start(vehicle_id)))
            routing.AddVariableMinimizedByFinalizer(
                time_dimension.CumulVar(routing.End(vehicle_id)))

        # --- Allow Dropping Jobs (Penalty) ---
        # If a job cannot fit, drop it with a high penalty cost.
        # This prevents the solver from returning a broken/colliding schedule.
        for node in range(1, len(data['locations'])):
            routing.AddDisjunction([manager.NodeToIndex(node)], DROP_PENALTY)
        # ------------------------------------------

        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC)
        # Dropping jobs makes the first solution a poor one - keep improving it
        search_parameters.local_search_metaheuristic = (
            routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH)
        search_parameters.time_limit.FromSeconds(SOLVER_TIME_LIMIT_SECONDS)

        solution = routing.SolveWithParameters(search_parameters)

        if solution:
            return self.format_solution(data, manager, routing, solution, tractors)

        # Every node is droppable, so this should not happen - but never hand
        # back a schedule that silently pretends the work was placed.
        empty_routes = [{**t, 'jobs': []} for t in tractors]
        return empty_routes, [
            {**job, 'status': 'unassigned',
             'constraintWarning': 'Solver found no feasible schedule'}
            for job in active_jobs
        ]

    def format_solution(self, data, manager, routing, solution, tractors):
        optimized_tractors = []
        time_dimension = routing.GetDimensionOrDie('Time')

        # Track which jobs were assigned
        assigned_job_ids = set()

        for vehicle_id in range(data['num_vehicles']):
            index = routing.Start(vehicle_id)
            route_jobs = []

            index = solution.Value(routing.NextVar(index))

            while not routing.IsEnd(index):
                node_index = manager.IndexToNode(index)
                time_var = time_dimension.CumulVar(index)
                start_minutes = solution.Min(time_var)

                if node_index > 0:
                    job_dict = data['job_map'][node_index - 1].copy()
                    # Minutes back to the fractional hours the UI draws with
                    job_dict['startTime'] = round(start_minutes / 60, 2)
                    job_dict['status'] = 'scheduled'

                    # Track ID
                    assigned_job_ids.add(job_dict['id'])

                    # Warning Logic
                    current_tractor = tractors[vehicle_id]
                    existing_warning = job_dict.get('constraintWarning')

                    if existing_warning == "Maintenance Risk":
                        if current_tractor.get('maintenanceDueIn', 0) > 20:
                            job_dict['constraintWarning'] = None
                    elif existing_warning == "Scheduling Conflict":
                        job_dict['constraintWarning'] = None

                    route_jobs.append(job_dict)

                index = solution.Value(routing.NextVar(index))

            original_tractor = tractors[vehicle_id].copy()
            original_tractor['jobs'] = route_jobs
            optimized_tractors.append(original_tractor)

        # Identify Unassigned Jobs
        unassigned_jobs = []
        for job in data['job_map']:
            if job['id'] not in assigned_job_ids:
                job_copy = job.copy()
                job_copy['status'] = 'unassigned'
                job_copy['constraintWarning'] = 'Capacity Overflow (No Time Slot)'
                unassigned_jobs.append(job_copy)

        return optimized_tractors, unassigned_jobs


# ==========================================
# 2. FLUID MECHANICS LOGIC
# ==========================================
def check_hydraulic_health(telemetry):
    oil_temp = telemetry.get('engineTemp', 90)
    pressure = telemetry.get('hydraulicPressure', 2200)
    if oil_temp > 105 and pressure < 1800:
        return {"is_safe": False, "reason": "CRITICAL: Thermal Viscosity Breakdown"}
    return {"is_safe": True, "reason": "Systems Nominal"}


# ==========================================
# 3. HANDLER
# ==========================================
solver = VRPSolver()


@functions_framework.http
def optimize_fleet(request):
    if request.method == 'OPTIONS':
        headers = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '3600'}
        return ('', 204, headers)

    headers = {'Access-Control-Allow-Origin': '*'}
    request_json = request.get_json(silent=True)
    if not request_json or 'tractors' not in request_json:
        return (jsonify({"error": "Invalid JSON"}), 400, headers)

    tractors_data = request_json['tractors']

    try:
        available_tractors = []
        grounded_tractors = []
        all_jobs = []

        # PHYSICS & MAINTENANCE CHECK
        for tractor in tractors_data:
            tid = tractor.get('id') or tractor.get('tractorId')

            # Add jobs to pool regardless of health (to be rescued)
            if 'jobs' in tractor:
                all_jobs.extend(tractor['jobs'])

            # Health Check
            is_faulty = tid == "T-002"
            mock_telemetry = {"engineTemp": 110 if is_faulty else 90, "hydraulicPressure": 1700 if is_faulty else 2200}
            fluid_health = check_hydraulic_health(mock_telemetry)

            maintenance_hours = tractor.get('maintenanceDueIn', 100)
            is_maintenance_risk = maintenance_hours < MAINTENANCE_GROUNDING_HOURS

            if not fluid_health["is_safe"]:
                grounded_tractors.append({"tractorId": tid, "status": "GROUNDED", "reason": fluid_health["reason"], "telemetry": mock_telemetry})
            elif is_maintenance_risk:
                grounded_tractors.append({"tractorId": tid, "status": "GROUNDED", "reason": f"CRITICAL: Maintenance Due in {maintenance_hours}h", "telemetry": mock_telemetry})
            else:
                available_tractors.append(tractor)

        # OPTIMIZATION with Unassigned handling
        if available_tractors:
            optimized_tractors, unassigned_jobs = solver.solve(available_tractors, all_jobs)
        else:
            # All unassigned if no tractors
            optimized_tractors = []
            unassigned_jobs = [
                {**job, 'status': 'unassigned',
                 'constraintWarning': 'No machine available - entire fleet is grounded'}
                for job in all_jobs if job.get('status') != 'completed'
            ]

        # A grounded machine still owns a row in the timeline - hand it back
        # with an empty route instead of dropping it from the response.
        routes_by_id = {}
        for tractor in optimized_tractors:
            routes_by_id[tractor.get('id') or tractor.get('tractorId')] = tractor

        response_tractors = []
        for tractor in tractors_data:
            tid = tractor.get('id') or tractor.get('tractorId')
            response_tractors.append(routes_by_id.get(tid, {**tractor, 'jobs': []}))

        # STATS
        total_fuel = 0
        scheduled_jobs_count = 0
        for t in response_tractors:
            for j in t.get('jobs', []):
                total_fuel += j.get('fuelCost', 0)
                if j.get('status') != 'completed':
                    scheduled_jobs_count += 1

        # Completed work is history - it was never up for scheduling
        total_active_jobs = len([j for j in all_jobs if j.get('status') != 'completed'])
        conflicts = len(unassigned_jobs) + len(grounded_tractors)
        efficiency = 100
        if total_active_jobs > 0:
            efficiency = int(round((scheduled_jobs_count / total_active_jobs) * 100))

        return (jsonify({
            "tractors": response_tractors,
            "grounded": grounded_tractors,
            "unassigned": unassigned_jobs,  # New Field for UI
            "stats": {
                "totalFuel": int(total_fuel),
                "efficiency": efficiency,
                "conflicts": conflicts,
                "optimizationMethod": "Google OR-Tools (MIP)",
                "physicsEngine": "Active",
                "status": "Optimized"
            }
        }), 200, headers)

    except Exception as e:
        return (jsonify({"error": str(e)}), 500, headers)
