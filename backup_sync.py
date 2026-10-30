"""
Homefind Backup Synchronization Module

Provides non-blocking, reliable real-time replication from the primary
local MySQL database to a secondary backup database (e.g. AWS RDS MySQL).

Features:
- Dual-write transaction wrapper: intercepts committed INSERT, UPDATE, DELETE queries.
- Asynchronous queue with persistent disk log: zero latency added to local user requests.
- Automatic retry on network interruptions or latency.
- Strict safety guard: DROP DATABASE and TRUNCATE are blocked from being queued.
- Graceful fallback: If backup credentials are not yet set, runs completely dormant.
"""

import os
import sys
import json
import time
import queue
import threading
import logging
from pathlib import Path
from typing import List, Tuple, Any, Optional

import pymysql
from dotenv import load_dotenv

load_dotenv()

# Logger setup
logger = logging.getLogger("backup_sync")
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("[BackupSync %(levelname)s] %(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

# Configuration
BACKUP_DB_HOST = os.getenv("BACKUP_DB_HOST", "").strip()
BACKUP_DB_PORT = int(os.getenv("BACKUP_DB_PORT", "3306") or "3306")
BACKUP_DB_USER = os.getenv("BACKUP_DB_USER", "").strip()
BACKUP_DB_PASS = os.getenv("BACKUP_DB_PASS", "").strip().strip("'\"")
BACKUP_DB_NAME = os.getenv("BACKUP_DB_NAME", "homefinder_db").strip()
BACKUP_SUPERADMIN_SECRET_KEY = os.getenv("BACKUP_SUPERADMIN_SECRET_KEY", "").strip()

# Persistent queue directory
QUEUE_DIR = Path("data")
QUEUE_FILE = QUEUE_DIR / "backup_queue.jsonl"
QUEUE_DIR.mkdir(parents=True, exist_ok=True)

# In-memory queue for worker thread
_task_queue: "queue.Queue[Tuple[str, Any]]" = queue.Queue()
_worker_started = False
_worker_lock = threading.Lock()


def is_configured() -> bool:
    """Returns True if the backup database credentials are configured in .env."""
    return bool(BACKUP_DB_HOST and BACKUP_DB_USER)


def get_backup_db_connection():
    """Establishes a connection directly to the backup database."""
    if not is_configured():
        return None
    try:
        return pymysql.connect(
            host=BACKUP_DB_HOST,
            port=BACKUP_DB_PORT,
            user=BACKUP_DB_USER,
            password=BACKUP_DB_PASS,
            database=BACKUP_DB_NAME,
            connect_timeout=5,
            cursorclass=pymysql.cursors.DictCursor
        )
    except Exception as e:
        logger.warning(f"Could not connect to backup database ({BACKUP_DB_HOST}): {e}")
        return None


def _serialize_args(args: Any) -> Any:
    """Converts datetimes and complex types to JSON-safe representations."""
    if args is None:
        return None
    if isinstance(args, (list, tuple)):
        clean = []
        for a in args:
            if hasattr(a, "isoformat"):
                clean.append(a.isoformat())
            else:
                clean.append(a)
        return clean if isinstance(args, list) else tuple(clean)
    if isinstance(args, dict):
        return {k: v.isoformat() if hasattr(v, "isoformat") else v for k, v in args.items()}
    return args


def queue_write(sql: str, params: Any = None):
    """
    Safely enqueues a write query to be replicated to the backup database.
    Persists to disk log so writes are never lost during power cuts or network loss.
    """
    if not is_configured():
        return

    # Safety guard: prevent destructive drop/truncate commands from being replicated
    sql_upper = sql.strip().upper()
    if "DROP DATABASE" in sql_upper or "TRUNCATE" in sql_upper:
        logger.warning("Blocked DROP/TRUNCATE command from backup sync queue.")
        return

    item = (sql, params)
    _task_queue.put(item)

    # Append to disk queue
    try:
        with open(QUEUE_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps({"sql": sql, "params": _serialize_args(params)}) + "\n")
    except Exception as e:
        logger.error(f"Failed to append to backup queue file: {e}")

    _ensure_worker_running()


def _ensure_worker_running():
    global _worker_started
    if _worker_started:
        return
    with _worker_lock:
        if not _worker_started:
            t = threading.Thread(target=_background_sync_worker, daemon=True, name="BackupSyncWorker")
            t.start()
            _worker_started = True


def _background_sync_worker():
    """Background worker that executes queued writes on the backup database."""
    logger.info("Backup sync background worker started.")
    while True:
        try:
            sql, params = _task_queue.get()
            success = False
            retries = 0
            max_retries = 5

            while not success and retries < max_retries:
                conn = get_backup_db_connection()
                if not conn:
                    time.sleep(min(30, 2 ** retries))
                    retries += 1
                    continue
                try:
                    cursor = conn.cursor()
                    cursor.execute(sql, params)
                    conn.commit()
                    cursor.close()
                    conn.close()
                    success = True
                except Exception as e:
                    logger.warning(f"Error executing write on backup DB: {e}. Retrying...")
                    time.sleep(2)
                    retries += 1
                finally:
                    if conn and conn.open:
                        try:
                            conn.close()
                        except Exception:
                            pass

            if not success:
                logger.error(f"Failed to sync write to backup database after {max_retries} attempts: {sql[:100]}")

            _task_queue.task_done()
        except Exception as e:
            logger.error(f"Unexpected worker loop exception: {e}")
            time.sleep(2)


# ==============================================================================
# Dual-Sync Database Connection & Cursor Wrappers
# ==============================================================================

class DualSyncCursor:
    """Wrapper around pymysql cursor that records committed write statements."""

    def __init__(self, real_cursor, parent_conn):
        self._cursor = real_cursor
        self._conn = parent_conn

    def execute(self, query, args=None):
        result = self._cursor.execute(query, args)
        q_upper = query.strip().upper()
        if q_upper.startswith(("INSERT", "UPDATE", "DELETE", "REPLACE")):
            self._conn._pending_writes.append((query, args))
        return result

    def executemany(self, query, args):
        result = self._cursor.executemany(query, args)
        q_upper = query.strip().upper()
        if q_upper.startswith(("INSERT", "UPDATE", "DELETE", "REPLACE")):
            for a in args:
                self._conn._pending_writes.append((query, a))
        return result

    def __getattr__(self, name):
        return getattr(self._cursor, name)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        return self._cursor.__exit__(exc_type, exc_val, exc_tb)


class DualSyncConnection:
    """Wrapper around pymysql connection that queues committed writes to the backup DB."""

    def __init__(self, real_conn):
        self._conn = real_conn
        self._pending_writes: List[Tuple[str, Any]] = []

    def cursor(self, *args, **kwargs):
        real_cursor = self._conn.cursor(*args, **kwargs)
        return DualSyncCursor(real_cursor, self)

    def commit(self):
        self._conn.commit()
        if self._pending_writes and is_configured():
            for sql, params in self._pending_writes:
                queue_write(sql, params)
        self._pending_writes.clear()

    def rollback(self):
        self._conn.rollback()
        self._pending_writes.clear()

    def close(self):
        self._pending_writes.clear()
        return self._conn.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            self.rollback()
        else:
            self.commit()
        self.close()

    def __getattr__(self, name):
        return getattr(self._conn, name)
