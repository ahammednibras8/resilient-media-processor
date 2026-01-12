FROM python:3.11-slim

WORKDIR /app

# 1. Install Dependencies
# We leverage the build context being the root of the repo
# This avoids complicated git submodules or private pypi
COPY shared /app/shared
COPY services/api/pyproject.toml /app/services/api/
COPY services/api/src /app/services/api/src

# Install shared lib + api service
# Using --no-cache-dir to keep image small
RUN pip install --no-cache-dir ./shared
RUN pip install --no-cache-dir ./services/api

# 2. Run
# We use the installed package module
CMD ["uvicorn", "services.api.src.main:app", "--host", "0.0.0.0", "--port", "8080"]
