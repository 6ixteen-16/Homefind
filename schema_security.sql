USE homefinder_db;

CREATE TABLE IF NOT EXISTS identity_documents (
    document_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    document_type ENUM('face_photo', 'national_id_front', 'national_id_back', 'land_title') NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    verified_at DATETIME NULL,
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_identity_documents_user (user_id),
    CONSTRAINT fk_identity_documents_user FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;