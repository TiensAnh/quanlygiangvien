const db = require("../config/db");
const { ok, fail } = require("../utils/response");
const { validateRequired } = require("../utils/validators");

function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateVN(date) {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const y = d.getFullYear();
  return `${day}/${m}/${y}`;
}

function rangesOverlap(start1, end1, start2, end2) {
  return Number(start1) <= Number(end2) && Number(end1) >= Number(start2);
}

async function validateAssignment(payload, currentId = null) {
  const { magv, mamon, mahocky, ngayday, tietbatdau, tietketthuc } = payload;
  const errors = [];

  const startPeriod = Number(tietbatdau);
  const endPeriod = Number(tietketthuc);

  if (!Number.isInteger(startPeriod) || !Number.isInteger(endPeriod)) {
    errors.push("Tiết bắt đầu và tiết kết thúc phải là số nguyên");
    return errors;
  }

  if (startPeriod <= 0 || endPeriod <= 0) {
    errors.push("Tiết bắt đầu và tiết kết thúc phải lớn hơn 0");
    return errors;
  }

  if (startPeriod > endPeriod) {
    errors.push("Không cho phép tiết bắt đầu lớn hơn tiết kết thúc");
    return errors;
  }

  const [[teacher]] = await db.query(
    "SELECT * FROM teachers WHERE magv = ?",
    [magv]
  );
  if (!teacher) errors.push("Giảng viên không tồn tại");

  const [[subject]] = await db.query(
    "SELECT * FROM subjects WHERE mamon = ?",
    [mamon]
  );
  if (!subject) errors.push("Môn học không tồn tại");

  const [[semester]] = await db.query(
    "SELECT * FROM semesters WHERE mahocky = ?",
    [mahocky]
  );
  if (!semester) errors.push("Học kỳ không tồn tại");

  if (errors.length) return errors;

  const semesterStart = formatDate(semester.ngaybatdau);
  const semesterEnd = formatDate(semester.ngayketthuc);
  const teachingDate = String(ngayday).slice(0, 10);

  if (teachingDate < semesterStart || teachingDate > semesterEnd) {
    errors.push(
      `Ngày ${formatDateVN(teachingDate)} không thuộc học kỳ ${semester.mahocky} (từ ${formatDateVN(semesterStart)} đến ${formatDateVN(semesterEnd)})`
    );
  }

  const [distinctSubjectCountRows] = await db.query(
    `SELECT COUNT(DISTINCT mamon) AS total
     FROM assignments
     WHERE magv = ? AND mahocky = ? ${currentId ? "AND id <> ?" : ""}`,
    currentId ? [magv, mahocky, currentId] : [magv, mahocky]
  );
  const distinctSubjectCount = Number(distinctSubjectCountRows[0].total || 0);

  const [sameSubjectRows] = await db.query(
    `SELECT id
     FROM assignments
     WHERE magv = ? AND mahocky = ? AND mamon = ? ${currentId ? "AND id <> ?" : ""}`,
    currentId ? [magv, mahocky, mamon, currentId] : [magv, mahocky, mamon]
  );

  const isNewSubjectForTeacherInSemester = sameSubjectRows.length === 0;
  if (isNewSubjectForTeacherInSemester && distinctSubjectCount >= 5) {
    errors.push("Một giảng viên chỉ được phân công tối đa 5 môn học trong một học kỳ");
  }

  const [sameDayRows] = await db.query(
    `SELECT id, mamon, ngayday, tietbatdau, tietketthuc
     FROM assignments
     WHERE magv = ? AND ngayday = ? ${currentId ? "AND id <> ?" : ""}`,
    currentId ? [magv, teachingDate, currentId] : [magv, teachingDate]
  );

  const conflict = sameDayRows.find((row) =>
    rangesOverlap(startPeriod, endPeriod, row.tietbatdau, row.tietketthuc)
  );

  if (conflict) {
    errors.push(
      `Giảng viên bị trùng lịch ngày ${formatDateVN(teachingDate)} ở tiết ${conflict.tietbatdau}-${conflict.tietketthuc}`
    );
  }

  const assignedPeriods = endPeriod - startPeriod + 1;
  if (assignedPeriods <= 0) {
    errors.push("Khoảng tiết không hợp lệ");
  } else if (assignedPeriods > Number(subject.sotiet)) {
    errors.push("Số tiết của một lần phân công không được lớn hơn tổng số tiết của môn học");
  }

  const [sumRows] = await db.query(
    `SELECT COALESCE(SUM(tietketthuc - tietbatdau + 1), 0) AS total
     FROM assignments
     WHERE mamon = ? AND mahocky = ? ${currentId ? "AND id <> ?" : ""}`,
    currentId ? [mamon, mahocky, currentId] : [mamon, mahocky]
  );
  const used = Number(sumRows[0].total || 0);

  if (used + assignedPeriods > Number(subject.sotiet)) {
    errors.push(
      `Môn ${subject.mamon} - ${subject.tenmon} chỉ còn ${Math.max(
        Number(subject.sotiet) - used,
        0
      )} tiết có thể phân công trong học kỳ này`
    );
  }

  return errors;
}

exports.getAll = async (req, res) => {
  try {
    const { keyword = "" } = req.query;

    const [rows] = await db.query(
      `SELECT a.*, t.tengv, s.tenmon, se.tenhocky,
              (a.tietketthuc - a.tietbatdau + 1) AS soTietPhanCong
       FROM assignments a
       JOIN teachers t ON a.magv = t.magv
       JOIN subjects s ON a.mamon = s.mamon
       JOIN semesters se ON a.mahocky = se.mahocky
       WHERE (
         a.magv LIKE ?
         OR t.tengv LIKE ?
         OR a.mamon LIKE ?
         OR s.tenmon LIKE ?
         OR a.mahocky LIKE ?
         OR se.tenhocky LIKE ?
         OR DATE_FORMAT(a.ngayday, '%Y-%m-%d') LIKE ?
       )
       ORDER BY a.ngayday, a.tietbatdau`,
      [
        `%${keyword}%`,
        `%${keyword}%`,
        `%${keyword}%`,
        `%${keyword}%`,
        `%${keyword}%`,
        `%${keyword}%`,
        `%${keyword}%`
      ]
    );

    return ok(res, rows);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*, t.tengv, s.tenmon, se.tenhocky
       FROM assignments a
       JOIN teachers t ON a.magv = t.magv
       JOIN subjects s ON a.mamon = s.mamon
       JOIN semesters se ON a.mahocky = se.mahocky
       WHERE a.id = ?`,
      [req.params.id]
    );

    if (!rows.length) return fail(res, "Không tìm thấy phân công", 404);
    return ok(res, rows[0]);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.create = async (req, res) => {
  try {
    const { magv, mamon, mahocky, ngayday, tietbatdau, tietketthuc } = req.body;

    const errors = validateRequired(
      { magv, mamon, mahocky, ngayday, tietbatdau, tietketthuc },
      {
        magv: "Mã giảng viên",
        mamon: "Mã môn học",
        mahocky: "Mã học kỳ",
        ngayday: "Ngày dạy",
        tietbatdau: "Tiết bắt đầu",
        tietketthuc: "Tiết kết thúc"
      }
    );

    if (errors.length) return fail(res, "Dữ liệu không hợp lệ", 400, errors);

    const ruleErrors = await validateAssignment(req.body);
    if (ruleErrors.length) {
      return fail(res, "Vi phạm nghiệp vụ phân công", 400, ruleErrors);
    }

    const [result] = await db.query(
      `INSERT INTO assignments (magv, mamon, mahocky, ngayday, tietbatdau, tietketthuc)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [magv, mamon, mahocky, String(ngayday).slice(0, 10), Number(tietbatdau), Number(tietketthuc)]
    );

    const [rows] = await db.query(
      `SELECT a.*, t.tengv, s.tenmon, se.tenhocky,
              (a.tietketthuc - a.tietbatdau + 1) AS soTietPhanCong
       FROM assignments a
       JOIN teachers t ON a.magv = t.magv
       JOIN subjects s ON a.mamon = s.mamon
       JOIN semesters se ON a.mahocky = se.mahocky
       WHERE a.id = ?`,
      [result.insertId]
    );

    return ok(res, rows[0], "Tạo phân công thành công", 201);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.update = async (req, res) => {
  try {
    const id = req.params.id;

    const [existRows] = await db.query(
      "SELECT * FROM assignments WHERE id = ?",
      [id]
    );
    if (!existRows.length) return fail(res, "Không tìm thấy phân công", 404);

    const merged = { ...existRows[0], ...req.body };
    if (merged.ngayday) merged.ngayday = String(merged.ngayday).slice(0, 10);

    const ruleErrors = await validateAssignment(merged, id);
    if (ruleErrors.length) {
      return fail(res, "Vi phạm nghiệp vụ phân công", 400, ruleErrors);
    }

    await db.query(
      `UPDATE assignments
       SET magv = ?, mamon = ?, mahocky = ?, ngayday = ?, tietbatdau = ?, tietketthuc = ?
       WHERE id = ?`,
      [
        merged.magv,
        merged.mamon,
        merged.mahocky,
        merged.ngayday,
        Number(merged.tietbatdau),
        Number(merged.tietketthuc),
        id
      ]
    );

    const [rows] = await db.query(
      `SELECT a.*, t.tengv, s.tenmon, se.tenhocky,
              (a.tietketthuc - a.tietbatdau + 1) AS soTietPhanCong
       FROM assignments a
       JOIN teachers t ON a.magv = t.magv
       JOIN subjects s ON a.mamon = s.mamon
       JOIN semesters se ON a.mahocky = se.mahocky
       WHERE a.id = ?`,
      [id]
    );

    return ok(res, rows[0], "Cập nhật phân công thành công");
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.remove = async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM assignments WHERE id = ?",
      [req.params.id]
    );

    if (!result.affectedRows) {
      return fail(res, "Không tìm thấy phân công", 404);
    }

    return ok(res, null, "Xóa phân công thành công");
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.getByTeacher = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*, s.tenmon, se.tenhocky,
              (a.tietketthuc - a.tietbatdau + 1) AS soTietPhanCong
       FROM assignments a
       JOIN subjects s ON a.mamon = s.mamon
       JOIN semesters se ON a.mahocky = se.mahocky
       WHERE a.magv = ?
       ORDER BY a.ngayday, a.tietbatdau`,
      [req.params.magv]
    );

    return ok(res, rows);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.getBySemester = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*, t.tengv, s.tenmon,
              (a.tietketthuc - a.tietbatdau + 1) AS soTietPhanCong
       FROM assignments a
       JOIN teachers t ON a.magv = t.magv
       JOIN subjects s ON a.mamon = s.mamon
       WHERE a.mahocky = ?
       ORDER BY a.ngayday, a.tietbatdau`,
      [req.params.mahocky]
    );

    return ok(res, rows);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};

exports.reportLoad = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.mahocky, se.tenhocky, a.magv, t.tengv,
              COUNT(DISTINCT a.mamon) AS soMon,
              SUM(a.tietketthuc - a.tietbatdau + 1) AS tongSoTiet
       FROM assignments a
       JOIN teachers t ON a.magv = t.magv
       JOIN semesters se ON a.mahocky = se.mahocky
       GROUP BY a.mahocky, se.tenhocky, a.magv, t.tengv
       ORDER BY a.mahocky, t.tengv`
    );

    return ok(res, rows);
  } catch (error) {
    return fail(res, error.message, 500);
  }
};
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${y}-${m}-${day}`;
}

function getDateRange(startDate, endDate) {
  const result = [];
  let current = formatDate(startDate);
  const end = formatDate(endDate);

  while (current <= end) {
    result.push(current);
    current = addDays(current, 1);
  }

  return result;
}

function buildFreeSlots(dayAssignments, blockSize = 3, minPeriod = 1, maxPeriod = 10) {
  const slots = [];

  for (let start = minPeriod; start <= maxPeriod; start++) {
    const end = start + blockSize - 1;
    if (end > maxPeriod) break;

    const conflict = dayAssignments.some((item) =>
      rangesOverlap(start, end, item.tietbatdau, item.tietketthuc)
    );

    if (!conflict) {
      slots.push({
        tietbatdau: start,
        tietketthuc: end,
        soTiet: blockSize
      });
    }
  }

  return slots;
}
exports.suggest = async (req, res) => {
  try {
    const { magv, mamon, mahocky } = req.query;
    const blockSize = Number(req.query.blockSize || 3);
    const maxSuggestions = Number(req.query.maxSuggestions || 5);

    if (!magv || !mamon || !mahocky) {
      return fail(res, "Thiếu magv, mamon hoặc mahocky", 400);
    }

    if (!Number.isInteger(blockSize) || blockSize <= 0) {
      return fail(res, "blockSize phải là số nguyên dương", 400);
    }

    const [[teacher]] = await db.query(
      "SELECT magv, tengv FROM teachers WHERE magv = ?",
      [magv]
    );
    if (!teacher) {
      return fail(res, "Giảng viên không tồn tại", 404);
    }

    const [[subject]] = await db.query(
      "SELECT mamon, tenmon, sotiet FROM subjects WHERE mamon = ?",
      [mamon]
    );
    if (!subject) {
      return fail(res, "Môn học không tồn tại", 404);
    }

    const [[semester]] = await db.query(
      "SELECT mahocky, tenhocky, ngaybatdau, ngayketthuc FROM semesters WHERE mahocky = ?",
      [mahocky]
    );
    if (!semester) {
      return fail(res, "Học kỳ không tồn tại", 404);
    }

    const [countRows] = await db.query(
      `SELECT COUNT(DISTINCT mamon) AS totalSubjects
       FROM assignments
       WHERE magv = ? AND mahocky = ?`,
      [magv, mahocky]
    );

    const totalSubjects = Number(countRows[0]?.totalSubjects || 0);

    const [sameSubjectRows] = await db.query(
      `SELECT id
       FROM assignments
       WHERE magv = ? AND mamon = ? AND mahocky = ?
       LIMIT 1`,
      [magv, mamon, mahocky]
    );

    const isNewSubjectForTeacher = sameSubjectRows.length === 0;

    if (isNewSubjectForTeacher && totalSubjects >= 5) {
      return fail(res, "Giảng viên đã đủ 5 môn trong học kỳ này", 400);
    }

    const [usedRows] = await db.query(
      `SELECT COALESCE(SUM(tietketthuc - tietbatdau + 1), 0) AS usedPeriods
       FROM assignments
       WHERE mamon = ? AND mahocky = ?`,
      [mamon, mahocky]
    );

    const usedPeriods = Number(usedRows[0]?.usedPeriods || 0);
    const totalPeriods = Number(subject.sotiet || 0);
    const remainingPeriods = totalPeriods - usedPeriods;

    if (remainingPeriods <= 0) {
      return fail(res, "Môn học này đã được phân công đủ số tiết trong học kỳ", 400);
    }

    const realBlockSize = Math.min(blockSize, remainingPeriods);

    const [assignmentRows] = await db.query(
      `SELECT ngayday, tietbatdau, tietketthuc
       FROM assignments
       WHERE magv = ? AND mahocky = ?
       ORDER BY ngayday, tietbatdau`,
      [magv, mahocky]
    );

    const allDates = getDateRange(semester.ngaybatdau, semester.ngayketthuc);
    const suggestions = [];

    for (const date of allDates) {
      const dayAssignments = assignmentRows.filter(
        (row) => formatDate(row.ngayday) === date
      );

      const freeSlots = buildFreeSlots(dayAssignments, realBlockSize, 1, 10);

      for (const slot of freeSlots) {
        suggestions.push({
          ngayday: date,
          tietbatdau: slot.tietbatdau,
          tietketthuc: slot.tietketthuc,
          soTiet: slot.soTiet
        });

        if (suggestions.length >= maxSuggestions) break;
      }

      if (suggestions.length >= maxSuggestions) break;
    }

    return ok(
      res,
      {
        teacher,
        subject,
        semester: {
          mahocky: semester.mahocky,
          tenhocky: semester.tenhocky,
          ngaybatdau: formatDate(semester.ngaybatdau),
          ngayketthuc: formatDate(semester.ngayketthuc)
        },
        remainingPeriods,
        blockSize: realBlockSize,
        suggestions
      },
      "Lấy gợi ý phân công thành công"
    );
  } catch (error) {
    return fail(res, error.message || "Lỗi server", 500);
  }
};