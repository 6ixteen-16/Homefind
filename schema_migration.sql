USE homefinder_db;

-- Safe alignment for installations created before schema.sql.
UPDATE viewing SET status = 'Requested' WHERE status IS NULL;
UPDATE listing SET listing_status = 'Active' WHERE listing_status IS NULL;
UPDATE inquiry SET status = 'NEW' WHERE status IS NULL;
UPDATE rental_agreement SET agreement_status = 'Active' WHERE agreement_status IS NULL;
DELETE FROM viewing WHERE viewing_id = 'VIEW_TEST_SCHEMA';

ALTER TABLE users
    MODIFY email VARCHAR(255) NOT NULL,
    MODIFY role ENUM('Admin', 'Agent', 'Owner', 'Tenant') NOT NULL,
    MODIFY otp_secret VARCHAR(64) NULL,
    MODIFY otp_enabled TINYINT(1) NOT NULL DEFAULT 0,
    MODIFY failed_login_attempts INT NOT NULL DEFAULT 0,
    MODIFY created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE property
    MODIFY owner_id VARCHAR(50) NULL,
    MODIFY property_name VARCHAR(255) NOT NULL,
    MODIFY price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    MODIFY currency CHAR(3) NOT NULL DEFAULT 'USD';

ALTER TABLE unit
    MODIFY monthly_rent DECIMAL(12,2) NULL,
    MODIFY availability_status ENUM('Available', 'Occupied', 'Under Maintenance') NOT NULL DEFAULT 'Available';

ALTER TABLE property_media
    MODIFY url VARCHAR(500) NOT NULL,
    MODIFY type ENUM('IMAGE', 'VIDEO', 'FLOOR_PLAN') NOT NULL DEFAULT 'IMAGE';

ALTER TABLE listing
    MODIFY listing_status ENUM('Active', 'Expired', 'Closed') NOT NULL DEFAULT 'Active',
    MODIFY agent_id VARCHAR(50) NULL;

ALTER TABLE inquiry
    MODIFY status ENUM('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'NEW';

ALTER TABLE viewing
    MODIFY status ENUM('Requested', 'Confirmed', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Requested';

ALTER TABLE rental_agreement
    MODIFY end_date DATE NULL,
    MODIFY agreement_status ENUM('Active', 'Terminated') NOT NULL DEFAULT 'Active';

-- The existing amenity tables are empty in the current local database, so their
-- identifiers can be aligned with the canonical integer-based schema.
ALTER TABLE property_amenity DROP FOREIGN KEY property_amenity_ibfk_2;
ALTER TABLE amenity MODIFY amenity_id INT NOT NULL AUTO_INCREMENT;
ALTER TABLE property_amenity MODIFY amenity_id INT NOT NULL;
ALTER TABLE property_amenity ADD CONSTRAINT property_amenity_ibfk_2
    FOREIGN KEY (amenity_id) REFERENCES amenity(amenity_id)
    ON DELETE CASCADE ON UPDATE CASCADE;
