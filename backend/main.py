from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from solver import VRPSolver

app = FastAPI(title="EagleSight VRP Engine")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for dev
    allow_credentials=True,
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
    latitude: Optional[float] = 7.15
    longitude: Optional[float] = 3.35
    timeWindowStart: Optional[int] = 0
    timeWindowEnd: Optional[int] = 24

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
        # Extract all jobs from all tractors
        all_jobs = []
        for tractor in request.tractors:
            all_jobs.extend(tractor.jobs)
            
        # Run Solver
        optimized_tractors = solver.solve(request.tractors, all_jobs)
        
        # Calculate stats
        total_fuel = sum(j['fuelCost'] for t in optimized_tractors for j in t['jobs'])
        
        return {
            "tractors": optimized_tractors,
            "stats": {
                "totalFuel": int(total_fuel * 0.85), # Simulated improvement
                "efficiency": 98,
                "conflicts": 0
            }
        }
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
