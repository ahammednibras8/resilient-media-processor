# Feature 02: The Conveyor Belt Trigger

> **Goal**: Automatically trigger processing when a video is uploaded to GCS.

---

## User Story

**As the** system,\
**When** a video file lands in the upload bucket,\
**I want to** automatically queue it for processing,\
**So that** no manual intervention is needed.

---

## The Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud Storage                     │
│              (Video uploaded via Signed URL)                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ 1. Object Finalized Event
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Eventarc Trigger                        │
│                 (GCS → Pub/Sub Bridge)                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ 2. Publish Message
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Pub/Sub Topic                           │
│              ("video-processing-jobs")                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ 3. Message Buffered
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Pub/Sub Subscription                      │
│            ("video-processing-workers")                     │
│              [Worker will pull from here]                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase A: Infrastructure (Terraform)

| Step | Resource                      | Purpose                              |
| ---- | ----------------------------- | ------------------------------------ |
| A.1  | `google_project_service`      | Enable Pub/Sub and Eventarc APIs     |
| A.2  | `google_pubsub_topic`         | The "Conveyor Belt" queue            |
| A.3  | `google_pubsub_subscription`  | Workers pull messages from here      |
| A.4  | `google_eventarc_trigger`     | GCS → Pub/Sub bridge                 |
| A.5  | `google_storage_notification` | Alternative: direct GCS notification |

**Files Modified:**

- `infra/main.tf`

---

### Phase B: Update Job Status (API)

| Step | Task                           | Details                                 |
| ---- | ------------------------------ | --------------------------------------- |
| B.1  | Add "queued" status update     | When GCS event fires, update Firestore  |
| B.2  | API endpoint to confirm upload | `POST /v1/jobs/{id}/confirm` (optional) |

**Files Modified:**

- `services/api/src/main.py`

---

### Phase C: Verification

| Step | Task                       | Details                           |
| ---- | -------------------------- | --------------------------------- |
| C.1  | Upload a file via frontend | Trigger the full flow             |
| C.2  | Check Pub/Sub subscription | Verify message was published      |
| C.3  | Check Firestore            | Verify status changed to "queued" |

---

## Acceptance Criteria

- [ ] **A.** `terraform apply` creates Pub/Sub topic and subscription.
- [ ] **B.** GCS upload triggers a Pub/Sub message within 60 seconds.
- [ ] **C.** Message contains: `job_id`, `bucket`, `object_name`.
- [ ] **D.** Firestore job record updates to `status: queued`.

---

## Non-Goals (Deferred)

- Worker processing (Feature 03)
- Dead letter queue handling
- Retry configuration

---

## Architecture Decision: Eventarc vs GCS Notification

| Option               | Pros                                | Cons                        |
| -------------------- | ----------------------------------- | --------------------------- |
| **Eventarc**         | Modern, unified, supports filtering | Requires Cloud Run for push |
| **GCS Notification** | Simple, direct to Pub/Sub           | Less flexible filtering     |

**Decision**: Use `google_storage_notification` (simpler for our pull-based
worker model).
