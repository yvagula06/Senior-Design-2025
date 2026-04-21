FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libblas-dev liblapack-dev gfortran && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY pyproject.toml /app/
COPY app /app/app
# Install CPU-only torch first to avoid downloading the 2 GB CUDA build
# that sentence-transformers would otherwise pull in automatically
RUN pip install --no-cache-dir -U pip \
 && pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir -e .
COPY . /app
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
