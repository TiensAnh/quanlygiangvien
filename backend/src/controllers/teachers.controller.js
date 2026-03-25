const db = require("../config/db");
const { ok, fail } = require("../utils/response");
const { validateRequired, isValidPhone } = require("../utils/validators");

exports.search = async (req, res) => {
  try {
    const { magv = "", tengv = "", quequan = "", gioitinh = "" } = req.query;
    const [rows] = await db.query(
      `SELECT t.*, a.role, a.status
       FROM teachers t
       LEFT JOIN accounts a ON t.username = a.username
       WHERE t.magv LIKE ? AND t.tengv LIKE ? AND IFNULL(t.quequan,'') LIKE ? AND IFNULL(t.gioitinh,'') LIKE ?
       ORDER BY t.magv`,
      [`%${magv}%`, `%${tengv}%`, `%${quequan}%`, `%${gioitinh}%`]
    );
    return ok(res, rows);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};


exports.getAll = async (req, res) => {
  try {
    const { keyword = "" } = req.query;
    const kw = `%${keyword.trim()}%`;

    const [rows] = await db.query(
      `SELECT *
       FROM teachers
       WHERE magv LIKE ?
          OR tengv LIKE ?
          OR quequan LIKE ?
          OR gioitinh LIKE ?
          OR sodienthoai LIKE ?
       ORDER BY magv ASC`,
      [kw, kw, kw, kw, kw]
    );

    return ok(res, rows);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.*, a.role, a.status
       FROM teachers t
       LEFT JOIN accounts a ON t.username = a.username
       WHERE t.magv = ?`,
      [req.params.id]
    );
    if (!rows.length) return fail(res, "Không tìm thấy giảng viên", 404);
    return ok(res, rows[0]);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.create = async (req, res) => {
  try {
    const { magv, tengv, username, quequan, ngaysinh, gioitinh, sodienthoai } = req.body;
    const errors = validateRequired(
      { magv, tengv, username, quequan, ngaysinh, gioitinh, sodienthoai },
      {
        magv: "Mã giảng viên",
        tengv: "Tên giảng viên",
        username: "Tài khoản",
        quequan: "Quê quán",
        ngaysinh: "Ngày sinh",
        gioitinh: "Giới tính",
        sodienthoai: "Số điện thoại"
      }
    );
    if (!isValidPhone(sodienthoai)) errors.push("Số điện thoại phải có 9-11 chữ số");
    if (errors.length) return fail(res, "Dữ liệu không hợp lệ", 400, errors);
    if (!isValidPhone(sodienthoai)) errors.push("Số điện thoại phải có 9-11 chữ số");
    if (errors.length) return fail(res, "Dữ liệu không hợp lệ", 400, errors);

    // 👇 thêm đoạn này ở đây
    const [dupPhone] = await db.query(
      "SELECT magv FROM teachers WHERE sodienthoai = ?",
      [sodienthoai]
    );
    if (dupPhone.length) {
      return fail(res, "Số điện thoại đã tồn tại", 409);
    }

    const [acc] = await db.query("SELECT username FROM accounts WHERE username = ?", [username]);
    if (!acc.length) return fail(res, "Tài khoản không tồn tại", 404);

    const [dup] = await db.query("SELECT magv FROM teachers WHERE magv = ? OR username = ?", [magv, username]);
    if (dup.length) return fail(res, "Mã giảng viên hoặc tài khoản đã được gán cho giảng viên khác", 409);

    await db.query(
      `INSERT INTO teachers (magv, tengv, username, quequan, ngaysinh, gioitinh, sodienthoai)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [magv, tengv, username, quequan || null, ngaysinh, gioitinh, sodienthoai]
    );
    const [rows] = await db.query("SELECT * FROM teachers WHERE magv = ?", [magv]);
    return ok(res, rows[0], "Thêm giảng viên thành công", 201);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.update = async (req, res) => {
  try {
    const magv = req.params.id;
    const { tengv, username, quequan, ngaysinh, gioitinh, sodienthoai } = req.body;

    const [exist] = await db.query("SELECT * FROM teachers WHERE magv = ?", [magv]);
    if (!exist.length) return fail(res, "Không tìm thấy giảng viên", 404);

    if (username) {
      const [acc] = await db.query("SELECT username FROM accounts WHERE username = ?", [username]);
      if (!acc.length) return fail(res, "Tài khoản không tồn tại", 404);

      const [dupUser] = await db.query("SELECT magv FROM teachers WHERE username = ? AND magv <> ?", [username, magv]);
      if (dupUser.length) return fail(res, "Tài khoản đã gán cho giảng viên khác", 409);
    }
    

    if (sodienthoai && !isValidPhone(sodienthoai)) return fail(res, "Số điện thoại phải có 9-11 chữ số", 400);

    await db.query(
      `UPDATE teachers
       SET tengv = COALESCE(?, tengv),
           username = COALESCE(?, username),
           quequan = COALESCE(?, quequan),
           ngaysinh = COALESCE(?, ngaysinh),
           gioitinh = COALESCE(?, gioitinh),
           sodienthoai = COALESCE(?, sodienthoai)
       WHERE magv = ?`,
      [tengv || null, username || null, quequan || null, ngaysinh || null, gioitinh || null, sodienthoai || null, magv]
    );
    if (sodienthoai) {
      if (!isValidPhone(sodienthoai)) {
        return fail(res, "Số điện thoại phải có 9-11 chữ số", 400);
      }

      const [dupPhone] = await db.query(
        "SELECT magv FROM teachers WHERE sodienthoai = ? AND magv <> ?",
        [sodienthoai, magv]
      );

      if (dupPhone.length) {
        return fail(res, "Số điện thoại đã tồn tại", 409);
      }
    }
    const [rows] = await db.query("SELECT * FROM teachers WHERE magv = ?", [magv]);
    return ok(res, rows[0], "Cập nhật giảng viên thành công");
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.remove = async (req, res) => {
  try {
    const magv = req.params.id;
    const [assign] = await db.query("SELECT id FROM assignments WHERE magv = ? LIMIT 1", [magv]);
    if (assign.length) return fail(res, "Không thể xóa giảng viên vì đang có phân công giảng dạy", 409);

    const [result] = await db.query("DELETE FROM teachers WHERE magv = ?", [magv]);
    if (!result.affectedRows) return fail(res, "Không tìm thấy giảng viên", 404);
    return ok(res, null, "Xóa giảng viên thành công");
  } catch (error) {
    return fail(res, error.message, 500);
  }
};
