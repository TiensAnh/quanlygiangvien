DROP DATABASE IF EXISTS quanlygiangvien;
CREATE DATABASE quanlygiangvien CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE quanlygiangvien;

CREATE TABLE accounts (
    username VARCHAR(50) PRIMARY KEY,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin','giangvien') NOT NULL DEFAULT 'giangvien',
    status TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE teachers (
    magv VARCHAR(10) PRIMARY KEY,
    tengv VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    quequan VARCHAR(100),
    ngaysinh DATE NOT NULL,
    gioitinh VARCHAR(10) NOT NULL,
    sodienthoai VARCHAR(11) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_teachers_account FOREIGN KEY (username) REFERENCES accounts(username)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE subjects (
    mamon VARCHAR(10) PRIMARY KEY,
    tenmon VARCHAR(100) NOT NULL,
    sotiet INT NOT NULL CHECK (sotiet > 0),
    sotinchi INT NOT NULL CHECK (sotinchi > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE semesters (
    mahocky VARCHAR(10) PRIMARY KEY,
    tenhocky VARCHAR(50) NOT NULL,
    ngaybatdau DATE NOT NULL,
    ngayketthuc DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_semester_dates CHECK (ngaybatdau < ngayketthuc)
);

CREATE TABLE assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    magv VARCHAR(10) NOT NULL,
    mamon VARCHAR(10) NOT NULL,
    mahocky VARCHAR(10) NOT NULL,
    ngayday DATE NOT NULL,
    tietbatdau INT NOT NULL,
    tietketthuc INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_assignments_teacher FOREIGN KEY (magv) REFERENCES teachers(magv)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_assignments_subject FOREIGN KEY (mamon) REFERENCES subjects(mamon)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_assignments_semester FOREIGN KEY (mahocky) REFERENCES semesters(mahocky)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_assignment_period CHECK (tietbatdau > 0 AND tietketthuc >= tietbatdau)
);

CREATE INDEX idx_assignment_teacher ON assignments(magv);
CREATE INDEX idx_assignment_subject ON assignments(mamon);
CREATE INDEX idx_assignment_semester ON assignments(mahocky);
CREATE INDEX idx_assignment_date ON assignments(ngayday);
