FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libblas-dev liblapack-dev gfortran && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY pyproject.toml /app/
RUN pip install --no-cache-dir -U pip && pip install --no-cache-dir -e .
COPY . /app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
