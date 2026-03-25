# Phần mềm quản lý giảng viên

Project gồm 3 phần chính:

- `backend/`: Node.js + Express + MySQL
- `frontend/`: HTML + CSS + JavaScript thuần
- `database/`: script tạo database và dữ liệu mẫu
- `postman/`: collection test API

## 1) Chạy database
Mở MySQL Workbench / XAMPP / phpMyAdmin rồi chạy lần lượt:

1. `database/schema.sql`
2. `database/seed.sql`

## 2) Chạy backend
```bash
cd backend
copy .env.example .env
npm install
npm start
```

API mặc định chạy tại:
```bash
http://localhost:3000/api
```

## 3) Chạy frontend
Cách đơn giản nhất:
- mở file `frontend/index.html` bằng trình duyệt

Tốt hơn:
- chạy bằng VS Code Live Server hoặc bất kỳ static server nào

## 4) Tài khoản mẫu
- Admin: `admin1` / `123456`
- Giảng viên: `gv001` / `123456`

## 5) Các rule nghiệp vụ đã code
- Không trùng tên tài khoản
- Không trùng mã giảng viên / mã môn / mã học kỳ
- Giảng viên tối đa 5 môn trong một học kỳ
- Không trùng môn cùng giảng viên trong cùng học kỳ
- Không trùng lịch trong cùng ngày
- Ngày dạy phải nằm trong học kỳ
- Tổng số tiết phân công của môn trong học kỳ không vượt quá số tiết môn học
- Không cho phép tiết bắt đầu lớn hơn tiết kết thúc

## 6) API chính
### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Tài khoản
- `GET /api/accounts`
- `GET /api/accounts/:id`
- `POST /api/accounts`
- `PUT /api/accounts/:id`
- `DELETE /api/accounts/:id`

### Giảng viên
- `GET /api/teachers`
- `GET /api/teachers/:id`
- `GET /api/teachers/search`
- `POST /api/teachers`
- `PUT /api/teachers/:id`
- `DELETE /api/teachers/:id`

### Môn học
- `GET /api/subjects`
- `GET /api/subjects/:id`
- `POST /api/subjects`
- `PUT /api/subjects/:id`
- `DELETE /api/subjects/:id`

### Học kỳ
- `GET /api/semesters`
- `GET /api/semesters/:id`
- `POST /api/semesters`
- `PUT /api/semesters/:id`
- `DELETE /api/semesters/:id`

### Phân công
- `GET /api/assignments`
- `GET /api/assignments/:id`
- `POST /api/assignments`
- `PUT /api/assignments/:id`
- `DELETE /api/assignments/:id`
- `GET /api/assignments/teacher/:magv`
- `GET /api/assignments/semester/:mahocky`
- `GET /api/assignments/report/load`

### Báo cáo / tra cứu
- `GET /api/reports/overview`
- `GET /api/reports/by-teacher`
- `GET /api/reports/by-semester`
- `GET /api/search?keyword=...`

## 7) Gợi ý demo
1. Đăng nhập bằng admin
2. Tạo thêm tài khoản
3. Gán tài khoản cho giảng viên
4. Tạo môn học / học kỳ
5. Tạo phân công và thử các rule nghiệp vụ
6. Mở Postman import file `postman/QLGV.postman_collection.json`
