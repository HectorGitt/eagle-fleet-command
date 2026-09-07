import math
from typing import Any, Dict, List, Optional, Tuple

from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

# Depot: Omatsola Complex, Alausa, Ikeja
DEPOT_COORDS = (6.615, 3.355)

# Average field-to-field speed for a tractor moving between sites (km/h)
AVERAGE_SPEED_KMH = 30

# Default working day used when a job carries no time window (hours)
WORKDAY_START = 6
WORKDAY_END = 18

# A machine with fewer than this many hours before service is grounded.
# Matches the deployed Cloud Function so both engines agree.
MAINTENANCE_GROUNDING_HOURS = 6

# Cost of leaving a job unassigned. Must dominate any routing cost (metres),
# so the solver only drops a job when no feasible slot exists.
DROP_PENALTY = 10_000_000

# Search budget for the local search phase (seconds)
SOLVER_TIME_LIMIT_SECONDS = 3


class VRPSolver:
    """Capacitated VRP with time windows over real lat/lng coordinates.

    Distances are metres and times are minutes so that fractional job
    durations and short inter-field hops survive the integer arithmetic
    OR-Tools requires.
    """

    def haversine_distance(self, loc1, loc2) -> float:
        # Calculate distance between two lat/lng points in km
        R = 6371  # Earth radius in km
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

    def job_coords(self, job) -> Tuple[float, float]:
        """Coordinates for a job, falling back to the depot when unset."""
        lat = getattr(job, 'latitude', None)
        lng = getattr(job, 'longitude', None)
        if lat is None or lng is None:
            return DEPOT_COORDS
        return (float(lat), float(lng))

    def job_time_window(self, job) -> Tuple[int, int]:
        """Job time window in minutes from midnight, clamped to a sane range."""
        start = getattr(job, 'timeWindowStart', None)
        end = getattr(job, 'timeWindowEnd', None)
        start = WORKDAY_START if start is None else float(start)
        end = WORKDAY_END if end is None else float(end)

        start_min = max(0, min(int(round(start * 60)), 24 * 60))
        end_min = max(0, min(int(round(end * 60)), 24 * 60))
        if end_min < start_min:
            start_min, end_min = end_min, start_min
        return (start_min, end_min)

    def vehicle_capacity_minutes(self, tractor) -> int:
        """Working minutes a tractor may spend on a route.

        Capped by both the shift length and the hours left before its next
        service, so a machine is never routed past its maintenance window.
        """
        max_hours = float(getattr(tractor, 'maxHours', 0) or 0)
        due_in = getattr(tractor, 'maintenanceDueIn', None)
        if due_in is not None:
            max_hours = min(max_hours, float(due_in))
        return max(0, int(round(max_hours * 60)))

    def split_fleet(self, tractors) -> Tuple[List[Any], List[Dict[str, Any]]]:
        """Separate the usable fleet from machines that must stay parked."""
        available, grounded = [], []
        for tractor in tractors:
            due_in = getattr(tractor, 'maintenanceDueIn', None)
            if due_in is not None and float(due_in) < MAINTENANCE_GROUNDING_HOURS:
                grounded.append({
                    "tractorId": tractor.tractorId,
                    "reason": f"CRITICAL: Maintenance Due in {due_in}h",
                })
            elif self.vehicle_capacity_minutes(tractor) <= 0:
                grounded.append({
                    "tractorId": tractor.tractorId,
                    "reason": "No shift hours available for this machine",
                })
            else:
                available.append(tractor)
        return available, grounded

    def create_data_model(self, tractors, jobs):
        """Stores the data for the problem."""
        data = {}

        locations = [DEPOT_COORDS]
        job_map = []  # Maps location index - 1 to the job object
        # Vehicles may leave the depot any time during the working day
        time_windows = [(WORKDAY_START * 60, WORKDAY_END * 60)]
        service_times = [0]  # Depot has no service time

        for job in jobs:
            locations.append(self.job_coords(job))
            job_map.append(job)
            time_windows.append(self.job_time_window(job))
            service_times.append(max(0, int(round(float(job.durationHours) * 60))))

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
        """Returns {'tractors': [...], 'unassigned': [...], 'grounded': [...]}."""
        available, grounded = self.split_fleet(tractors)
        grounded_ids = {g['tractorId'] for g in grounded}

        # Completed work is history - it is neither re-routed nor reported unassigned
        active_jobs = [j for j in jobs if j.status != 'completed']

        # Machines that cannot run today keep their row in the timeline, empty
        empty_routes = {
            t.tractorId: {**t.model_dump(), "jobs": []}
            for t in tractors if t.tractorId in grounded_ids
        }

        def assemble(routes_by_id, unassigned_jobs, reason=None):
            return {
                "tractors": [
                    routes_by_id.get(t.tractorId, {**t.model_dump(), "jobs": []})
                    for t in tractors
                ],
                "unassigned": [self.as_unassigned(j, reason) for j in unassigned_jobs],
                "grounded": grounded,
            }

        if not active_jobs:
            # Every job is already done - hand the fleet back untouched
            return {
                "tractors": [
                    {**t.model_dump(), "jobs": [j.model_dump() for j in t.jobs]}
                    for t in tractors
                ],
                "unassigned": [],
                "grounded": grounded,
            }

        if not available:
            # Whole fleet is grounded - every job falls through to the backlog
            return assemble(empty_routes, active_jobs, "No machine available - entire fleet is grounded")

        data = self.create_data_model(available, active_jobs)

        manager = pywrapcp.RoutingIndexManager(
            len(data['locations']),
            data['num_vehicles'],
            data['depot']
        )
        routing = pywrapcp.RoutingModel(manager)

        def distance_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return data['distance_matrix'][from_node][to_node]

        transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        def time_callback(from_index, to_index):
            # Travel time between the two sites plus the work done at the origin
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
            # Shift start window
            time_dimension.CumulVar(routing.Start(vehicle_id)).SetRange(
                depot_window[0], depot_window[1])
            # Shift length: capped by max hours and hours left before service
            time_dimension.SetSpanUpperBoundForVehicle(
                data['vehicle_capacities'][vehicle_id], vehicle_id)

            routing.AddVariableMinimizedByFinalizer(
                time_dimension.CumulVar(routing.Start(vehicle_id)))
            routing.AddVariableMinimizedByFinalizer(
                time_dimension.CumulVar(routing.End(vehicle_id)))

        # Allow jobs to be dropped instead of failing the whole solve when the
        # fleet is over capacity. Dropped jobs surface as the unassigned backlog.
        for node in range(1, len(data['locations'])):
            routing.AddDisjunction([manager.NodeToIndex(node)], DROP_PENALTY)

        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC)
        search_parameters.local_search_metaheuristic = (
            routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH)
        search_parameters.time_limit.FromSeconds(SOLVER_TIME_LIMIT_SECONDS)

        solution = routing.SolveWithParameters(search_parameters)

        if not solution:
            # Should not happen now that every node is droppable, but never
            # hand the caller a half-built payload.
            print("No solution found - returning every job to the backlog")
            return assemble(empty_routes, active_jobs)

        return self.format_solution(
            data, manager, routing, solution, available, tractors, grounded, empty_routes)

    def as_unassigned(self, job, reason: Optional[str] = None) -> Dict[str, Any]:
        job_dict = job.model_dump() if hasattr(job, 'model_dump') else dict(job)
        job_dict['status'] = 'delayed'
        # Replace any warning carried in from the request - the solver knows why
        job_dict['constraintWarning'] = \
            reason or 'No feasible slot within fleet capacity or time windows'
        return job_dict

    def format_solution(self, data, manager, routing, solution, available,
                        all_tractors, grounded, empty_routes):
        time_dimension = routing.GetDimensionOrDie('Time')
        routes_by_id = dict(empty_routes)
        visited_nodes = set()

        for vehicle_id in range(data['num_vehicles']):
            index = routing.Start(vehicle_id)
            route_jobs = []

            # Walk the route, skipping the depot start node
            index = solution.Value(routing.NextVar(index))

            while not routing.IsEnd(index):
                node_index = manager.IndexToNode(index)

                if node_index != data['depot']:
                    visited_nodes.add(node_index)
                    start_minutes = solution.Min(time_dimension.CumulVar(index))

                    original_job = data['job_map'][node_index - 1]
                    job_dict = original_job.model_dump()
                    job_dict['startTime'] = round(start_minutes / 60, 2)
                    job_dict['status'] = 'scheduled'
                    job_dict['constraintWarning'] = None  # Clear stale warnings

                    route_jobs.append(job_dict)

                index = solution.Value(routing.NextVar(index))

            tractor = available[vehicle_id]
            routes_by_id[tractor.tractorId] = {
                **tractor.model_dump(),
                "jobs": route_jobs,
            }

        unassigned = [
            self.as_unassigned(data['job_map'][node - 1])
            for node in range(1, len(data['locations']))
            if node not in visited_nodes
        ]

        return {
            # Preserve the caller's fleet order so the timeline rows stay put
            "tractors": [
                routes_by_id.get(t.tractorId, {**t.model_dump(), "jobs": []})
                for t in all_tractors
            ],
            "unassigned": unassigned,
            "grounded": grounded,
        }
