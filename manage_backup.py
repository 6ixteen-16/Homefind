#!/usr/bin/env python3
"""
Homefind Backup Database Management Tool

Allows checking replication status, cloning local schema & data to the backup,
and performing protected deletions of the backup database with a super-admin passkey.

Usage:
  python manage_backup.py --status
  python manage_backup.py --init-backup
  python manage_backup.py --wipe-backup
"""

import os
import sys
import getpass
import argparse
import pymysql
from dotenv import load_dotenv

# Ensure Homefind root is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

load_dotenv()

# Primary DB Config
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", "3306") or "3306")
DB_USER = os.getenv("DB_USER", "homefind_app")
DB_PASS = os.getenv("DB_PASS", "").strip().strip("'\"")
DB_NAME = os.getenv("DB_NAME", "homefinder_db")

# Backup DB Config
BACKUP_DB_HOST = os.getenv("BACKUP_DB_HOST", "").strip()
BACKUP_DB_PORT = int(os.getenv("BACKUP_DB_PORT", "3306") or "3306")
BACKUP_DB_USER = os.getenv("BACKUP_DB_USER", "").strip()
BACKUP_DB_PASS = os.getenv("BACKUP_DB_PASS", "").strip().strip("'\"")
BACKUP_DB_NAME = os.getenv("BACKUP_DB_NAME", "homefinder_db").strip()
BACKUP_SUPERADMIN_SECRET_KEY = os.getenv("BACKUP_SUPERADMIN_SECRET_KEY", "").strip()

CONFIRMATION_PHRASE = "I-UNDERSTAND-AND-CONFIRM-WIPE-BACKUP-DATABASE"


def get_primary_connection():
    try:
        return pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME,
            cursorclass=pymysql.cursors.DictCursor
        )
    except Exception as e:
        print(f"[ERROR] Primary DB connection failed ({DB_HOST}:{DB_PORT}): {e}")
        return None


def get_backup_connection(connect_to_db=True):
    if not BACKUP_DB_HOST or not BACKUP_DB_USER:
        print("[NOTICE] Backup DB is not configured in .env (BACKUP_DB_HOST / BACKUP_DB_USER missing).")
        return None
    try:
        return pymysql.connect(
            host=BACKUP_DB_HOST,
            port=BACKUP_DB_PORT,
            user=BACKUP_DB_USER,
            password=BACKUP_DB_PASS,
            database=BACKUP_DB_NAME if connect_to_db else None,
            connect_timeout=10,
            cursorclass=pymysql.cursors.DictCursor
        )
    except Exception as e:
        print(f"[ERROR] Backup DB connection failed ({BACKUP_DB_HOST}:{BACKUP_DB_PORT}): {e}")
        return None


def cmd_status():
    print("=" * 60)
    print(" HOMEFIND DATABASE & BACKUP STATUS")
    print("=" * 60)

    # 1. Primary DB
    print(f"\n[Primary DB] Host: {DB_HOST}:{DB_PORT} | DB: {DB_NAME}")
    p_conn = get_primary_connection()
    if p_conn:
        with p_conn.cursor() as cur:
            cur.execute("SHOW TABLES")
            tables = [list(r.values())[0] for r in cur.fetchall()]
            cur.execute("SELECT COUNT(*) AS cnt FROM users")
            u_cnt = cur.fetchone()["cnt"]
            cur.execute("SELECT COUNT(*) AS cnt FROM property")
            p_cnt = cur.fetchone()["cnt"]
            print(f"  Status: [OK] Connected")
            print(f"  Tables: {len(tables)} tables ({', '.join(tables[:6])}...)")
            print(f"  Users: {u_cnt} | Properties: {p_cnt}")
        p_conn.close()
    else:
        print("  Status: [FAILED] Offline / Connection Failed")

    # 2. Backup DB
    print(f"\n[Backup DB] Host: {BACKUP_DB_HOST or '(Not configured)'}:{BACKUP_DB_PORT} | DB: {BACKUP_DB_NAME}")
    if not BACKUP_DB_HOST:
        print("  Status: [STANDBY] Not yet configured in .env")
        print("  Tip: When your AWS credentials arrive, add BACKUP_DB_HOST, BACKUP_DB_USER, etc., to .env")
    else:
        b_conn = get_backup_connection()
        if b_conn:
            with b_conn.cursor() as cur:
                cur.execute("SHOW TABLES")
                b_tables = [list(r.values())[0] for r in cur.fetchall()]
                print(f"  Status: [OK] Connected to AWS / Backup DB")
                print(f"  Tables: {len(b_tables)} tables")
            b_conn.close()
        else:
            print("  Status: [FAILED] Connection Failed")

    # 3. Queue status
    from backup_sync import QUEUE_FILE
    if QUEUE_FILE.exists():
        lines = QUEUE_FILE.read_text(encoding="utf-8").strip().splitlines()
        print(f"\n[Sync Queue] Total recorded writes in persistent log: {len(lines)}")
    else:
        print("\n[Sync Queue] Persistent write log is empty.")

    print("\n" + "=" * 60)


def cmd_init_backup():
    print("=" * 60)
    print(" INITIALIZE BACKUP DATABASE (Full Local -> Backup Clone)")
    print("=" * 60)

    if not BACKUP_DB_HOST or not BACKUP_DB_USER:
        print("[ERROR] Cannot initialize: BACKUP_DB_HOST and BACKUP_DB_USER are not set in .env.")
        sys.exit(1)

    p_conn = get_primary_connection()
    if not p_conn:
        sys.exit(1)

    root_b_conn = get_backup_connection(connect_to_db=False)
    if not root_b_conn:
        sys.exit(1)

    with root_b_conn.cursor() as cur:
        cur.execute(f"CREATE DATABASE IF NOT EXISTS `{BACKUP_DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        root_b_conn.commit()
    root_b_conn.close()

    b_conn = get_backup_connection(connect_to_db=True)
    if not b_conn:
        sys.exit(1)

    print(f"Cloning schema and data from primary ({DB_HOST}) to backup ({BACKUP_DB_HOST})...\n")

    with p_conn.cursor() as p_cur, b_conn.cursor() as b_cur:
        p_cur.execute("SHOW TABLES")
        tables = [list(r.values())[0] for r in p_cur.fetchall()]

        b_cur.execute("SET FOREIGN_KEY_CHECKS = 0")

        for table in tables:
            p_cur.execute(f"SHOW CREATE TABLE `{table}`")
            create_sql = p_cur.fetchone()["Create Table"]

            b_cur.execute(f"DROP TABLE IF EXISTS `{table}`")
            b_cur.execute(create_sql)

            p_cur.execute(f"SELECT * FROM `{table}`")
            rows = p_cur.fetchall()
            if rows:
                cols = list(rows[0].keys())
                col_names = ", ".join(f"`{c}`" for c in cols)
                placeholders = ", ".join(["%s"] * len(cols))
                insert_sql = f"INSERT INTO `{table}` ({col_names}) VALUES ({placeholders})"
                val_tuples = [tuple(r[c] for c in cols) for r in rows]
                b_cur.executemany(insert_sql, val_tuples)

            print(f"  [OK] Cloned table `{table}`: {len(rows)} row(s)")

        b_cur.execute("SET FOREIGN_KEY_CHECKS = 1")
        b_conn.commit()

    p_conn.close()
    b_conn.close()
    print("\nBackup database successfully initialized and synchronized.")


def cmd_wipe_backup():
    print("\n" + "!" * 70)
    print(" [CRITICAL WARNING] PERMANENT DELETION OF BACKUP DATABASE")
    print("!" * 70)
    print(f" Target Backup Host: {BACKUP_DB_HOST}")
    print(f" Target Database:    {BACKUP_DB_NAME}")
    print("\n This operation will completely DROP and DESTROY the backup database.")
    print(" This action cannot be undone.")
    print("!" * 70 + "\n")

    if not BACKUP_SUPERADMIN_SECRET_KEY:
        print("[ERROR] BACKUP_SUPERADMIN_SECRET_KEY is not defined in your .env file.")
        print("Set a secure secret key in .env before performing administrative wipes.")
        sys.exit(1)

    entered_key = getpass.getpass("Step 1/2: Enter the Super Admin Secret Key: ").strip()
    if entered_key != BACKUP_SUPERADMIN_SECRET_KEY:
        print("\n[AUTHENTICATION FAILED] Incorrect Super Admin Secret Key.")
        print("Action aborted. The backup database was NOT touched.")
        sys.exit(1)

    print("[VERIFIED] Secret Key verified successfully.\n")

    print(f"Step 2/2: To prevent accidental deletion, type the exact phrase below:")
    print(f"          '{CONFIRMATION_PHRASE}'")
    entered_phrase = input("Confirmation: ").strip()

    if entered_phrase != CONFIRMATION_PHRASE:
        print("\n[CONFIRMATION FAILED] Typed phrase did not match.")
        print("Action aborted. The backup database was NOT touched.")
        sys.exit(1)

    print(f"\nDropping database `{BACKUP_DB_NAME}` on `{BACKUP_DB_HOST}`...")
    b_conn = get_backup_connection(connect_to_db=False)
    if not b_conn:
        print("[ERROR] Could not connect to backup host.")
        sys.exit(1)

    try:
        with b_conn.cursor() as cur:
            cur.execute(f"DROP DATABASE IF EXISTS `{BACKUP_DB_NAME}`")
            b_conn.commit()
        print(f"[SUCCESS] Database `{BACKUP_DB_NAME}` has been permanently dropped from backup.")
    except Exception as e:
        print(f"[ERROR] Failed to drop database: {e}")
    finally:
        b_conn.close()


def main():
    parser = argparse.ArgumentParser(description="Homefind Backup Database Manager")
    parser.add_argument("--status", action="store_true", help="Check primary and backup database status")
    parser.add_argument("--init-backup", action="store_true", help="Clone primary database schema and data to backup")
    parser.add_argument("--wipe-backup", action="store_true", help="Drop backup database (requires Super Admin key)")

    if len(sys.argv) == 1:
        parser.print_help()
        sys.exit(0)

    args = parser.parse_args()

    if args.status:
        cmd_status()
    elif args.init_backup:
        cmd_init_backup()
    elif args.wipe_backup:
        cmd_wipe_backup()


if __name__ == "__main__":
    main()
