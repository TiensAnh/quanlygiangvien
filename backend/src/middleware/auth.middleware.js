const jwt = require("jsonwebtoken");
const { fail } = require("../utils/response");

exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return fail(res, "Bạn chưa đăng nhập", 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "super_secret_change_me");
    req.user = decoded;
    next();
  } catch (error) {
    return fail(res, "Token không hợp lệ hoặc đã hết hạn", 401);
  }
};

exports.requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return fail(res, "Bạn không có quyền thực hiện chức năng này", 403);
  }
  next();
};

exports.requireTeacherOrAdmin = (req, res, next) => {
  if (!req.user || !["admin", "giangvien"].includes(req.user.role)) {
    return fail(res, "Bạn không có quyền truy cập", 403);
  }
  next();
};
