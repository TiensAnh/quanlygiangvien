const db = require("../config/db");
const { ok, fail } = require("../utils/response");
const { validateRequired } = require("../utils/validators");

exports.getAll = async (req, res) => {
  try {
    const { keyword = "" } = req.query;
    const [rows] = await db.query(
      `SELECT * FROM subjects
       WHERE mamon LIKE ? OR tenmon LIKE ?
       ORDER BY mamon`,
      [`%${keyword}%`, `%${keyword}%`]
    );
    return ok(res, rows);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.getById = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM subjects WHERE mamon = ?", [req.params.id]);
    if (!rows.length) return fail(res, "Không tìm thấy môn học", 404);
    return ok(res, rows[0]);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.create = async (req, res) => {
  try {
    const { mamon, tenmon, sotiet, sotinchi } = req.body;
    const errors = validateRequired(
      { mamon, tenmon, sotiet, sotinchi },
      { mamon: "Mã môn học", tenmon: "Tên môn học", sotiet: "Số tiết", sotinchi: "Số tín chỉ" }
    );
    if (Number(sotiet) <= 0) errors.push("Số tiết phải lớn hơn 0");
    if (Number(sotinchi) <= 0) errors.push("Số tín chỉ phải lớn hơn 0");
    if (errors.length) return fail(res, "Dữ liệu không hợp lệ", 400, errors);

    const [dup] = await db.query("SELECT mamon FROM subjects WHERE mamon = ?", [mamon]);
    if (dup.length) return fail(res, "Mã môn học đã tồn tại", 409);

    await db.query(
      "INSERT INTO subjects (mamon, tenmon, sotiet, sotinchi) VALUES (?, ?, ?, ?)",
      [mamon, tenmon, Number(sotiet), Number(sotinchi)]
    );
    const [rows] = await db.query("SELECT * FROM subjects WHERE mamon = ?", [mamon]);
    return ok(res, rows[0], "Thêm môn học thành công", 201);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.update = async (req, res) => {
  try {
    const mamon = req.params.id;
    const { tenmon, sotiet, sotinchi } = req.body;

    const [exist] = await db.query("SELECT * FROM subjects WHERE mamon = ?", [mamon]);
    if (!exist.length) return fail(res, "Không tìm thấy môn học", 404);

    if (sotiet !== undefined && Number(sotiet) <= 0) return fail(res, "Số tiết phải lớn hơn 0", 400);
    if (sotinchi !== undefined && Number(sotinchi) <= 0) return fail(res, "Số tín chỉ phải lớn hơn 0", 400);

    await db.query(
      `UPDATE subjects
       SET tenmon = COALESCE(?, tenmon),
           sotiet = COALESCE(?, sotiet),
           sotinchi = COALESCE(?, sotinchi)
       WHERE mamon = ?`,
      [tenmon || null, sotiet !== undefined ? Number(sotiet) : null, sotinchi !== undefined ? Number(sotinchi) : null, mamon]
    );

    const [rows] = await db.query("SELECT * FROM subjects WHERE mamon = ?", [mamon]);
    return ok(res, rows[0], "Cập nhật môn học thành công");
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.remove = async (req, res) => {
  try {
    const mamon = req.params.id;
    const [assign] = await db.query("SELECT id FROM assignments WHERE mamon = ? LIMIT 1", [mamon]);
    if (assign.length) return fail(res, "Không thể xóa môn học vì đang có phân công liên quan", 409);

    const [result] = await db.query("DELETE FROM subjects WHERE mamon = ?", [mamon]);
    if (!result.affectedRows) return fail(res, "Không tìm thấy môn học", 404);
    return ok(res, null, "Xóa môn học thành công");
  } catch (error) {
    return fail(res, error.message, 500);
  }
};
