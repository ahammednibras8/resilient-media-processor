"""
Shared Contracts: The "Law" that API and Worker must obey.
"""

from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    """All possible states a job can be in."""

    PENDING_UPLOAD = "pending_upload"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# B.1: What the Frontend sends to create a job
class JobCreateRequest(BaseModel):
    filename: str = Field(..., description="Original filename from the user")
    content_type: str = Field(..., description="MIME type, e.g. video/mp4")
    size_bytes: int = Field(..., gt=0, description="File size in bytes")


# B.2: What we store in Firestore
class JobRecord(BaseModel):
    job_id: str = Field(..., description="Unique job identifier (UUID)")
    video_id: str = Field(..., description="Sanitized filename for storage")
    status: JobStatus = Field(default=JobStatus.PENDING_UPLOAD)
    created_at: datetime = Field(default_factory=datetime.now)
    bucket_path: str = Field(..., description="Full GCS path: gs://bucket/path")


# B.3: What we return to the Frontend
class JobResponse(BaseModel):
    job_id: str
    upload_url: str = Field(..., description="Signed URL for direct upload")
    status: JobStatus
    created_at: datetime
