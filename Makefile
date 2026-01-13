# Load environment variables from .env.local
-include .env.local
export

.PHONY: dev-api dev-worker build-api build-worker check format tf-init tf-plan tf-apply tf-destroy tf-output setup install-backend install-frontend

# ==============================================================================
# Setup (Run once after cloning)
# ==============================================================================

setup: install-backend install-frontend tf-init
	@echo "✅ Setup complete!"

install-backend:
	python -m venv .venv
	. .venv/bin/activate && pip install -e shared/
	. .venv/bin/activate && pip install -r services/api/requirements.txt 2>/dev/null || echo "No requirements.txt yet"

install-frontend:
	cd services/frontend && npm install

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

# ==============================================================================
# Frontend
# ==============================================================================

dev-frontend:
	cd services/frontend && npm run dev

build-frontend:
	docker build -t resilient-frontend services/frontend

run-frontend:
	docker run -p 3000:80 resilient-frontend

# ==============================================================================
# Infrastructure (Terraform)
# ==============================================================================

tf-init:
	cd infra && terraform init

tf-plan:
	cd infra && terraform plan -var="project_id=$(PROJECT_ID)"

tf-apply:
	cd infra && terraform apply -auto-approve -var="project_id=$(PROJECT_ID)"

tf-destroy:
	cd infra && terraform destroy -auto-approve -var="project_id=$(PROJECT_ID)"

tf-output:
	cd infra && terraform output
