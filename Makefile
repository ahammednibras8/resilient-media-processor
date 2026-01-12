.PHONY: dev-api dev-worker build-api build-worker check format

# ==============================================================================
# Local Development (Relies on .venv)
# ==============================================================================

dev-api:
	# Runs the API locally using the code in .venv
	uvicorn services.api.src.main:app --reload --port 8080

dev-worker:
	# Runs the worker logic locally
	python -m services.worker.src.main

# ==============================================================================
# Docker Builds (GCP Ready)
# ==============================================================================

build-api:
	# Builds the API container using the root context
	docker build -t resilient-api -f services/api/Dockerfile .

build-worker:
	# Builds the Worker container using the root context
	# Note: Requires services/worker/Dockerfile to exist (Coming soon)
	docker build -t resilient-worker -f services/worker/Dockerfile .

# ==============================================================================
# Quality Control
# ==============================================================================

check:
	mypy services shared
	ruff check services shared

format:
	ruff format services shared
