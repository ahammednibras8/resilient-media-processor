terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Variables

variable "project_id" {
  type        = string
  description = "The GCP project ID"
}

variable "region" {
  type        = string
  default     = "us-central1"
  description = "The primary region (Iowa - cheapest)"
}

# A.1: Enable APIs

resource "google_project_service" "firestore" {
  project            = var.project_id
  service            = "firestore.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "storage" {
  project            = var.project_id
  service            = "storage.googleapis.com"
  disable_on_destroy = false
}

# A.2: GCS Bucket ("The Loading Dock")

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "google_storage_bucket" "uploads" {
  name          = "resilient-uploads-${random_id.bucket_suffix.hex}"
  location      = var.region
  force_destroy = true

  uniform_bucket_level_access = true
  storage_class               = "STANDARD"

  # CORS Configuration - Allows browser to upload directly
  cors {
    origin          = ["*"]
    method          = ["GET", "PUT", "POST", "DELETE", "OPTIONS"]
    response_header = ["Content-Type", "Content-Length", "Content-MD5"]
    max_age_seconds = 3600
  }

  # Lifecycle Rule - Auto-delete incomplete uploads after 1 day
  lifecycle_rule {
    condition {
      age = 1
    }
    action {
      type = "AbortIncompleteMultipartUpload"
    }
  }
}

# A.3: Firestore Database ("The State Clipboard")

resource "google_firestore_database" "main" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.firestore]
}

# A.4: Service Account ("The Identity for Signing")

resource "google_service_account" "api_signer" {
  account_id   = "api-signer"
  display_name = "API Signer Service Account"
  description  = "Used by the API to generate signed URLs for GCS uploads"
  project      = var.project_id
}

# A.5: IAM Bindings

# Allow the service account to create signed URLs (requires objectAdmin or objectCreator)
resource "google_storage_bucket_iam_member" "api_signer_storage" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.api_signer.email}"
}

# Allow the service account to read/write Firestore
resource "google_project_iam_member" "api_signer_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.api_signer.email}"
}

# Outputs

output "bucket_name" {
  value       = google_storage_bucket.uploads.name
  description = "The name of the upload bucket"
}

output "bucket_url" {
  value       = "gs://${google_storage_bucket.uploads.name}"
  description = "The GCS URL of the upload bucket"
}

output "service_account_email" {
  value       = google_service_account.api_signer.email
  description = "The email of the API signer service account"
}

output "firestore_database" {
  value       = google_firestore_database.main.name
  description = "The name of the Firestore database"
}
