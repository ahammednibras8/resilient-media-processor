# Product: The Resilient Media Processor

## Vision

A media processing engine designed not for speed, but for **survivability**. It
accepts high-volume, untrusted video uploads from the wild and processes them
into standardized metadata/thumbnails without ever allowing a user to crash the
control plane.

## The Problem

Naive media systems couple ingestion to processing. If 10,000 users upload 4K
videos simultaneously, a naive server runs out of RAM and crashes. If a user
uploads a corrupted file that triggers a segfault in FFmpeg, the worker dies and
the job is lost. We are building the antithesis of this fragility.

## Core Philosophy

1. **Ingest is Cheaper than Compute**: We accept files instantly (via GCS Signed
   URLs) but process them at our own pace. We never reject an upload because we
   are "busy".
2. **The Queue is Truth**: If it's not in Pub/Sub (or finished in Firestore), it
   doesn't exist. The queue acts as a pressure valve for the system.
3. **Failure is Normal**: We assume 1% of jobs will fail. We don't try to
   prevent failure; we wrap it in retries, idempotency checks, and Dead Letter
   Queues. A crash is just a retry waiting to happen.
4. **Trust No Input**: We treat every file as a potential "zip bomb" or attack
   vector. Workers are isolated, memory-capped, and disposable.

## Key Capabilities

- **Zero-Overhead Ingestion**: API servers generate keys, not heat. They handle
  10k RPS on minimal hardware.
- **Idempotent Processing**: A worker can crash halfway through, restart, and
  finish the job without duplicating results or corrupting data.
- **Poison Pill Containment**: Malformed files that crash converters are
  identified and quarantined (DLQ) after a fixed number of retries, alerting
  humans without clogging the pipe.

## User Experience

- **User**: Uploads file -> Gets immediate "Received" ack -> Gets notification
  when done.
- **Developer/Operator**: Deploys buggy code -> Workers crash -> Queue backs up
  -> Reverts code -> Queue drains. No data lost.