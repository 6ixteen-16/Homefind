-- ==============================================================================
-- HOME FINDER SERVICES LTD. - FULL SEED DATA
-- Covers all 3 property subclasses: Apartment, Condominium, Rental House
-- Run this AFTER importing schema.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. USERS
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO users (user_id, email, password_hash, role, otp_enabled, password_last_changed) VALUES
('U001', 'owner@homefind.com',  SHA2('password', 256), 'Owner',  0, NOW()),
('U002', 'admin@homefind.com',  SHA2('password123', 256), 'Admin', 0, NOW()),
('U003', 'agent@homefind.com',  SHA2('agent123', 256), 'Agent',  0, NOW()),
('U004', 'tenant@homefind.com', SHA2('tenant123', 256), 'Tenant', 0, NOW());

-- ------------------------------------------------------------------------------
-- 2. OWNER
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO owner (owner_id, user_id, name, email) VALUES
('O001', 'U001', 'Homefind Properties Ltd', 'owner@homefind.com');

INSERT IGNORE INTO owner_phone_number (owner_id, phone_number) VALUES
('O001', '+254700000001'),
('O001', '+254700000002');

-- ------------------------------------------------------------------------------
-- 3. AGENT
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO agent (agent_id, user_id, name, phone_number, email) VALUES
('AG001', 'U003', 'Brian Mwangi', '+254711111111', 'agent@homefind.com');

-- ------------------------------------------------------------------------------
-- 4. TENANT
-- ------------------------------------------------------------------------------
INSERT IGNORE INTO tenant (tenant_id, user_id, name, email, date_of_birth, address) VALUES
('T001', 'U004', 'Alice Kamau', 'tenant@homefind.com', '1995-06-15', '45 Westlands Road, Nairobi');

INSERT IGNORE INTO tenant_phone_number (tenant_id, phone_number) VALUES
('T001', '+254722222222');

-- ==============================================================================
-- APARTMENTS (3 properties)
-- ==============================================================================

INSERT IGNORE INTO property (property_id, property_name, description, street, district, city, country, property_status, price, is_featured, owner_id) VALUES
('P001', 'Skyline Apartments - Westlands', 'Modern high-rise apartments with stunning city views and rooftop access.', 'Westlands Road', 'Westlands', 'Nairobi', 'Kenya', 'Published', 85000.00, 1, 'O001'),
('P002', 'Garden View Apartments', 'Serene garden apartments ideal for small families. Walking distance to schools.', 'Ngong Road', 'Kilimani', 'Nairobi', 'Kenya', 'Published', 65000.00, 1, 'O001'),
('P003', 'Mombasa Road Executive Flats', 'Executive serviced apartments near SGR station with 24hr security.', 'Mombasa Road', 'South B', 'Nairobi', 'Kenya', 'Published', 55000.00, 0, 'O001');

INSERT IGNORE INTO apartment (property_id, number_of_units, amenities) VALUES
('P001', 40, 'Rooftop Pool, Gym, Parking, High-Speed WiFi, 24hr Security'),
('P002', 20, 'Landscaped Garden, Parking, Backup Generator, Borehole Water'),
('P003', 60, 'Lift, Parking, CCTV, Concierge Service');

INSERT IGNORE INTO unit (property_id, unit_number, floor, bedrooms, bathrooms, square_footage, monthly_rent, availability_status) VALUES
('P001', 'A1', 3, 1, 1, 650, 35000, 'Available'),
('P001', 'A2', 5, 2, 2, 1100, 55000, 'Occupied'),
('P001', 'A3', 10, 3, 2, 1500, 85000, 'Available'),
('P002', 'B1', 1, 2, 1, 900, 42000, 'Available'),
('P002', 'B2', 2, 3, 2, 1200, 65000, 'Available'),
('P003', 'C1', 4, 1, 1, 600, 30000, 'Available'),
('P003', 'C2', 6, 2, 2, 1000, 55000, 'Occupied');

INSERT IGNORE INTO property_media (media_id, property_id, url, type, is_featured) VALUES
('M001', 'P001', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=800', 'IMAGE', 1),
('M002', 'P001', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800', 'IMAGE', 0),
('M003', 'P002', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800', 'IMAGE', 1),
('M004', 'P003', 'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&q=80&w=800', 'IMAGE', 1);

-- ==============================================================================
-- CONDOMINIUMS (3 properties)
-- ==============================================================================

INSERT IGNORE INTO property (property_id, property_name, description, street, district, city, country, property_status, price, is_featured, owner_id) VALUES
('P004', 'Pearl Marina Condominiums', 'Luxury lakeside condos with private marina access and stunning sunset views.', 'Mfangano Street', 'Upper Hill', 'Nairobi', 'Kenya', 'Published', 12500000.00, 1, 'O001'),
('P005', 'Lavington Green Condos', 'Exclusive gated condominiums in leafy Lavington. Pet friendly community.', 'James Gichuru Road', 'Lavington', 'Nairobi', 'Kenya', 'Published', 9800000.00, 1, 'O001'),
('P006', 'Kilimani Heights Condominiums', 'Contemporary condominiums with smart home features and co-working spaces.', 'Argwings Kodhek Road', 'Kilimani', 'Nairobi', 'Kenya', 'Published', 7500000.00, 0, 'O001');

INSERT IGNORE INTO condominium (property_id, amenities, management_fee) VALUES
('P004', 'Private Marina, Infinity Pool, Gym, Underground Parking, Concierge', 15000.00),
('P005', 'Communal Pool, Tennis Court, Pet Park, 3 Parking Bays, Club House', 12000.00),
('P006', 'Co-Working Space, Rooftop Terrace, EV Charging, Smart Home System', 10000.00);

INSERT IGNORE INTO unit (property_id, unit_number, floor, bedrooms, bathrooms, square_footage, monthly_rent, availability_status) VALUES
('P004', 'D1', 2, 3, 3, 2200, 120000, 'Available'),
('P004', 'D2', 5, 4, 4, 3000, 180000, 'Occupied'),
('P005', 'E1', 1, 3, 2, 1800, 95000, 'Available'),
('P005', 'E2', 3, 4, 3, 2400, 140000, 'Available'),
('P006', 'F1', 4, 2, 2, 1400, 75000, 'Available'),
('P006', 'F2', 7, 3, 3, 1900, 100000, 'Under Maintenance');

INSERT IGNORE INTO property_media (media_id, property_id, url, type, is_featured) VALUES
('M005', 'P004', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800', 'IMAGE', 1),
('M006', 'P004', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=800', 'IMAGE', 0),
('M007', 'P005', 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&q=80&w=800', 'IMAGE', 1),
('M008', 'P006', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=800', 'IMAGE', 1);

-- ==============================================================================
-- RENTAL HOUSES (4 properties)
-- ==============================================================================

INSERT IGNORE INTO property (property_id, property_name, description, street, district, city, country, property_status, price, is_featured, owner_id) VALUES
('P007', 'Karen Family Villa', 'Spacious 5-bedroom villa on 0.5 acres in Karen. Perfect for large families.', 'Karen Road', 'Karen', 'Nairobi', 'Kenya', 'Published', 250000.00, 1, 'O001'),
('P008', 'Runda Executive House', 'Fully furnished 4-bedroom house in Runda with private pool and DSQ.', 'Runda Close', 'Runda', 'Nairobi', 'Kenya', 'Published', 350000.00, 1, 'O001'),
('P009', 'Thika Road Townhouse', 'Affordable 3-bedroom townhouse near Garden City Mall.', 'Thika Road', 'Roysambu', 'Nairobi', 'Kenya', 'Published', 55000.00, 0, 'O001'),
('P010', 'Nyali Beach House', 'Beautiful beachfront house on the North Coast. Ideal for holiday or long-term rental.', 'Links Road', 'Nyali', 'Mombasa', 'Kenya', 'Published', 180000.00, 1, 'O001');

INSERT IGNORE INTO rental_house (property_id, house_size, yard_size) VALUES
('P007', 'Large - 4500 sqft', '0.5 Acres'),
('P008', 'Large - 3800 sqft', '0.25 Acres'),
('P009', 'Medium - 1600 sqft', 'Small Garden'),
('P010', 'Large - 3200 sqft', 'Beachfront Garden');

INSERT IGNORE INTO unit (property_id, unit_number, floor, bedrooms, bathrooms, square_footage, monthly_rent, availability_status) VALUES
('P007', 'MAIN', 1, 5, 4, 4500, 250000, 'Available'),
('P008', 'MAIN', 1, 4, 3, 3800, 350000, 'Occupied'),
('P009', 'UNIT1', 1, 3, 2, 1600, 55000, 'Available'),
('P010', 'MAIN', 1, 4, 3, 3200, 180000, 'Available');

INSERT IGNORE INTO property_media (media_id, property_id, url, type, is_featured) VALUES
('M009', 'P007', 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=800', 'IMAGE', 1),
('M010', 'P007', 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=800', 'IMAGE', 0),
('M011', 'P008', 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&q=80&w=800', 'IMAGE', 1),
('M012', 'P009', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&q=80&w=800', 'IMAGE', 1),
('M013', 'P010', 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&q=80&w=800', 'IMAGE', 1);

-- ==============================================================================
-- LISTINGS (linking agent to properties)
-- ==============================================================================
INSERT IGNORE INTO listing (listing_id, date_listed, description, listing_status, agent_id) VALUES
('L001', '2026-01-15', 'Prime Nairobi apartments and condos for rent.', 'Active', 'AG001'),
('L002', '2026-03-01', 'Exclusive Karen and Runda villa rentals.', 'Active', 'AG001');

INSERT IGNORE INTO advertised_as (listing_id, property_id) VALUES
('L001', 'P001'), ('L001', 'P002'), ('L001', 'P003'),
('L001', 'P004'), ('L001', 'P005'), ('L001', 'P006'),
('L002', 'P007'), ('L002', 'P008'), ('L002', 'P009'), ('L002', 'P010');
