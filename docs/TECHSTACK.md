# Tech Stack & Rationale

This document defines the technology choices for the Resilient Media Processor
and the "CTO Mental Model" behind each decision. We prioritize **boring, proven
technology** that fails safely over bleeding-edge complexity.

## 1. Core Runtime: Python 3.11+

- **Role**: API Logic, Worker Logic, Glue Code.
- **Rationale**:
  - **Ecosystem**: Unrivaled libraries for Google Cloud (`google-cloud-storage`,
    `google-cloud-pubsub`) and multimedia interaction.
  - **Speed**: While slower than Go in raw CPU, the heavy lifting is done by C
    libraries (FFmpeg). Python is merely the "remote control."
  - **Simplicity**: Low cognitive load for reading code in a crisis.

## 2. Web Framework: FastAPI

- **Role**: The Ingress API (generating Signed URLs).
- **Rationale**:
  - **Validation First**: Built on **Pydantic**. We do not trust user input.
    Pydantic enforces correct schema at the door.
  - **Async Native**: Handles thousands of idle connections (waiting for I/O)
    efficiently.

## 3. Media Engine: FFmpeg (Static Binary)

- **Role**: The actual video processing.
- **Rationale**:
  - **Determinism**: We bake a specific, pinned version of FFmpeg into the
    Docker container. We do not rely on `apt-get` giving us "whatever is
    latest."
  - **Isolation**: It runs in a subprocess. If it crashes (segfault), it doesn't
    take down the entire OS, just the worker process (which triggers a retry).

## 4. Infrastructure: Terraform (IaC)

- **Role**: Provisioning Pub/Sub, Buckets, IAM, and Cloud Run.
- **Rationale**:
  - **Visibility**: IAM relationships are complex. Terraform makes them explicit
    documentation.
  - **Disaster Recovery**: If we delete the project by accident, we can restore
    the _structure_ in minutes (data is a different story).

## 5. State Management: Google Cloud Firestore

- **Role**: storing Job ID, Status, and Progress.
- **Rationale**:
  - **Serverless**: We don't want to manage a PostgreSQL connection pool for
    simple K/V lookups.
  - **JSON-Native**: Maps 1:1 with our Pydantic models.

## 6. Async Messaging: Google Cloud Pub/Sub

- **Role**: The "Buffer" between Uploads and Workers.
- **Rationale**:
  - **Pressure Valve**: Decouples high-speed ingestion from slow processing.
  - **Native DLQ**: Has built-in support for Dead Letter Queues (retrying X
    times then moving to a "failed" topic).

## 7. Contract Sharing: Pydantic v2

- **Role**: Defining the "Shape" of messages between API and Worker.
- **Single Source of Truth**: Shared library (`services/shared`) ensures the
  Producer (API) and Consumer (Worker) never disagree on what a "Job" looks
  like.

## 8. Frontend: The Visualization Layer

- **Framework**: **Vite + React (TypeScript)**
  - **Rationale**: We need a lightweight Single Page Application (SPA) to
    visualize the async flow. Next.js is overkill; we don't need SEO or Server
    Rendering.
- **State Management**: **TanStack Query (React Query)**
  - **Rationale**: The **Best** tool for polling. Since our backend is async,
    the Frontend needs to ping `GET /jobs/{id}` every few seconds. React Query
    handles this ("auto-refetching") effortlessly while managing loading/error
    states.
- **Styling**: **TailwindCSS**
  - **Rationale**: Rapid UI development to make the dashboard look "Premium"
    without writing custom CSS files.
