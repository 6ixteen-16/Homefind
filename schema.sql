CREATE DATABASE IF NOT EXISTS homefinder_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE homefinder_db;

CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Agent', 'Owner', 'Tenant') NOT NULL,
    otp_secret VARCHAR(64) NULL,
    otp_enabled TINYINT(1) NOT NULL DEFAULT 0,
    password_last_changed DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
    log_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NULL,
    action VARCHAR(100) NULL,
    table_name VARCHAR(100) NULL,
    record_id VARCHAR(100) NULL,
    old_value TEXT NULL,
    new_value TEXT NULL,
    ip_address VARCHAR(100) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS identity_documents (
    document_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_at DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS owner (
    owner_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS agent (
    agent_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NULL,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tenant (
    tenant_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    date_of_birth DATE NULL,
    address VARCHAR(500) NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS owner_phone_number (
    owner_id VARCHAR(50) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    PRIMARY KEY (owner_id, phone_number),
    FOREIGN KEY (owner_id) REFERENCES owner(owner_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tenant_phone_number (
    tenant_id VARCHAR(50) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    PRIMARY KEY (tenant_id, phone_number),
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS property (
    property_id VARCHAR(50) PRIMARY KEY,
    owner_id VARCHAR(50) NULL,
    property_name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    street VARCHAR(255) NULL,
    district VARCHAR(255) NULL,
    city VARCHAR(255) NULL,
    country VARCHAR(255) NULL,
    location VARCHAR(255) NULL,
    latitude DECIMAL(9,6) NULL,
    longitude DECIMAL(9,6) NULL,
    property_status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    views INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES owner(owner_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS apartment (
    property_id VARCHAR(50) PRIMARY KEY,
    number_of_units INT NULL,
    amenities TEXT NULL,
    management_fee DECIMAL(15,2) NULL,
    FOREIGN KEY (property_id) REFERENCES property(property_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS condominium (
    property_id VARCHAR(50) PRIMARY KEY,
    amenities TEXT NULL,
    management_fee DECIMAL(15,2) NULL,
    FOREIGN KEY (property_id) REFERENCES property(property_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rental_house (
    property_id VARCHAR(50) PRIMARY KEY,
    house_size DECIMAL(12,2) NULL,
    yard_size DECIMAL(12,2) NULL,
    FOREIGN KEY (property_id) REFERENCES property(property_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS unit (
    property_id VARCHAR(50) NOT NULL,
    unit_number VARCHAR(50) NOT NULL,
    floor VARCHAR(50) NULL,
    bedrooms INT NULL,
    bathrooms INT NULL,
    square_footage DECIMAL(12,2) NULL,
    monthly_rent DECIMAL(15,2) NULL,
    availability_status ENUM('Available', 'Occupied', 'Under Maintenance') NOT NULL DEFAULT 'Available',
    PRIMARY KEY (property_id, unit_number),
    FOREIGN KEY (property_id) REFERENCES property(property_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS property_media (
    media_id VARCHAR(50) PRIMARY KEY,
    property_id VARCHAR(50) NOT NULL,
    url VARCHAR(500) NOT NULL,
    type ENUM('IMAGE', 'VIDEO', 'FLOOR_PLAN') NOT NULL DEFAULT 'IMAGE',
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (property_id) REFERENCES property(property_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS amenity (
    amenity_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(100) NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS property_amenity (
    property_id VARCHAR(50) NOT NULL,
    amenity_id INT NOT NULL,
    PRIMARY KEY (property_id, amenity_id),
    FOREIGN KEY (property_id) REFERENCES property(property_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (amenity_id) REFERENCES amenity(amenity_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS listing (
    listing_id VARCHAR(50) PRIMARY KEY,
    date_listed DATE NOT NULL,
    description TEXT NULL,
    listing_status ENUM('Active', 'Expired', 'Closed') NOT NULL DEFAULT 'Active',
    agent_id VARCHAR(50) NULL,
    FOREIGN KEY (agent_id) REFERENCES agent(agent_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS advertised_as (
    listing_id VARCHAR(50) NOT NULL,
    property_id VARCHAR(50) NOT NULL,
    PRIMARY KEY (listing_id, property_id),
    FOREIGN KEY (listing_id) REFERENCES listing(listing_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (property_id) REFERENCES property(property_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inquiry (
    inquiry_id VARCHAR(50) PRIMARY KEY,
    property_id VARCHAR(50) NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NULL,
    message TEXT NOT NULL,
    status ENUM('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'NEW',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES property(property_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS viewing (
    viewing_id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,
    property_id VARCHAR(50) NOT NULL,
    unit_number VARCHAR(50) NOT NULL,
    viewing_date DATE NOT NULL,
    viewing_time TIME NOT NULL,
    status ENUM('Requested', 'Confirmed', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Requested',
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (property_id, unit_number) REFERENCES unit(property_id, unit_number) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS rental_agreement (
    agreement_id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,
    property_id VARCHAR(50) NOT NULL,
    unit_number VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    agreed_rent DECIMAL(15,2) NOT NULL,
    agreement_status ENUM('Active', 'Terminated') NOT NULL DEFAULT 'Active',
    FOREIGN KEY (tenant_id) REFERENCES tenant(tenant_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (property_id, unit_number) REFERENCES unit(property_id, unit_number) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;
