FROM python:3.11-slim

# System deps for PaddleOCR + pdf2image
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libsm6 libxext6 libxrender1 \
    libgomp1 \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download PaddleOCR models at build time so cold starts are fast
RUN python -c "from paddleocr import PPStructure; PPStructure(show_log=False, recovery=True, lang='en')"

COPY app.py .

ENV PORT=8000
EXPOSE ${PORT}

# Railway injects $PORT — use shell form so env var is expanded at runtime
# 2 workers: one handles OCR, the other stays free for health checks
CMD uvicorn app:app --host 0.0.0.0 --port ${PORT} --workers 2 --timeout-keep-alive 300
