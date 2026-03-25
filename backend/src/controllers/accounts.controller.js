const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { ok, fail } = require("../utils/response");
const { validateRequired } = require("../utils/validators");

exports.getAll = async (req, res) => {
  try {
    const { keyword = "" } = req.query;
    const [rows] = await db.query(
      `SELECT a.username, a.role, a.status, t.magv, t.tengv
       FROM accounts a
       LEFT JOIN teachers t ON a.username = t.username
       WHERE a.username LIKE ? OR a.role LIKE ? OR IFNULL(t.tengv,'') LIKE ?
       ORDER BY a.username`,
      [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]
    );
    return ok(res, rows);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.username, a.role, a.status, t.magv, t.tengv
       FROM accounts a
       LEFT JOIN teachers t ON a.username = t.username
       WHERE a.username = ?`,
      [req.params.id]
    );
    if (!rows.length) return fail(res, "Không tìm thấy tài khoản", 404);
    return ok(res, rows[0]);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.create = async (req, res) => {
  try {
    const { username, password, role = "giangvien", status = true } = req.body;
    const errors = validateRequired(
      { username, password },
      { username: "Tên tài khoản", password: "Mật khẩu" }
    );
    if (errors.length) return fail(res, "Dữ liệu không hợp lệ", 400, errors);

    const [exists] = await db.query("SELECT username FROM accounts WHERE username = ?", [username]);
    if (exists.length) return fail(res, "Tên tài khoản đã tồn tại", 409);

    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO accounts (username, password, role, status) VALUES (?, ?, ?, ?)",
      [username, hashed, role === "admin" ? "admin" : "giangvien", status ? 1 : 0]
    );
    return ok(res, { username, role, status: !!status }, "Tạo tài khoản thành công", 201);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.update = async (req, res) => {
  try {
    const { role, status, password } = req.body;
    const username = req.params.id;
    const [exists] = await db.query("SELECT username FROM accounts WHERE username = ?", [username]);
    if (!exists.length) return fail(res, "Không tìm thấy tài khoản", 404);

    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      await db.query("UPDATE accounts SET password = ? WHERE username = ?", [hashed, username]);
    }
    if (role) {
      await db.query("UPDATE accounts SET role = ? WHERE username = ?", [role === "admin" ? "admin" : "giangvien", username]);
    }
    if (status !== undefined) {
      await db.query("UPDATE accounts SET status = ? WHERE username = ?", [status ? 1 : 0, username]);
    }

    const [rows] = await db.query("SELECT username, role, status FROM accounts WHERE username = ?", [username]);
    return ok(res, rows[0], "Cập nhật tài khoản thành công");
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.remove = async (req, res) => {
  try {
    const username = req.params.id;
    const [teacherRows] = await db.query("SELECT magv FROM teachers WHERE username = ?", [username]);
    if (teacherRows.length) {
      const magv = teacherRows[0].magv;
      const [assignmentRows] = await db.query("SELECT id FROM assignments WHERE magv = ? LIMIT 1", [magv]);
      if (assignmentRows.length) {
        return fail(res, "Không thể xóa tài khoản vì giảng viên đang có phân công giảng dạy", 409);
      }
      await db.query("DELETE FROM teachers WHERE username = ?", [username]);
    }

    const [result] = await db.query("DELETE FROM accounts WHERE username = ?", [username]);
    if (!result.affectedRows) return fail(res, "Không tìm thấy tài khoản", 404);
    return ok(res, null, "Xóa tài khoản thành công");
  } catch (error) {
    return fail(res, error.message, 500);
  }
};
