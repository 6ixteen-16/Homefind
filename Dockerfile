FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Only the application and the website. seed.sql, test_users.sql and run_seed.py are intentionally NOT
# copied: they create demo accounts with publicly known passwords and must never run in production.
COPY main.py ./
COPY static ./static
RUN mkdir -p /app/private_uploads /app/static/uploads

# Keep uploaded photos and ID documents outside the container's disposable layer.
# Run with named volumes so they survive redeploys, e.g.
#   docker run -v homefind_uploads:/app/static/uploads -v homefind_private:/app/private_uploads ...
VOLUME ["/app/static/uploads", "/app/private_uploads"]

EXPOSE 8000
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
