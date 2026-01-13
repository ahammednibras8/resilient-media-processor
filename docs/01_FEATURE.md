# Feature 01: The Permission Slip Machine

> **Goal**: Allow users to securely upload large video files directly to cloud
> storage without routing bytes through our API.

---

## User Story

**As a** content creator,\
**I want to** upload a 5GB video file,\
**So that** I can have it processed and transcoded.

---

## The Flow

```
┌─────────────┐      1. "I want to upload"      ┌─────────────┐
│   Frontend  │ ─────────────────────────────▶  │     API     │
│   (React)   │                                 │  (FastAPI)  │
└─────────────┘                                 └──────┬──────┘
                                                       │
                                                       │ 2. Create Job Record
                                                       │    (Firestore)
                                                       │
                                                       │ 3. Generate Signed URL
                                                       │    (GCS)
                                                       ▼
┌─────────────┐      4. Return URL + Job ID     ┌─────────────┐
│   Frontend  │ ◀─────────────────────────────  │     API     │
│   (React)   │                                 │  (FastAPI)  │
└──────┬──────┘                                 └─────────────┘
       │
       │ 5. PUT file directly to GCS
       │    (Browser → Google, NOT our server)
       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud Storage                     │
│                    (The Loading Dock)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase A: Infrastructure (Terraform)

_Deploy the cloud resources before writing any application code._

| Step | Resource                    | Purpose                                     |
| ---- | --------------------------- | ------------------------------------------- |
| A.1  | `google_project_service`    | Enable Firestore & Cloud Storage APIs       |
| A.2  | `google_storage_bucket`     | The "Loading Dock" for raw uploads          |
| A.3  | `google_firestore_database` | The "State Clipboard" for job tracking      |
| A.4  | `google_service_account`    | Identity for signing URLs (least privilege) |
| A.5  | `google_storage_bucket_iam` | Grant service account permission to sign    |

**Files Modified:**

- `infra/main.tf`

---

### Phase B: Shared Contracts (Pydantic)

_Define the "Law" that API and Worker must obey._

| Step | Model              | Fields                                                      |
| ---- | ------------------ | ----------------------------------------------------------- |
| B.1  | `JobCreateRequest` | `filename`, `content_type`, `size_bytes`                    |
| B.2  | `JobRecord`        | `job_id`, `video_id`, `status`, `created_at`, `bucket_path` |
| B.3  | `JobResponse`      | `job_id`, `upload_url`, `status`, `created_at`              |

**Files Modified:**

- `shared/src/resilient_commons/models.py`

---

### Phase C: API Logic (FastAPI)

_The actual business logic._

| Step | Task                        | Details                                  |
| ---- | --------------------------- | ---------------------------------------- |
| C.1  | Initialize GCS Client       | On app startup, connect to Cloud Storage |
| C.2  | Initialize Firestore Client | On app startup, connect to Firestore     |
| C.3  | Implement `POST /v1/jobs`   | See logic below                          |

**`POST /v1/jobs` Logic:**

```
1. Validate request body (JobCreateRequest)
2. Generate job_id (UUID v4)
3. Generate video_id (sanitized filename + timestamp)
4. Create JobRecord in Firestore:
   - status: "pending_upload"
   - created_at: now()
5. Generate Signed URL:
   - Method: PUT
   - Expiration: 15 minutes
   - Content-Type: (from request)
6. Return JobResponse:
   - job_id
   - upload_url
   - status
```

**Files Modified:**

- `services/api/src/main.py`
- `services/api/src/dependencies.py` (new)

---

### Phase D: Frontend Integration (React)

_Prove the "Triangle" works visually._

| Step | Task                     | Details                                |
| ---- | ------------------------ | -------------------------------------- |
| D.1  | Create Upload Page       | File picker + "Upload" button          |
| D.2  | Call `POST /v1/jobs`     | Get signed URL from API                |
| D.3  | PUT File to GCS          | Direct upload using `fetch` or `axios` |
| D.4  | Display Progress         | Show upload percentage                 |
| D.5  | Show Success/Error State | Visual feedback on completion          |

**Files Modified:**

- `services/frontend/src/pages/Upload.tsx` (new)
- `services/frontend/src/api/jobs.ts` (new)

---

## Acceptance Criteria

- [ ] **A.** `terraform apply` successfully creates bucket and database.
- [ ] **B.** Shared models are importable by both API and Worker.
- [ ] **C.** `POST /v1/jobs` returns a valid signed URL.
- [ ] **D.** Frontend can upload a 100MB file directly to GCS.
- [ ] **E.** Firestore contains a job record with `status: pending_upload`.

---

## Non-Goals (Deferred)

- GCS Event Trigger (Feature 02)
- Worker Processing (Feature 03)
- Status Polling (Feature 04)
- Error Handling & Retries (Feature 05)

---

## Dependencies

| Dependency               | Version | Purpose                     |
| ------------------------ | ------- | --------------------------- |
| `google-cloud-storage`   | `^2.0`  | Generate Signed URLs        |
| `google-cloud-firestore` | `^2.0`  | Read/Write Job Records      |
| `pydantic`               | `^2.0`  | Request/Response Validation |
| `axios`                  | `^1.0`  | Frontend HTTP Client        |
