const db = require("../config/db");
const { ok, fail } = require("../utils/response");
const { validateRequired } = require("../utils/validators");

function invalidDateRange(start, end) {
  return new Date(start) >= new Date(end);
}

exports.getAll = async (req, res) => {
  try {
    const { keyword = "" } = req.query;
    const [rows] = await db.query(
      `SELECT * FROM semesters
       WHERE mahocky LIKE ? OR tenhocky LIKE ?
       ORDER BY ngaybatdau DESC`,
      [`%${keyword}%`, `%${keyword}%`]
    );
    return ok(res, rows);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.getById = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM semesters WHERE mahocky = ?", [req.params.id]);
    if (!rows.length) return fail(res, "Không tìm thấy học kỳ", 404);
    return ok(res, rows[0]);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.create = async (req, res) => {
  try {
    const { mahocky, tenhocky, ngaybatdau, ngayketthuc } = req.body;
    const errors = validateRequired(
      { mahocky, tenhocky, ngaybatdau, ngayketthuc },
      { mahocky: "Mã học kỳ", tenhocky: "Tên học kỳ", ngaybatdau: "Ngày bắt đầu", ngayketthuc: "Ngày kết thúc" }
    );
    if (ngaybatdau && ngayketthuc && invalidDateRange(ngaybatdau, ngayketthuc)) {
      errors.push("Ngày bắt đầu phải nhỏ hơn ngày kết thúc");
    }
    if (errors.length) return fail(res, "Dữ liệu không hợp lệ", 400, errors);

    const [dup] = await db.query("SELECT mahocky FROM semesters WHERE mahocky = ?", [mahocky]);
    if (dup.length) return fail(res, "Mã học kỳ đã tồn tại", 409);

    await db.query(
      "INSERT INTO semesters (mahocky, tenhocky, ngaybatdau, ngayketthuc) VALUES (?, ?, ?, ?)",
      [mahocky, tenhocky, ngaybatdau, ngayketthuc]
    );
    const [rows] = await db.query("SELECT * FROM semesters WHERE mahocky = ?", [mahocky]);
    return ok(res, rows[0], "Thêm học kỳ thành công", 201);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.update = async (req, res) => {
  try {
    const mahocky = req.params.id;
    const [exist] = await db.query("SELECT * FROM semesters WHERE mahocky = ?", [mahocky]);
    if (!exist.length) return fail(res, "Không tìm thấy học kỳ", 404);

    const current = exist[0];
    const tenhocky = req.body.tenhocky ?? current.tenhocky;
    const ngaybatdau = req.body.ngaybatdau ?? current.ngaybatdau;
    const ngayketthuc = req.body.ngayketthuc ?? current.ngayketthuc;

    if (new Date(ngaybatdau) >= new Date(ngayketthuc)) {
      return fail(res, "Ngày bắt đầu phải nhỏ hơn ngày kết thúc", 400);
    }

    await db.query(
      `UPDATE semesters
       SET tenhocky = ?, ngaybatdau = ?, ngayketthuc = ?
       WHERE mahocky = ?`,
      [tenhocky, ngaybatdau, ngayketthuc, mahocky]
    );
    const [rows] = await db.query("SELECT * FROM semesters WHERE mahocky = ?", [mahocky]);
    return ok(res, rows[0], "Cập nhật học kỳ thành công");
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.remove = async (req, res) => {
  try {
    const mahocky = req.params.id;
    const [assign] = await db.query("SELECT id FROM assignments WHERE mahocky = ? LIMIT 1", [mahocky]);
    if (assign.length) return fail(res, "Không thể xóa học kỳ vì đang có phân công liên quan", 409);

    const [result] = await db.query("DELETE FROM semesters WHERE mahocky = ?", [mahocky]);
    if (!result.affectedRows) return fail(res, "Không tìm thấy học kỳ", 404);
    return ok(res, null, "Xóa học kỳ thành công");
  } catch (error) {
    return fail(res, error.message, 500);
  }
};
