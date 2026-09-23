import pymysql
import os

DB_HOST = "127.0.0.1"
DB_USER = "root"
DB_PASS = "@#6ixteenZ@2005"
DB_NAME = "homefinder_db"

sql_queries = [
    "INSERT IGNORE INTO users (user_id, email, password_hash, role, otp_enabled, password_last_changed) VALUES ('TEST_ADMIN',  'test_admin@homefind.com',  SHA2('password123', 256), 'Admin',  0, NOW())",
    "INSERT IGNORE INTO users (user_id, email, password_hash, role, otp_enabled, password_last_changed) VALUES ('TEST_OWNER',  'test_owner@homefind.com',  SHA2('password123', 256), 'Owner',  0, NOW())",
    "INSERT IGNORE INTO users (user_id, email, password_hash, role, otp_enabled, password_last_changed) VALUES ('TEST_AGENT',  'test_agent@homefind.com',  SHA2('password123', 256), 'Agent',  0, NOW())",
    "INSERT IGNORE INTO users (user_id, email, password_hash, role, otp_enabled, password_last_changed) VALUES ('TEST_TENANT', 'test_tenant@homefind.com', SHA2('password123', 256), 'Tenant', 0, NOW())",
    "INSERT IGNORE INTO owner (owner_id, user_id, name, email) VALUES ('TEST_O01', 'TEST_OWNER', 'Test Owner Name', 'test_owner@homefind.com')",
    "INSERT IGNORE INTO agent (agent_id, user_id, name, phone_number, email) VALUES ('TEST_A01', 'TEST_AGENT', 'Test Agent Name', '+256700000001', 'test_agent@homefind.com')",
    "INSERT IGNORE INTO tenant (tenant_id, user_id, name, email, date_of_birth, address) VALUES ('TEST_T01', 'TEST_TENANT', 'Test Tenant Name', 'test_tenant@homefind.com', '1990-01-01', 'Kampala, Uganda')"
]

try:
    conn = pymysql.connect(host=DB_HOST, user=DB_USER, password=DB_PASS, database=DB_NAME)
    cursor = conn.cursor()
    for query in sql_queries:
        cursor.execute(query)
    conn.commit()
    print("Test users successfully created!")
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
