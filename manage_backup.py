#!/usr/bin/env python3
"""
manage_backup.py
================
Homefind AWS S3 Backup Management CLI

Commands:
  python manage_backup.py --status
  python manage_backup.py --init-backup
  python manage_backup.py --wipe-backup
  python manage_backup.py --restore-latest
"""

import os
import sys
import gzip
import io
import getpass
import argparse
import datetime
from typing import Optional

# Ensure Homefind root is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from dotenv import load_dotenv
import pymysql

load_dotenv()

# Primary DB Config
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", "3306") or "3306")
DB_USER = os.getenv("DB_USER", "homefind_app")
DB_PASS = os.getenv("DB_PASS", "").strip().strip("'\"")
DB_NAME = os.getenv("DB_NAME", "homefinder_db")

# AWS S3 Config
AWS_ACCESS_KEY_ID     = os.getenv("AWS_ACCESS_KEY_ID", "").strip()
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "").strip()
AWS_S3_BUCKET         = os.getenv("AWS_S3_BUCKET", "").strip()
AWS_S3_REGION         = os.getenv("AWS_S3_REGION", "eu-north-1").strip()
AWS_S3_PREFIX         = os.getenv("AWS_S3_PREFIX", "homefind/").strip()
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


def get_s3_client():
    if not (AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and AWS_S3_BUCKET):
        return None
    try:
        import boto3
        return boto3.client(
            "s3",
            region_name=AWS_S3_REGION,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY
        )
    except Exception as e:
        print(f"[ERROR] AWS S3 client init failed: {e}")
        return None


def format_size(num_bytes: int) -> str:
    for unit in ["B", "KB", "MB", "GB"]:
        if num_bytes < 1024.0:
            return f"{num_bytes:3.1f} {unit}"
        num_bytes /= 1024.0
    return f"{num_bytes:.1f} TB"


def cmd_status():
    print("=" * 65)
    print(" HOMEFIND DATABASE & AWS S3 BACKUP STATUS")
    print("=" * 65)

    # 1. Primary MySQL Database
    print(f"\n[Primary DB] Host: {DB_HOST}:{DB_PORT} | DB: {DB_NAME}")
    p_conn = get_primary_connection()
    if p_conn:
        try:
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
        finally:
            p_conn.close()
    else:
        print("  Status: [FAILED] Offline / Connection Failed")

    # 2. AWS S3 Backup Storage
    print(f"\n[AWS S3 Backup] Bucket: {AWS_S3_BUCKET or '(Not configured)'}")
    print(f"  Region: {AWS_S3_REGION} | Prefix: {AWS_S3_PREFIX}")

    s3 = get_s3_client()
    if not s3:
        print("  Status: [STANDBY] S3 credentials not fully configured in .env")
        print("  Tip: Ensure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET are set.")
    else:
        try:
            # Check bucket accessibility
            s3.head_bucket(Bucket=AWS_S3_BUCKET)
            print("  Status: [OK] S3 Bucket connected and accessible")

            # Check full snapshots
            full_prefix = f"{AWS_S3_PREFIX}full/"
            resp_full = s3.list_objects_v2(Bucket=AWS_S3_BUCKET, Prefix=full_prefix)
            full_objs = sorted(
                resp_full.get("Contents", []),
                key=lambda x: x["LastModified"],
                reverse=True
            )
            print(f"\n  [Full Snapshots] Found {len(full_objs)} snapshot(s):")
            if full_objs:
                for obj in full_objs[:5]:
                    key_name = obj["Key"].replace(full_prefix, "")
                    size_str = format_size(obj["Size"])
                    dt_str = obj["LastModified"].strftime("%Y-%m-%d %H:%M:%S UTC")
                    print(f"    - {key_name} ({size_str}) - {dt_str}")
                if len(full_objs) > 5:
                    print(f"    ... and {len(full_objs) - 5} older snapshot(s)")
            else:
                print("    (No full snapshots yet. Run `python manage_backup.py --init-backup` to create one.)")

            # Check incremental write logs
            inc_prefix = f"{AWS_S3_PREFIX}incremental/"
            resp_inc = s3.list_objects_v2(Bucket=AWS_S3_BUCKET, Prefix=inc_prefix)
            inc_objs = sorted(
                resp_inc.get("Contents", []),
                key=lambda x: x["LastModified"],
                reverse=True
            )
            print(f"\n  [Incremental Logs] Found {len(inc_objs)} log file(s):")
            if inc_objs:
                for obj in inc_objs[:5]:
                    key_name = obj["Key"].replace(inc_prefix, "")
                    size_str = format_size(obj["Size"])
                    dt_str = obj["LastModified"].strftime("%Y-%m-%d %H:%M:%S UTC")
                    print(f"    - {key_name} ({size_str}) - {dt_str}")
            else:
                print("    (No incremental logs recorded yet. Changes from running app will appear here.)")

        except Exception as e:
            print(f"  Status: [FAILED] S3 query error: {e}")

    # 3. Super Admin Key Configuration Status
    print("\n[Security Gate]")
    if BACKUP_SUPERADMIN_SECRET_KEY:
        print("  Super Admin Passkey: [CONFIGURED] Protected wipe is enabled.")
    else:
        print("  Super Admin Passkey: [NOT SET] Set BACKUP_SUPERADMIN_SECRET_KEY in .env to protect wipe operations.")

    print("\n" + "=" * 65)


def cmd_init_backup():
    print("=" * 65)
    print(" INITIALIZE BACKUP (Full Local MySQL -> AWS S3 Snapshot)")
    print("=" * 65)

    s3 = get_s3_client()
    if not s3:
        print("[ERROR] AWS S3 is not configured in .env.")
        sys.exit(1)

    p_conn = get_primary_connection()
    if not p_conn:
        print("[ERROR] Cannot connect to local database.")
        sys.exit(1)

    timestamp = datetime.datetime.utcnow().strftime("%Y-%m-%d_%H-%M-%S")
    s3_key = f"{AWS_S3_PREFIX}full/{timestamp}.sql.gz"

    print(f"\nExporting database `{DB_NAME}` from {DB_HOST}:{DB_PORT}...")
    dump_buffer = io.BytesIO()

    with gzip.GzipFile(fileobj=dump_buffer, mode="wb") as gz:
        # Header
        header = (
            f"-- Homefind Database Snapshot\n"
            f"-- Generated: {datetime.datetime.utcnow().isoformat()} UTC\n"
            f"-- Database: `{DB_NAME}`\n\n"
            f"SET FOREIGN_KEY_CHECKS = 0;\n"
            f"SET NAMES utf8mb4;\n\n"
        )
        gz.write(header.encode("utf-8"))

        total_rows = 0
        with p_conn.cursor() as cur:
            cur.execute("SHOW TABLES")
            tables = [list(r.values())[0] for r in cur.fetchall()]

            for table in tables:
                # Structure
                cur.execute(f"SHOW CREATE TABLE `{table}`")
                create_sql = cur.fetchone()["Create Table"]
                table_hdr = (
                    f"\n-- Table structure and data for table `{table}`\n"
                    f"DROP TABLE IF EXISTS `{table}`;\n"
                    f"{create_sql};\n"
                )
                gz.write(table_hdr.encode("utf-8"))

                # Data
                cur.execute(f"SELECT * FROM `{table}`")
                rows = cur.fetchall()
                if rows:
                    cols = list(rows[0].keys())
                    col_names = ", ".join(f"`{c}`" for c in cols)
                    for r in rows:
                        escaped_vals = []
                        for c in cols:
                            val = r[c]
                            if val is None:
                                escaped_vals.append("NULL")
                            elif isinstance(val, (int, float)):
                                escaped_vals.append(str(val))
                            elif isinstance(val, (datetime.date, datetime.datetime)):
                                escaped_vals.append(f"'{val.isoformat()}'")
                            elif isinstance(val, (bytes, bytearray)):
                                escaped_vals.append(f"X'{val.hex()}'")
                            else:
                                escaped_s = pymysql.converters.escape_string(str(val))
                                escaped_vals.append(f"'{escaped_s}'")
                        row_sql = f"INSERT INTO `{table}` ({col_names}) VALUES ({', '.join(escaped_vals)});\n"
                        gz.write(row_sql.encode("utf-8"))

                total_rows += len(rows)
                print(f"  [OK] Exported table `{table}`: {len(rows)} row(s)")

        footer = "\nSET FOREIGN_KEY_CHECKS = 1;\n"
        gz.write(footer.encode("utf-8"))

    p_conn.close()

    compressed_data = dump_buffer.getvalue()
    raw_size_str = format_size(len(compressed_data))
    print(f"\nCompressing complete. Snapshot archive size: {raw_size_str}")
    print(f"Uploading snapshot to s3://{AWS_S3_BUCKET}/{s3_key}...")

    try:
        s3.put_object(
            Bucket=AWS_S3_BUCKET,
            Key=s3_key,
            Body=compressed_data,
            ContentType="application/gzip",
            Metadata={
                "created_at": timestamp,
                "database": DB_NAME,
                "tables_count": str(len(tables)),
                "rows_count": str(total_rows)
            }
        )
        print(f"\n[SUCCESS] Snapshot successfully created and stored in S3!")
        print(f"  Location: s3://{AWS_S3_BUCKET}/{s3_key}")
        print(f"  Size:     {raw_size_str}")
        print(f"  Tables:   {len(tables)} | Total Records: {total_rows}")
    except Exception as e:
        print(f"\n[ERROR] Upload to S3 failed: {e}")
        sys.exit(1)


def cmd_wipe_backup():
    print("\n" + "!" * 70)
    print(" [CRITICAL WARNING] PERMANENT DELETION OF S3 BACKUP REPOSITORY")
    print("!" * 70)
    print(f" Target Bucket: {AWS_S3_BUCKET}")
    print(f" Target Prefix: {AWS_S3_PREFIX}")
    print("\n This operation will permanently delete ALL snapshots and write logs")
    print(f" stored under '{AWS_S3_PREFIX}' in your S3 bucket.")
    print(" This action cannot be undone.")
    print("!" * 70 + "\n")

    if not BACKUP_SUPERADMIN_SECRET_KEY:
        print("[ERROR] BACKUP_SUPERADMIN_SECRET_KEY is not defined in your .env file.")
        print("Set a secure secret key in .env before performing administrative wipes.")
        sys.exit(1)

    entered_key = getpass.getpass("Step 1/2: Enter the Super Admin Secret Key: ").strip()
    if entered_key != BACKUP_SUPERADMIN_SECRET_KEY:
        print("\n[AUTHENTICATION FAILED] Incorrect Super Admin Secret Key.")
        print("Action aborted. The backup repository was NOT touched.")
        sys.exit(1)

    print("[VERIFIED] Secret Key verified successfully.\n")

    print(f"Step 2/2: To prevent accidental deletion, type the exact phrase below:")
    print(f"          '{CONFIRMATION_PHRASE}'")
    entered_phrase = input("Confirmation: ").strip()

    if entered_phrase != CONFIRMATION_PHRASE:
        print("\n[CONFIRMATION FAILED] Typed phrase did not match.")
        print("Action aborted. The backup repository was NOT touched.")
        sys.exit(1)

    s3 = get_s3_client()
    if not s3:
        print("[ERROR] Could not connect to AWS S3.")
        sys.exit(1)

    print(f"\nScanning objects under 's3://{AWS_S3_BUCKET}/{AWS_S3_PREFIX}'...")
    paginator = s3.get_paginator("list_objects_v2")
    objects_to_delete = []

    for page in paginator.paginate(Bucket=AWS_S3_BUCKET, Prefix=AWS_S3_PREFIX):
        for item in page.get("Contents", []):
            objects_to_delete.append({"Key": item["Key"]})

    if not objects_to_delete:
        print("[NOTICE] No backup objects found under that prefix. Nothing to delete.")
        return

    print(f"Found {len(objects_to_delete)} object(s). Deleting...")
    # Delete in batches of up to 1000 (S3 limit)
    for i in range(0, len(objects_to_delete), 1000):
        batch = objects_to_delete[i:i + 1000]
        s3.delete_objects(Bucket=AWS_S3_BUCKET, Delete={"Objects": batch})

    print(f"[SUCCESS] Permanently wiped {len(objects_to_delete)} backup file(s) from S3.")


def cmd_restore_latest():
    print("=" * 65)
    print(" RESTORE LATEST BACKUP FROM AWS S3")
    print("=" * 65)

    s3 = get_s3_client()
    if not s3:
        print("[ERROR] AWS S3 is not configured in .env.")
        sys.exit(1)

    full_prefix = f"{AWS_S3_PREFIX}full/"
    resp = s3.list_objects_v2(Bucket=AWS_S3_BUCKET, Prefix=full_prefix)
    contents = resp.get("Contents", [])
    if not contents:
        print("[ERROR] No full snapshots found in S3 to restore.")
        sys.exit(1)

    latest = max(contents, key=lambda x: x["LastModified"])
    latest_key = latest["Key"]
    print(f"Found latest snapshot: {latest_key} ({format_size(latest['Size'])})")
    print(f"Target Database: {DB_NAME} on {DB_HOST}:{DB_PORT}")

    confirm = input("\nAre you sure you want to restore and overwrite local data? (yes/no): ").strip().lower()
    if confirm != "yes":
        print("Restore cancelled.")
        return

    print(f"Downloading s3://{AWS_S3_BUCKET}/{latest_key}...")
    obj = s3.get_object(Bucket=AWS_S3_BUCKET, Key=latest_key)
    raw_sql = gzip.decompress(obj["Body"].read()).decode("utf-8")

    print("Applying snapshot to local MySQL...")
    p_conn = pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        client_flag=pymysql.constants.CLIENT.MULTI_STATEMENTS
    )

    try:
        with p_conn.cursor() as cur:
            cur.execute(raw_sql)
        p_conn.commit()
        print("[SUCCESS] Local database successfully restored from S3 snapshot.")
    finally:
        p_conn.close()


def main():
    parser = argparse.ArgumentParser(description="Homefind AWS S3 Backup Manager")
    parser.add_argument("--status", action="store_true", help="Check primary database and AWS S3 backup status")
    parser.add_argument("--init-backup", action="store_true", help="Create a full snapshot and upload to S3")
    parser.add_argument("--wipe-backup", action="store_true", help="Wipe backup repository on S3 (requires Super Admin passkey)")
    parser.add_argument("--restore-latest", action="store_true", help="Restore local database from the latest S3 snapshot")

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
    elif args.restore_latest:
        cmd_restore_latest()


if __name__ == "__main__":
    main()
