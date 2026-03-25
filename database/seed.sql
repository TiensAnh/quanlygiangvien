USE quanlygiangvien;

-- Password mẫu cho tất cả tài khoản: 123456
INSERT INTO accounts (username, password, role, status) VALUES
('admin1', '$2a$10$ace/v1inFKT8tUy6/0zCD.AmWrJv69uVtmMQa/9IHukU7ttyyGKlS', 'admin', 1),
('gv001', '$2a$10$ace/v1inFKT8tUy6/0zCD.AmWrJv69uVtmMQa/9IHukU7ttyyGKlS', 'giangvien', 1),
('gv002', '$2a$10$ace/v1inFKT8tUy6/0zCD.AmWrJv69uVtmMQa/9IHukU7ttyyGKlS', 'giangvien', 1),
('gv003', '$2a$10$ace/v1inFKT8tUy6/0zCD.AmWrJv69uVtmMQa/9IHukU7ttyyGKlS', 'giangvien', 1),
('gv004', '$2a$10$ace/v1inFKT8tUy6/0zCD.AmWrJv69uVtmMQa/9IHukU7ttyyGKlS', 'giangvien', 1),
('admin2', '$2a$10$ace/v1inFKT8tUy6/0zCD.AmWrJv69uVtmMQa/9IHukU7ttyyGKlS', 'admin', 1);

INSERT INTO teachers (magv, tengv, username, quequan, ngaysinh, gioitinh, sodienthoai) VALUES
('GV001', 'Nguyễn Văn An', 'gv001', 'Hà Nội', '1988-05-10', 'Nam', '0911111111'),
('GV002', 'Trần Thị Bình', 'gv002', 'Hải Phòng', '1990-07-15', 'Nữ', '0922222222'),
('GV003', 'Lê Văn Cường', 'gv003', 'Nam Định', '1987-02-20', 'Nam', '0933333333'),
('GV004', 'Phạm Thị Dung', 'gv004', 'Nghệ An', '1992-11-08', 'Nữ', '0944444444'),
('GV005', 'Hoàng Văn Em', 'admin1', 'Thanh Hóa', '1985-09-30', 'Nam', '0955555555');

INSERT INTO subjects (mamon, tenmon, sotiet, sotinchi) VALUES
('MH001', 'Cơ sở dữ liệu', 30, 3),
('MH002', 'Lập trình Web', 45, 4),
('MH003', 'Kiểm thử phần mềm', 30, 3),
('MH004', 'Phân tích thiết kế hệ thống', 45, 4),
('MH005', 'Mạng máy tính', 30, 3),
('MH006', 'Trí tuệ nhân tạo', 45, 4);

INSERT INTO semesters (mahocky, tenhocky, ngaybatdau, ngayketthuc) VALUES
('HK2026A', 'Học kỳ 1 năm 2026', '2026-01-05', '2026-05-30'),
('HK2026B', 'Học kỳ hè năm 2026', '2026-06-10', '2026-08-20'),
('HK2026C', 'Học kỳ 2 năm 2026', '2026-09-01', '2026-12-31');

-- 10 phân công mẫu hợp lệ
INSERT INTO assignments (magv, mamon, mahocky, ngayday, tietbatdau, tietketthuc) VALUES
('GV001', 'MH001', 'HK2026A', '2026-02-10', 1, 3),
('GV001', 'MH002', 'HK2026A', '2026-03-05', 4, 6),
('GV002', 'MH003', 'HK2026A', '2026-02-12', 1, 3),
('GV002', 'MH004', 'HK2026A', '2026-03-15', 7, 9),
('GV003', 'MH005', 'HK2026A', '2026-04-08', 1, 3),
('GV004', 'MH006', 'HK2026A', '2026-04-12', 4, 6),
('GV001', 'MH003', 'HK2026B', '2026-06-15', 1, 3),
('GV002', 'MH001', 'HK2026B', '2026-06-18', 4, 6),
('GV003', 'MH002', 'HK2026C', '2026-09-10', 1, 4),
('GV005', 'MH004', 'HK2026C', '2026-10-20', 5, 8);
