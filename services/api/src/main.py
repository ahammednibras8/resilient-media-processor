from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uuid
import datetime
import random

app = FastAPI()


# --- Data Models (Contracts) ---
class JobCreateRequest(BaseModel):
    filename: str
    content_type: str
    size_bytes: int


class JobResponse(BaseModel):
    job_id: str
    upload_url: str
    status: str
    created_at: datetime.datetime


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: int
    result_url: str | None = None


# --- Mock Endpoints ---


@app.post("/v1/jobs", response_model=JobResponse)
def create_job(request: JobCreateRequest):
    """
    1. Generates a unique Job ID.
    2. Generates a (Mock) Signed URL for direct GCS upload.
    3. Returns the upload details to the client.
    """
    job_id = str(uuid.uuid4())

    # In reality, we would ask GCS for this signature
    mock_signed_url = (
        f"https://storage.googleapis.com/resilient-uploads/{job_id}?signature=mock123"
    )

    return {
        "job_id": job_id,
        "upload_url": mock_signed_url,
        "status": "pending_upload",
        "created_at": datetime.datetime.now(datetime.timezone.utc),
    }


@app.get("/v1/jobs/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str):
    """
    Simulates checking the state of a job.
    Randomly returns different states to demonstrate the UI flow.
    """
    # Simulate different states for demo purposes
    states = ["queued", "processing", "completed", "failed"]
    fake_status = random.choice(states)

    return {
        "job_id": job_id,
        "status": fake_status,
        "progress": random.randint(0, 100),
        "result_url": f"https://cdn.example.com/{job_id}.mp4"
        if fake_status == "completed"
        else None,
    }
