-- Creates one test user for each role in the system
-- All users have the password: password123

INSERT IGNORE INTO users (user_id, email, password_hash, role, otp_enabled, password_last_changed) VALUES
('TEST_ADMIN',  'test_admin@homefind.com',  SHA2('password123', 256), 'Admin',  0, NOW()),
('TEST_OWNER',  'test_owner@homefind.com',  SHA2('password123', 256), 'Owner',  0, NOW()),
('TEST_AGENT',  'test_agent@homefind.com',  SHA2('password123', 256), 'Agent',  0, NOW()),
('TEST_TENANT', 'test_tenant@homefind.com', SHA2('password123', 256), 'Tenant', 0, NOW());

-- Also add the corresponding entity records so they don't break foreign keys
INSERT IGNORE INTO owner (owner_id, user_id, name, email) VALUES
('TEST_O01', 'TEST_OWNER', 'Test Owner Name', 'test_owner@homefind.com');

INSERT IGNORE INTO agent (agent_id, user_id, name, phone_number, email) VALUES
('TEST_A01', 'TEST_AGENT', 'Test Agent Name', '+256700000001', 'test_agent@homefind.com');

INSERT IGNORE INTO tenant (tenant_id, user_id, name, email, date_of_birth, address) VALUES
('TEST_T01', 'TEST_TENANT', 'Test Tenant Name', 'test_tenant@homefind.com', '1990-01-01', 'Kampala, Uganda');
