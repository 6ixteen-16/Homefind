"""
backup_sync.py
==============
Real-time AWS S3 backup sync for Homefind MySQL database.

Every INSERT / UPDATE / DELETE that the app commits is queued in a
background thread and flushed to AWS S3 as a compressed JSONL log
(incremental write log).

The system is fully dormant when AWS credentials are not configured.

S3 layout
---------
  {prefix}full/YYYY-MM-DD_HH-MM-SS.sql.gz   <- Full database snapshots
  {prefix}incremental/YYYY-MM-DD.jsonl.gz    <- Daily incremental write logs

Deletion protection
-------------------
  DROP DATABASE and TRUNCATE are blocked from being queued.
"""

import os
import sys
import json
import gzip
import queue
import atexit
import threading
import datetime
from typing import Optional

# ── Config ────────────────────────────────────────────────────────────────────

def _load_env(key: str, default: str = "") -> str:
    val = os.environ.get(key, "")
    if val:
        return val.strip("'\"")
    # Fallback: read .env directly
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith(key + "="):
                    return line.split("=", 1)[1].strip().strip("'\"")
    except FileNotFoundError:
        pass
    return default


AWS_ACCESS_KEY_ID     = _load_env("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = _load_env("AWS_SECRET_ACCESS_KEY")
AWS_S3_BUCKET         = _load_env("AWS_S3_BUCKET")
AWS_S3_REGION         = _load_env("AWS_S3_REGION", "eu-north-1")
AWS_S3_PREFIX         = _load_env("AWS_S3_PREFIX", "homefind/")

BACKUP_ENABLED = bool(AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and AWS_S3_BUCKET)

# ── S3 client (lazy) ──────────────────────────────────────────────────────────

_s3_client = None
_s3_lock   = threading.Lock()

def _get_s3():
    global _s3_client
    if _s3_client is not None:
        return _s3_client
    with _s3_lock:
        if _s3_client is None:
            try:
                import boto3
                _s3_client = boto3.client(
                    "s3",
                    region_name=AWS_S3_REGION,
                    aws_access_key_id=AWS_ACCESS_KEY_ID,
                    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                )
            except ImportError:
                print("[backup_sync] boto3 not installed - backup sync disabled")
    return _s3_client


# ── Write queue ───────────────────────────────────────────────────────────────

_write_queue: queue.Queue = queue.Queue()
_FLUSH_EVERY_N  = 50          # flush after this many queued writes
_FLUSH_EVERY_S  = 180         # or every 3 minutes, whichever comes first

BLOCKED_KEYWORDS = ("DROP DATABASE", "DROP SCHEMA", "TRUNCATE")


def _is_blocked(sql: str) -> bool:
    upper = sql.upper().strip()
    return any(kw in upper for kw in BLOCKED_KEYWORDS)


def _s3_key_for_today() -> str:
    day = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
    return f"{AWS_S3_PREFIX}incremental/{day}.jsonl.gz"


def _flush_to_s3(records: list) -> bool:
    """Compress records as JSONL and append-upload to today's S3 key."""
    if not records:
        return True
    s3 = _get_s3()
    if s3 is None:
        return False

    key = _s3_key_for_today()

    existing = b""
    try:
        resp = s3.get_object(Bucket=AWS_S3_BUCKET, Key=key)
        existing = gzip.decompress(resp["Body"].read())
    except Exception:
        pass  # Object does not exist yet; start fresh

    new_lines = "\n".join(json.dumps(r, ensure_ascii=True) for r in records) + "\n"
    combined  = existing + new_lines.encode("utf-8")
    compressed = gzip.compress(combined)

    try:
        s3.put_object(
            Bucket=AWS_S3_BUCKET,
            Key=key,
            Body=compressed,
            ContentType="application/gzip",
        )
        return True
    except Exception as exc:
        print(f"[backup_sync] S3 flush failed: {exc}")
        return False


_worker_running = True
_pending_buffer = []
_buffer_lock = threading.Lock()

def _worker():
    """Background thread: drain queue and periodically flush to S3."""
    import time
    global _pending_buffer
    last_flush = time.monotonic()

    while _worker_running:
        try:
            item = _write_queue.get(timeout=5)
            if item is None:
                break
            with _buffer_lock:
                _pending_buffer.append(item)
            _write_queue.task_done()
        except queue.Empty:
            pass

        now = time.monotonic()
        with _buffer_lock:
            should_flush = _pending_buffer and (
                len(_pending_buffer) >= _FLUSH_EVERY_N or now - last_flush >= _FLUSH_EVERY_S
            )
            if should_flush:
                batch = list(_pending_buffer)
                if _flush_to_s3(batch):
                    _pending_buffer = _pending_buffer[len(batch):]
                    last_flush = now


def flush_now():
    """Immediately drain write queue and flush pending records to S3."""
    global _pending_buffer
    # Drain any items left in queue
    while True:
        try:
            item = _write_queue.get_nowait()
            if item is not None:
                _pending_buffer.append(item)
            _write_queue.task_done()
        except queue.Empty:
            break

    with _buffer_lock:
        if _pending_buffer:
            batch = list(_pending_buffer)
            if _flush_to_s3(batch):
                _pending_buffer = _pending_buffer[len(batch):]


def _on_shutdown():
    global _worker_running
    _worker_running = False
    flush_now()


_worker_thread: Optional[threading.Thread] = None

def _start_worker():
    global _worker_thread
    if _worker_thread is None or not _worker_thread.is_alive():
        _worker_thread = threading.Thread(target=_worker, daemon=True, name="backup-s3-worker")
        _worker_thread.start()
        atexit.register(_on_shutdown)


if BACKUP_ENABLED:
    _start_worker()
else:
    print("[backup_sync] AWS S3 credentials not configured - backup is dormant")


# ── DualSyncCursor ────────────────────────────────────────────────────────────

class DualSyncCursor:
    """Wraps a pymysql cursor, collecting write queries for S3 backup."""

    def __init__(self, cursor, connection_ref):
        self._cursor      = cursor
        self._conn_ref    = connection_ref
        self._pending_sql = []

    def execute(self, sql, args=None):
        result = self._cursor.execute(sql, args)
        if BACKUP_ENABLED and self._is_write(sql) and not _is_blocked(sql):
            try:
                rendered = self._cursor.mogrify(sql, args) if args else sql
                if isinstance(rendered, bytes):
                    rendered = rendered.decode("utf-8", errors="replace")
                self._pending_sql.append(rendered)
            except Exception:
                self._pending_sql.append(str(sql))
        return result

    def executemany(self, sql, args_list):
        result = self._cursor.executemany(sql, args_list)
        if BACKUP_ENABLED and self._is_write(sql) and not _is_blocked(sql):
            for args in (args_list or []):
                try:
                    rendered = self._cursor.mogrify(sql, args)
                    if isinstance(rendered, bytes):
                        rendered = rendered.decode("utf-8", errors="replace")
                    self._pending_sql.append(rendered)
                except Exception:
                    self._pending_sql.append(str(sql))
        return result

    @staticmethod
    def _is_write(sql: str) -> bool:
        upper = sql.strip().upper()
        return upper.startswith(("INSERT", "UPDATE", "DELETE", "REPLACE"))

    def flush_to_queue(self):
        for sql in self._pending_sql:
            _write_queue.put({
                "ts":  datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "sql": sql,
            })
        self._pending_sql = []

    def __getattr__(self, name):
        return getattr(self._cursor, name)

    def __iter__(self):
        return iter(self._cursor)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self._cursor.__exit__(*args)


# ── DualSyncConnection ────────────────────────────────────────────────────────

class DualSyncConnection:
    """
    Wraps a pymysql connection.
    On commit(), all collected write SQL is queued for S3 backup.
    DROP DATABASE / TRUNCATE are blocked from the queue.
    """

    def __init__(self, conn):
        self._conn    = conn
        self._cursors = []

    def cursor(self, *args, **kwargs):
        raw = self._conn.cursor(*args, **kwargs)
        c   = DualSyncCursor(raw, self)
        self._cursors.append(c)
        return c

    def commit(self):
        self._conn.commit()
        if BACKUP_ENABLED:
            for c in self._cursors:
                c.flush_to_queue()
        self._cursors = []

    def rollback(self):
        self._conn.rollback()
        self._cursors = []

    def close(self):
        self._conn.close()

    def __getattr__(self, name):
        return getattr(self._conn, name)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self._conn.__exit__(*args)
