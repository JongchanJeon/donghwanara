CREATE DATABASE IF NOT EXISTS donghwanara
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE donghwanara;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS contents;
DROP TABLE IF EXISTS auth_tokens;
DROP TABLE IF EXISTS boards;
DROP TABLE IF EXISTS members;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE members (
    id INT NOT NULL AUTO_INCREMENT,
    email VARCHAR(120) NOT NULL,
    name VARCHAR(50) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    story_points INT NOT NULL DEFAULT 0,
    created_date DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    deleted_date DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_members_email UNIQUE (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE boards (
    id INT NOT NULL AUTO_INCREMENT,
    title VARCHAR(50) NOT NULL,
    contents VARCHAR(256) NULL,
    summary VARCHAR(256) NOT NULL,
    status INT NOT NULL,
    member_id INT NULL,
    created_date DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    deleted_date DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_boards_member
        FOREIGN KEY (member_id) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE contents (
    id INT NOT NULL AUTO_INCREMENT,
    book_id INT NOT NULL,
    seq INT NOT NULL,
    photo_path VARCHAR(256) NOT NULL,
    subtitle_ko VARCHAR(1000) NOT NULL,
    subtitle_en VARCHAR(1000) NOT NULL,
    subtitle_jp VARCHAR(1000) NOT NULL,
    scene_description_ko VARCHAR(1000) NULL,
    scene_description_en VARCHAR(1000) NULL,
    scene_description_jp VARCHAR(1000) NULL,
    audio_ko_path VARCHAR(256) NOT NULL,
    audio_en_path VARCHAR(256) NOT NULL,
    audio_jp_path VARCHAR(256) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_contents_board
        FOREIGN KEY (book_id) REFERENCES boards (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE auth_tokens (
    id BIGINT NOT NULL AUTO_INCREMENT,
    token VARCHAR(80) NOT NULL,
    member_id INT NOT NULL,
    created_date DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    expires_date DATETIME(6) NOT NULL,
    revoked_date DATETIME(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_auth_tokens_token UNIQUE (token),
    CONSTRAINT fk_auth_tokens_member
        FOREIGN KEY (member_id) REFERENCES members (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_boards_member_deleted_id
    ON boards (member_id, deleted_date, id);

CREATE INDEX idx_contents_book_seq
    ON contents (book_id, seq);

CREATE INDEX idx_auth_tokens_member_id
    ON auth_tokens (member_id);
