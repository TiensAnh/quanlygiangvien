const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { ok, fail } = require("../utils/response");
const { validateRequired } = require("../utils/validators");

exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;

    const errors = validateRequired(
      { username, password },
      { username: "Tên tài khoản", password: "Mật khẩu" }
    );
    if (errors.length) return fail(res, "Dữ liệu không hợp lệ", 400, errors);

    const [exists] = await db.query("SELECT username FROM accounts WHERE username = ?", [username]);
    if (exists.length) return fail(res, "Tên tài khoản đã tồn tại", 409);

    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO accounts (username, password, role, status) VALUES (?, ?, ?, 1)",
      [username, hashed, "giangvien"]
    );

    return ok(res, { username, role: "giangvien" }, "Đăng ký thành công", 201);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const errors = validateRequired(
      { username, password },
      { username: "Tên tài khoản", password: "Mật khẩu" }
    );
    if (errors.length) return fail(res, "Dữ liệu không hợp lệ", 400, errors);

    const [rows] = await db.query(
      `SELECT a.username, a.password, a.role, a.status, t.magv, t.tengv
       FROM accounts a
       LEFT JOIN teachers t ON t.username = a.username
       WHERE a.username = ?`,
      [username]
    );

    if (!rows.length) return fail(res, "Sai tên tài khoản hoặc mật khẩu", 401);

    const user = rows[0];
    if (!user.status) return fail(res, "Tài khoản đã bị khóa", 403);

    const matched = await bcrypt.compare(password, user.password);
    if (!matched) return fail(res, "Sai tên tài khoản hoặc mật khẩu", 401);

    const token = jwt.sign(
      { username: user.username, role: user.role, magv: user.magv || null, tengv: user.tengv || null },
      process.env.JWT_SECRET || "super_secret_change_me",
      { expiresIn: "8h" }
    );

    return ok(
      res,
      {
        token,
        user: {
          username: user.username,
          role: user.role,
          magv: user.magv || null,
          tengv: user.tengv || null
        }
      },
      "Đăng nhập thành công"
    );
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.me = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.username, a.role, a.status, t.magv, t.tengv, t.quequan, t.ngaysinh, t.gioitinh, t.sodienthoai
       FROM accounts a
       LEFT JOIN teachers t ON t.username = a.username
       WHERE a.username = ?`,
      [req.user.username]
    );
    if (!rows.length) return fail(res, "Không tìm thấy người dùng", 404);
    return ok(res, rows[0], "Lấy thông tin thành công");
  } catch (error) {
    return fail(res, error.message, 500);
  }
};
