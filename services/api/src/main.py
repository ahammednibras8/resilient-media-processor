"""
API Service: The Receptionist.
"""

import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from resilient_commons import JobCreateRequest, JobResponse, JobRecord, JobStatus
from .dependencies import get_firestore_client, get_bucket, get_settings

app = FastAPI(title="Resilient Media Processor API")

# CORS: Allow frontend to call API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/v1/jobs", response_model=JobResponse)
def create_job(request: JobCreateRequest):
    """
    The Permission Slip Machine.

    1. Validate request (automatic via Pydantic)
    2. Generate job_id
    3. Create Firestore record
    4. Generate Signed URL
    5. Return response
    """
    settings = get_settings()

    # 2. Generate IDs
    job_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).strftime("%d%m%Y_%H%M%S")
    video_id = f"{timestamp}_{request.filename}"
    bucket_path = f"gs://{settings['bucket_name']}/{video_id}"

    # 3. Create Firestore record
    db = get_firestore_client()
    job_record = JobRecord(
        job_id=job_id,
        video_id=video_id,
        status=JobStatus.PENDING_UPLOAD,
        created_at=datetime.now(timezone.utc),
        bucket_path=bucket_path,
    )
    db.collection("jobs").document(job_id).set(job_record.model_dump(mode="json"))

    # 4. Generate Signed URL
    bucket = get_bucket()
    blob = bucket.blob(video_id)
    upload_url = blob.generate_signed_url(
        version="v4",
        expiration=900,  # 15 Minutes
        method="PUT",
        content_type=request.content_type,
    )

    # 5. Return response
    return JobResponse(
        job_id=job_id,
        upload_url=upload_url,
        status=JobStatus.PENDING_UPLOAD,
        created_at=job_record.created_at,
    )


@app.get("/v1/jobs/{job_id}")
def get_job_status(job_id: str):
    """Get the current status of a job."""
    db = get_firestore_client()
    doc = db.collection("jobs").document(job_id).get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Job not found")

    return doc.to_dict()
