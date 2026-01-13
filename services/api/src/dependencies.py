"""
Dependencies: Cloud client initialization.
"""

import os
from functools import lru_cache
from google.cloud import storage, firestore


@lru_cache
def get_settings():
    """Load settings from environment."""
    return {
        "project_id": os.environ.get("PROJECT_ID"),
        "bucket_name": os.environ.get("GCS_BUCKET"),
    }


@lru_cache
def get_storage_client() -> storage.Client:
    """Initialize GCS client (cached)."""
    settings = get_settings()
    return storage.Client(project=settings["project_id"])


@lru_cache
def get_firestore_client() -> firestore.Client:
    """Initialize Firestore client (cached)."""
    settings = get_settings()
    return firestore.Client(project=settings["project_id"])


def get_bucket() -> storage.Bucket:
    """Get the upload bucket."""
    settings = get_settings()
    client = get_storage_client()
    return client.bucket(settings["bucket_name"])
