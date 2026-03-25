const db = require("../config/db");
const { ok, fail } = require("../utils/response");

exports.overview = async (req, res) => {
  try {
    const [[teachers]] = await db.query("SELECT COUNT(*) AS total FROM teachers");
    const [[subjects]] = await db.query("SELECT COUNT(*) AS total FROM subjects");
    const [[semesters]] = await db.query("SELECT COUNT(*) AS total FROM semesters");
    const [[assignments]] = await db.query("SELECT COUNT(*) AS total FROM assignments");
    return ok(res, {
      teachers: teachers.total,
      subjects: subjects.total,
      semesters: semesters.total,
      assignments: assignments.total
    });
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.byTeacher = async (req, res) => {
  try {
    const { mahocky = "" } = req.query;
    const [rows] = await db.query(
      `SELECT a.magv, t.tengv,
              COUNT(DISTINCT a.mamon) AS soMon,
              SUM(a.tietketthuc - a.tietbatdau + 1) AS tongSoTiet
       FROM assignments a
       JOIN teachers t ON a.magv = t.magv
       WHERE a.mahocky LIKE ?
       GROUP BY a.magv, t.tengv
       ORDER BY tongSoTiet DESC, t.tengv`,
      [`%${mahocky}%`]
    );
    return ok(res, rows);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.bySemester = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.mahocky, se.tenhocky,
              COUNT(*) AS soPhanCong,
              COUNT(DISTINCT a.magv) AS soGiangVien,
              COUNT(DISTINCT a.mamon) AS soMonHoc,
              SUM(a.tietketthuc - a.tietbatdau + 1) AS tongSoTiet
       FROM assignments a
       JOIN semesters se ON a.mahocky = se.mahocky
       GROUP BY a.mahocky, se.tenhocky
       ORDER BY se.ngaybatdau DESC`
    );
    return ok(res, rows);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.globalSearch = async (req, res) => {
  try {
    const keyword = req.query.keyword || "";
    const [teachers] = await db.query(
      "SELECT magv AS id, tengv AS label, 'teacher' AS type FROM teachers WHERE magv LIKE ? OR tengv LIKE ? LIMIT 10",
      [`%${keyword}%`, `%${keyword}%`]
    );
    const [subjects] = await db.query(
      "SELECT mamon AS id, tenmon AS label, 'subject' AS type FROM subjects WHERE mamon LIKE ? OR tenmon LIKE ? LIMIT 10",
      [`%${keyword}%`, `%${keyword}%`]
    );
    const [semesters] = await db.query(
      "SELECT mahocky AS id, tenhocky AS label, 'semester' AS type FROM semesters WHERE mahocky LIKE ? OR tenhocky LIKE ? LIMIT 10",
      [`%${keyword}%`, `%${keyword}%`]
    );
    const [assignments] = await db.query(
      `SELECT CAST(a.id AS CHAR) AS id, CONCAT(t.tengv, ' - ', s.tenmon, ' - ', DATE_FORMAT(a.ngayday, '%Y-%m-%d')) AS label, 'assignment' AS type
       FROM assignments a
       JOIN teachers t ON a.magv = t.magv
       JOIN subjects s ON a.mamon = s.mamon
       WHERE t.tengv LIKE ? OR s.tenmon LIKE ? OR a.magv LIKE ? OR a.mamon LIKE ?
       LIMIT 10`,
      [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`]
    );
    return ok(res, { teachers, subjects, semesters, assignments });
  } catch (error) {
    return fail(res, error.message, 500);
  }
};
