import math
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

class VRPSolver:
    def __init__(self):
        self.scale_factor = 100  # To handle float distances as integers

    def haversine_distance(self, loc1, loc2):
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

    def create_data_model(self, tractors, jobs):
        """Stores the data for the problem."""
        data = {}
        
        # Locations: Depot (0,0) + Job Locations
        # Use real coordinates. Depot: Omatsola Complex, Alausa, Ikeja
        depot_coords = (6.615, 3.355) 
        locations = [depot_coords] 
        job_map = [] # Maps index to job object
        time_windows = [(0, 24)] # Depot time window (all day)

        for job in jobs:
            # Use job coordinates if available, else default to depot
            lat = getattr(job, 'latitude', 6.615)
            lng = getattr(job, 'longitude', 3.355)
            locations.append((lat, lng))
            job_map.append(job)
            
            # Time Windows
            start = getattr(job, 'timeWindowStart', 0)
            end = getattr(job, 'timeWindowEnd', 24)
            time_windows.append((start, end))

        data['locations'] = locations
        data['job_map'] = job_map
        data['time_windows'] = time_windows
        
        # Calculate Distance Matrix
        num_locations = len(locations)
        distance_matrix = {}
        for from_node in range(num_locations):
            distance_matrix[from_node] = {}
            for to_node in range(num_locations):
                dist = self.haversine_distance(locations[from_node], locations[to_node])
                distance_matrix[from_node][to_node] = int(dist * self.scale_factor)
        
        data['distance_matrix'] = distance_matrix
        data['num_vehicles'] = len(tractors)
        data['depot'] = 0
        
        # Service times (duration of jobs)
        service_times = [0] # Depot has 0 service time
        for job in jobs:
            service_times.append(int(job.durationHours))
        data['service_times'] = service_times
        
        return data

    def solve(self, tractors, jobs):
        # Filter out completed jobs
        active_jobs = [j for j in jobs if j.status != 'completed']
        
        if not active_jobs:
            return tractors # Nothing to optimize

        data = self.create_data_model(tractors, active_jobs)

        # Create the routing index manager.
        manager = pywrapcp.RoutingIndexManager(
            len(data['locations']),
            data['num_vehicles'],
            data['depot']
        )

        # Create Routing Model.
        routing = pywrapcp.RoutingModel(manager)

        # Create and register a transit callback.
        def distance_callback(from_index, to_index):
            # Returns the distance between the two nodes.
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return data['distance_matrix'][from_node][to_node]

        transit_callback_index = routing.RegisterTransitCallback(distance_callback)

        # Define cost of each arc.
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        # Add Time Window constraint.
        def time_callback(from_index, to_index):
            # Returns the travel time + service time
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            # Assume 1 hour per 100 units of distance (approx 100km/h for simplicity/demo)
            travel_time = int(data['distance_matrix'][from_node][to_node] / self.scale_factor)
            service_time = data['service_times'][from_node]
            return travel_time + service_time

        time_callback_index = routing.RegisterTransitCallback(time_callback)
        
        routing.AddDimension(
            time_callback_index,
            24,  # allow waiting time
            24,  # maximum time per vehicle
            False,  # Don't force start cumul to zero
            'Time')
        
        time_dimension = routing.GetDimensionOrDie('Time')
        
        # Add time window constraints for each location except depot.
        for location_idx, time_window in enumerate(data['time_windows']):
            if location_idx == 0:
                continue
            index = manager.NodeToIndex(location_idx)
            time_dimension.CumulVar(index).SetRange(time_window[0], time_window[1])

        # Add time window constraints for each vehicle start node.
        for vehicle_id in range(data['num_vehicles']):
            index = routing.Start(vehicle_id)
            time_dimension.CumulVar(index).SetRange(data['time_windows'][0][0],
                                                    data['time_windows'][0][1])

        # Instantiate route start and end times to produce feasible times.
        for i in range(data['num_vehicles']):
            routing.AddVariableMinimizedByFinalizer(
                time_dimension.CumulVar(routing.Start(i)))
            routing.AddVariableMinimizedByFinalizer(
                time_dimension.CumulVar(routing.End(i)))

        # Setting first solution heuristic.
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC)

        # Solve the problem.
        solution = routing.SolveWithParameters(search_parameters)

        # Format solution
        if solution:
            return self.format_solution(data, manager, routing, solution, tractors)
        else:
            print("No solution found!")
            return tractors

    def format_solution(self, data, manager, routing, solution, tractors):
        optimized_tractors = []
        time_dimension = routing.GetDimensionOrDie('Time')
        
        for vehicle_id in range(data['num_vehicles']):
            index = routing.Start(vehicle_id)
            route_jobs = []
            
            # Skip depot (start)
            index = solution.Value(routing.NextVar(index))
            
            while not routing.IsEnd(index):
                node_index = manager.IndexToNode(index)
                time_var = time_dimension.CumulVar(index)
                start_time = solution.Min(time_var)
                
                # Node 0 is depot, others are jobs (index - 1)
                if node_index > 0:
                    original_job = data['job_map'][node_index - 1]
                    
                    # Update job schedule (convert Pydantic to dict, update, convert back)
                    job_dict = original_job.dict()
                    job_dict['startTime'] = start_time
                    job_dict['status'] = 'scheduled'
                    job_dict['constraintWarning'] = None # Clear warnings
                    
                    route_jobs.append(job_dict)
                
                index = solution.Value(routing.NextVar(index))
            
            # Create updated tractor object
            original_tractor = tractors[vehicle_id]
            optimized_tractors.append({
                **original_tractor.dict(),
                "jobs": route_jobs
            })
            
        return optimized_tractors
