from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from solver import VRPSolver, DEPOT_COORDS, WORKDAY_START, WORKDAY_END

app = FastAPI(title="EagleSight VRP Engine")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for dev
    allow_credentials=False, # "*" origins and credentials cannot be combined
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data Models (Matching Frontend Interfaces)


# Fix Pydantic types for Python (number -> float/int)
class Job(BaseModel):
    id: str
    fieldId: str
    type: str
    durationHours: float
    startTime: float
    fuelCost: float
    profit: float
    status: str
    constraintWarning: Optional[str] = None
    latitude: Optional[float] = DEPOT_COORDS[0]
    longitude: Optional[float] = DEPOT_COORDS[1]
    timeWindowStart: Optional[float] = WORKDAY_START
    timeWindowEnd: Optional[float] = WORKDAY_END

class TractorSchedule(BaseModel):
    tractorId: str
    model: str
    jobs: List[Job]
    maxHours: float
    maintenanceDueIn: float

class OptimizationRequest(BaseModel):
    tractors: List[TractorSchedule]

solver = VRPSolver()

@app.get("/")
def read_root():
    return {"status": "online", "service": "EagleSight VRP Engine"}

@app.post("/optimize")
def optimize_schedule(request: OptimizationRequest):
    try:
        # Pool every job in the fleet so the solver can move work between tractors
        all_jobs = []
        for tractor in request.tractors:
            all_jobs.extend(tractor.jobs)

        result = solver.solve(request.tractors, all_jobs)

        optimized_tractors = result["tractors"]
        unassigned = result["unassigned"]
        grounded = result["grounded"]

        assigned_jobs = [j for t in optimized_tractors for j in t['jobs']]
        total_fuel = sum(j['fuelCost'] for j in assigned_jobs)

        routable = len([j for j in all_jobs if j.status != 'completed'])
        scheduled = len([j for j in assigned_jobs if j['status'] != 'completed'])
        efficiency = int(round(scheduled / routable * 100)) if routable else 100

        return {
            "tractors": optimized_tractors,
            "unassigned": unassigned,
            "grounded": grounded,
            "stats": {
                "totalFuel": int(total_fuel),
                "efficiency": efficiency,
                "conflicts": len(unassigned) + len(grounded)
            }
        }
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
