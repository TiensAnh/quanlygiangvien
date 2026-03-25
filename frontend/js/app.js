const $ = (selector) => document.querySelector(selector);

const state = {
  apiBase: localStorage.getItem("apiBase") || "http://localhost:3000/api",
  token: localStorage.getItem("token") || "",
  user: JSON.parse(localStorage.getItem("user") || "null"),
  currentView: "dashboard"
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function showToast(message = "Có thông báo", type = "error") {
  const toast = $("#toast");
  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.className = `show ${type}`;

  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.className = "";
    toast.textContent = "";
  }, 3000);
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
  };

  const response = await fetch(`${state.apiBase}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    let message = data.message || "Có lỗi xảy ra";

    if (Array.isArray(data.errors) && data.errors.length) {
      message += "\n- " + data.errors.join("\n- ");
    }

    throw new Error(message);
  }

  return data;
}

function canAdmin() {
  return state.user?.role === "admin";
}

function saveAuth(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

function clearAuth() {
  state.token = "";
  state.user = null;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function renderTable(headers, rowsHtml = []) {
  return `
    <table class="data-table">
      <thead>
        <tr>
          ${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${
          rowsHtml.length
            ? rowsHtml.join("")
            : `<tr><td colspan="${headers.length}">Không có dữ liệu</td></tr>`
        }
      </tbody>
    </table>
  `;
}

function openModal(title, content) {
  const root = $("#modalRoot");
  if (!root) return;

  root.innerHTML = `
    <div class="modal-overlay" onclick="closeModal(event)">
      <div class="modal-card" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3>${escapeHtml(title)}</h3>
          <button type="button" class="icon-btn" onclick="closeModal()">×</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    </div>
  `;
}

function closeModal() {
  const root = $("#modalRoot");
  if (root) root.innerHTML = "";
}

window.closeModal = closeModal;

function updateAuthUI() {
  const authSection = $("#authSection");
  const appSection = $("#appSection");
  const currentUser = $("#currentUser");
  const adminOnlyEls = document.querySelectorAll(".admin-only");

  if (state.token && state.user) {
    authSection?.classList.add("hidden");
    appSection?.classList.remove("hidden");

    if (currentUser) {
      currentUser.textContent = `${state.user.username} - ${state.user.role}`;
    }
  } else {
    authSection?.classList.remove("hidden");
    appSection?.classList.add("hidden");
  }

  adminOnlyEls.forEach((el) => {
    if (canAdmin()) {
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  });
}

function switchView(view) {
  state.currentView = view;

  document.querySelectorAll(".view").forEach((el) => el.classList.remove("active"));
  document.querySelectorAll(".menu-item").forEach((el) => el.classList.remove("active"));

  const viewEl = document.getElementById(`${view}View`);
  const menuEl = document.querySelector(`.menu-item[data-view="${view}"]`);
  const titleEl = $("#viewTitle");

  if (viewEl) viewEl.classList.add("active");
  if (menuEl) {
    menuEl.classList.add("active");
    if (titleEl) titleEl.textContent = menuEl.textContent;
  }

  loadCurrentView();
}

async function loadDashboard() {
  const box = $("#dashboardView");
  if (!box) return;

  box.innerHTML = `
    <div class="cards">
      <div class="card">
        <h3>Xin chào</h3>
        <p>${escapeHtml(state.user?.username || "")}</p>
      </div>
      <div class="card">
        <h3>Vai trò</h3>
        <p>${escapeHtml(state.user?.role || "")}</p>
      </div>
      <div class="card">
        <h3>Trạng thái</h3>
        <p>Hệ thống đang hoạt động</p>
      </div>
    </div>
  `;
}

async function loadAccounts() {
  const table = $("#accountsTable");
  if (!table) return;

  try {
    const keyword = $("#accountKeyword")?.value.trim() || "";
    const res = await api(`/accounts?keyword=${encodeURIComponent(keyword)}`);
    const rows = res.data || [];

    table.innerHTML = renderTable(
      ["Tên tài khoản", "Vai trò", "Hành động"],
      rows.map(
        (x) => `
          <tr>
            <td>${escapeHtml(x.username || x.tentaikhoan)}</td>
            <td>${escapeHtml(x.role || x.vaitro)}</td>
            <td>
              ${
                canAdmin()
                  ? `
                    <button type="button" onclick="openAccountModalById('${escapeHtml(x.username)}')">Sửa</button>
                    <button type="button" class="danger" onclick="deleteAccount('${escapeHtml(x.username)}')">Xóa</button>
                  `
                  : "-"
              }
            </td>
          </tr>
        `
      )
    );
  } catch (error) {
    table.innerHTML = renderTable(["Tên tài khoản", "Vai trò", "Hành động"], []);
    showToast(error.message);
  }
}

async function loadTeachers() {
  const table = $("#teachersTable");
  if (!table) return;

  try {
    const keyword = $("#teacherKeyword")?.value.trim() || "";
    const res = await api(`/teachers?keyword=${encodeURIComponent(keyword)}`);
    const rows = res.data || [];

    table.innerHTML = renderTable(
      ["Mã GV", "Tên giảng viên", "Quê quán", "Ngày sinh", "Giới tính", "SĐT", "Hành động"],
      rows.map(
        (x) => `
          <tr>
            <td>${escapeHtml(x.magv)}</td>
            <td>${escapeHtml(x.tengv)}</td>
            <td>${escapeHtml(x.quequan)}</td>
            <td>${escapeHtml(formatDate(x.ngaysinh))}</td>
            <td>${escapeHtml(x.gioitinh)}</td>
            <td>${escapeHtml(x.sodienthoai)}</td>
            <td>
              ${
                canAdmin()
                  ? `
                    <button type="button" onclick="openTeacherModalById('${escapeHtml(x.magv)}')">Sửa</button>
                    <button type="button" class="danger" onclick="deleteTeacher('${escapeHtml(x.magv)}')">Xóa</button>
                  `
                  : "-"
              }
            </td>
          </tr>
        `
      )
    );
  } catch (error) {
    table.innerHTML = renderTable(
      ["Mã GV", "Tên giảng viên", "Quê quán", "Ngày sinh", "Giới tính", "SĐT", "Hành động"],
      []
    );
    showToast(error.message);
  }
}

async function loadSubjects() {
  const table = $("#subjectsTable");
  if (!table) return;

  try {
    const keyword = $("#subjectKeyword")?.value.trim() || "";
    const res = await api(`/subjects?keyword=${encodeURIComponent(keyword)}`);
    const rows = res.data || [];

    table.innerHTML = renderTable(
      ["Mã môn", "Tên môn", "Số tiết", "Số tín chỉ", "Hành động"],
      rows.map(
        (x) => `
          <tr>
            <td>${escapeHtml(x.mamon)}</td>
            <td>${escapeHtml(x.tenmon)}</td>
            <td>${escapeHtml(x.sotiet)}</td>
            <td>${escapeHtml(x.sotinchi)}</td>
            <td>
              ${
                canAdmin()
                  ? `
                    <button type="button" onclick="openSubjectModalById('${escapeHtml(x.mamon)}')">Sửa</button>
                    <button type="button" class="danger" onclick="deleteSubject('${escapeHtml(x.mamon)}')">Xóa</button>
                  `
                  : "-"
              }
            </td>
          </tr>
        `
      )
    );
  } catch (error) {
    table.innerHTML = renderTable(["Mã môn", "Tên môn", "Số tiết", "Số tín chỉ", "Hành động"], []);
    showToast(error.message);
  }
}

async function loadSemesters() {
  const table = $("#semestersTable");
  if (!table) return;

  try {
    const keyword = $("#semesterKeyword")?.value.trim() || "";
    const res = await api(`/semesters?keyword=${encodeURIComponent(keyword)}`);
    const rows = res.data || [];

    table.innerHTML = renderTable(
      ["Mã học kỳ", "Tên học kỳ", "Ngày bắt đầu", "Ngày kết thúc", "Hành động"],
      rows.map(
        (x) => `
          <tr>
            <td>${escapeHtml(x.mahocky)}</td>
            <td>${escapeHtml(x.tenhocky)}</td>
            <td>${escapeHtml(formatDate(x.ngaybatdau))}</td>
            <td>${escapeHtml(formatDate(x.ngayketthuc))}</td>
            <td>
              ${
                canAdmin()
                  ? `
                    <button type="button" onclick="openSemesterModalById('${escapeHtml(x.mahocky)}')">Sửa</button>
                    <button type="button" class="danger" onclick="deleteSemester('${escapeHtml(x.mahocky)}')">Xóa</button>
                  `
                  : "-"
              }
            </td>
          </tr>
        `
      )
    );
  } catch (error) {
    table.innerHTML = renderTable(
      ["Mã học kỳ", "Tên học kỳ", "Ngày bắt đầu", "Ngày kết thúc", "Hành động"],
      []
    );
    showToast(error.message);
  }
}

function renderAssignments(rows) {
  const table = $("#assignmentsTable");
  if (!table) return;

  table.innerHTML = renderTable(
    ["ID", "Giảng viên", "Môn học", "Học kỳ", "Ngày dạy", "Tiết", "Số tiết", "Hành động"],
    rows.map(
      (x) => `
        <tr>
          <td>${escapeHtml(x.id)}</td>
          <td>${escapeHtml(x.magv)} - ${escapeHtml(x.tengv || "")}</td>
          <td>${escapeHtml(x.mamon)} - ${escapeHtml(x.tenmon || "")}</td>
          <td>${escapeHtml(x.mahocky)} - ${escapeHtml(x.tenhocky || "")}</td>
          <td>${escapeHtml(formatDate(x.ngayday))}</td>
          <td>${escapeHtml(x.tietbatdau)} - ${escapeHtml(x.tietketthuc)}</td>
          <td>${escapeHtml(x.soTietPhanCong)}</td>
          <td>
            ${
              canAdmin()
                ? `
                  <button type="button" onclick="openAssignmentModalById('${escapeHtml(x.id)}')">Sửa</button>
                  <button type="button" class="danger" onclick="deleteAssignment('${escapeHtml(x.id)}')">Xóa</button>
                `
                : "-"
            }
          </td>
        </tr>
      `
    )
  );
}

async function loadAssignments() {
  const keyword = document.getElementById("assignmentSearch")?.value.trim() || "";
  const table = $("#assignmentsTable");
  if (!table) return;

  try {
    const res = await api(`/assignments?keyword=${encodeURIComponent(keyword)}`);
    renderAssignments(res.data || []);
  } catch (error) {
    table.innerHTML = renderTable(
      ["ID", "Giảng viên", "Môn học", "Học kỳ", "Ngày dạy", "Tiết", "Số tiết", "Hành động"],
      []
    );
    showToast(error.message);
  }
}

async function loadSearch() {
  const box = $("#searchResults");
  if (!box) return;

  box.innerHTML = `<div class="card"><p>Nhập từ khóa rồi bấm Tra cứu.</p></div>`;
}

async function loadReports() {
  const teacherTable = $("#reportsTeacherTable");
  const overviewCards = $("#overviewCards");
  const semesterTable = $("#reportsSemesterTable");

  if (!teacherTable || !overviewCards || !semesterTable) return;

  try {
    const res = await api("/assignments/report/load");
    const rows = res.data || [];

    teacherTable.innerHTML = renderTable(
      ["Học kỳ", "Mã GV", "Tên GV", "Số môn", "Tổng số tiết"],
      rows.map(
        (x) => `
          <tr>
            <td>${escapeHtml(x.tenhocky || x.mahocky)}</td>
            <td>${escapeHtml(x.magv)}</td>
            <td>${escapeHtml(x.tengv)}</td>
            <td>${escapeHtml(x.soMon)}</td>
            <td>${escapeHtml(x.tongSoTiet)}</td>
          </tr>
        `
      )
    );

    overviewCards.innerHTML = `
      <div class="card">
        <h3>Tổng số dòng báo cáo</h3>
        <p>${rows.length}</p>
      </div>
    `;

    semesterTable.innerHTML = "";
  } catch (error) {
    teacherTable.innerHTML = renderTable(
      ["Học kỳ", "Mã GV", "Tên GV", "Số môn", "Tổng số tiết"],
      []
    );
    overviewCards.innerHTML = "";
    semesterTable.innerHTML = "";
    showToast(error.message);
  }
}

async function loadCurrentView() {
  switch (state.currentView) {
    case "dashboard":
      return loadDashboard();
    case "accounts":
      return loadAccounts();
    case "teachers":
      return loadTeachers();
    case "subjects":
      return loadSubjects();
    case "semesters":
      return loadSemesters();
    case "assignments":
      return loadAssignments();
    case "search":
      return loadSearch();
    case "reports":
      return loadReports();
    default:
      return loadDashboard();
  }
}

async function openAssignmentModal(item = null) {
  if (!canAdmin()) return;

  try {
    const [teachersRes, subjectsRes, semestersRes] = await Promise.all([
      api("/teachers"),
      api("/subjects"),
      api("/semesters")
    ]);

    const teachers = teachersRes.data || [];
    const subjects = subjectsRes.data || [];
    const semesters = semestersRes.data || [];

    openModal(
      item ? "Sửa phân công" : "Thêm phân công",
      `
      <form id="assignmentForm" class="assignment-form">
        <div class="form-group full">
          <select name="magv" required>
            <option value="">-- Chọn giảng viên --</option>
            ${teachers
              .map(
                (t) => `
                  <option value="${escapeHtml(t.magv)}" ${item?.magv === t.magv ? "selected" : ""}>
                    ${escapeHtml(t.magv)} - ${escapeHtml(t.tengv)}
                  </option>
                `
              )
              .join("")}
          </select>
        </div>

        <div class="form-group full">
          <select name="mamon" required>
            <option value="">-- Chọn môn học --</option>
            ${subjects
              .map(
                (s) => `
                  <option value="${escapeHtml(s.mamon)}" ${item?.mamon === s.mamon ? "selected" : ""}>
                    ${escapeHtml(s.mamon)} - ${escapeHtml(s.tenmon)}
                  </option>
                `
              )
              .join("")}
          </select>
        </div>

        <div class="form-group full">
          <select name="mahocky" id="assignmentSemester" required>
            <option value="">-- Chọn học kỳ --</option>
            ${semesters
              .map(
                (se) => `
                  <option
                    value="${escapeHtml(se.mahocky)}"
                    data-start="${escapeHtml(formatDate(se.ngaybatdau))}"
                    data-end="${escapeHtml(formatDate(se.ngayketthuc))}"
                    ${item?.mahocky === se.mahocky ? "selected" : ""}
                  >
                    ${escapeHtml(se.mahocky)} - ${escapeHtml(se.tenhocky)}
                  </option>
                `
              )
              .join("")}
          </select>
        </div>

        <div class="form-group full">
          <input
            type="date"
            name="ngayday"
            id="assignmentDate"
            value="${escapeHtml(formatDate(item?.ngayday))}"
            required
          />
          <small id="assignmentSemesterHint" class="field-hint"></small>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <input
              type="number"
              name="tietbatdau"
              min="1"
              placeholder="Tiết bắt đầu"
              value="${escapeHtml(item?.tietbatdau || "")}"
              required
            />
          </div>

          <div class="form-group">
            <input
              type="number"
              name="tietketthuc"
              min="1"
              placeholder="Tiết kết thúc"
              value="${escapeHtml(item?.tietketthuc || "")}"
              required
            />
          </div>
        </div>
        <div style="margin-top:10px;">
          <button type="button" id="btnSuggestAssignment">
            Gợi ý phân công
          </button>
        </div>
        <div
          id="suggestionBox"
          style="
            margin-top:10px;
          "
        ></div>
        <div class="modal-actions">
          <button type="button" onclick="closeModal()">Hủy</button>
          <button type="submit" class="primary">Lưu</button>
        </div>
      </form>
      `
    );

    const semesterSelect = document.getElementById("assignmentSemester");
    const dateInput = document.getElementById("assignmentDate");
    const hint = document.getElementById("assignmentSemesterHint");

    function applySemesterRange() {
      const selected = semesterSelect?.options[semesterSelect.selectedIndex];

      if (!selected || !selected.dataset.start || !selected.dataset.end) {
        if (dateInput) {
          dateInput.min = "";
          dateInput.max = "";
        }
        if (hint) hint.textContent = "";
        return;
      }

      const start = selected.dataset.start;
      const end = selected.dataset.end;

      if (dateInput) {
        dateInput.min = start;
        dateInput.max = end;

        if (!dateInput.value || dateInput.value < start || dateInput.value > end) {
          dateInput.value = start;
        }
      }

      if (hint) {
        hint.textContent = `Ngày dạy phải nằm trong khoảng ${start} đến ${end}`;
      }
    }

    semesterSelect?.addEventListener("change", applySemesterRange);
    applySemesterRange();
    document.getElementById("btnSuggestAssignment")?.addEventListener("click", async () => {
      const form = document.getElementById("assignmentForm");
      const suggestBtn = document.getElementById("btnSuggestAssignment");

      const magv = form.elements["magv"].value;
      const mamon = form.elements["mamon"].value;
      const mahocky = form.elements["mahocky"].value;

      if (!magv || !mamon || !mahocky) {
        showToast("Chọn giảng viên, môn học, học kỳ trước");
        return;
      }

      try {
        suggestBtn.disabled = true;
        suggestBtn.textContent = "Đang gợi ý...";
        await new Promise((resolve) => setTimeout(resolve, 500));
        const res = await api(
          `/assignments/suggestions?magv=${encodeURIComponent(magv)}&mamon=${encodeURIComponent(mamon)}&mahocky=${encodeURIComponent(mahocky)}&blockSize=3&maxSuggestions=5`
        );

        const suggestions = res.data?.suggestions || [];

        if (!suggestions.length) {
          showToast("Không có gợi ý phù hợp");
          return;
        }

      const box = document.getElementById("suggestionBox");

      box.innerHTML = suggestions.map((item, index) => `
        <div style="
          border:1px solid #ddd;
          padding:8px;
          margin-bottom:6px;
          border-radius:6px;
          display:flex;
          justify-content:space-between;
          align-items:center;
        ">
          <div>
            <b>Gợi ý ${index + 1}</b><br/>
            Ngày: ${item.ngayday} <br/>
            Tiết: ${item.tietbatdau} - ${item.tietketthuc}
          </div>

          <button type="button" data-index="${index}">
            Chọn
          </button>
        </div>
      `).join("");
      box.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", () => {
          const i = btn.dataset.index;
          const s = suggestions[i];

          form.elements["ngayday"].value = s.ngayday;
          form.elements["tietbatdau"].value = s.tietbatdau;
          form.elements["tietketthuc"].value = s.tietketthuc;

          showToast("Đã chọn gợi ý", "success");
        });
      });

        showToast(
          `Gợi ý: ${first.ngayday} - tiết ${first.tietbatdau}-${first.tietketthuc}`,
          "success"
        );

      } catch (err) {
        showToast(err.message);
      } finally {
        suggestBtn.disabled = false;
        suggestBtn.textContent = "Gợi ý phân công";
      }
    });

    document.getElementById("assignmentForm").onsubmit = async (e) => {
      e.preventDefault();

      const payload = Object.fromEntries(new FormData(e.target).entries());

      try {
        if (item?.id) {
          await api(`/assignments/${item.id}`, {
            method: "PUT",
            body: JSON.stringify(payload)
          });
          showToast("Cập nhật phân công thành công", "success");
        } else {
          await api("/assignments", {
            method: "POST",
            body: JSON.stringify(payload)
          });
          showToast("Thêm phân công thành công", "success");
        }

        closeModal();
        loadAssignments();
      } catch (error) {
        showToast(error.message);
      }
    };
  } catch (error) {
    showToast(error.message);
  }
}

window.openAssignmentModal = openAssignmentModal;

async function openAssignmentModalById(id) {
  try {
    const res = await api(`/assignments/${id}`);
    await openAssignmentModal(res.data);
  } catch (error) {
    showToast(error.message);
  }
}

window.openAssignmentModalById = openAssignmentModalById;

async function deleteAssignment(id) {
  if (!confirm("Bạn có chắc muốn xóa phân công này không?")) return;

  try {
    await api(`/assignments/${id}`, { method: "DELETE" });
    showToast("Xóa phân công thành công", "success");
    loadAssignments();
  } catch (error) {
    showToast(error.message);
  }
}

window.deleteAssignment = deleteAssignment;

async function openAccountModal(item = null) {
  if (!canAdmin()) return;

  try {
    openModal(
      item ? "Sửa tài khoản" : "Thêm tài khoản",
      `
      <form id="accountForm" class="form-grid">
        <div class="form-group full">
          <label>Tên tài khoản</label>
          <input 
            type="text" 
            name="username" 
            placeholder="Tên tài khoản"
            value="${escapeHtml(item?.username || '')}"
            ${item ? "disabled" : "required"}
          />
        </div>
        
        <div class="form-group full">
          <label>Mật khẩu ${item ? "(để trống nếu không muốn đổi)" : ""}</label>
          <input 
            type="password" 
            name="password" 
            placeholder="Mật khẩu"
            ${item ? "" : "required"}
          />
        </div>

        <div class="form-group full">
          <label>Vai trò</label>
          <select name="role" required>
            <option value="giangvien" ${item?.role === "giangvien" ? "selected" : ""}>Giảng viên</option>
            <option value="admin" ${item?.role === "admin" ? "selected" : ""}>Admin</option>
          </select>
        </div>

        <div class="form-group full">
          <label>Trạng thái</label>
          <select name="status">
            <option value="1" ${item?.status ? "selected" : ""}>Kích hoạt</option>
            <option value="0" ${!item?.status ? "selected" : ""}>Vô hiệu hóa</option>
          </select>
        </div>

        <div class="modal-actions">
          <button type="button" onclick="closeModal()">Hủy</button>
          <button type="submit" class="primary">Lưu</button>
        </div>
      </form>
      `
    );

    document.getElementById("accountForm").onsubmit = async (e) => {
      e.preventDefault();

      const formData = Object.fromEntries(new FormData(e.target).entries());
      
      try {
        if (item?.username) {
          await api(`/accounts/${item.username}`, {
            method: "PUT",
            body: JSON.stringify({
              role: formData.role,
              status: formData.status === "1",
              password: formData.password || undefined
            })
          });
          showToast("Cập nhật tài khoản thành công", "success");
        } else {
          await api("/accounts", {
            method: "POST",
            body: JSON.stringify({
              username: formData.username,
              password: formData.password,
              role: formData.role,
              status: formData.status === "1"
            })
          });
          showToast("Thêm tài khoản thành công", "success");
        }

        closeModal();
        loadAccounts();
      } catch (error) {
        showToast(error.message);
      }
    };
  } catch (error) {
    showToast(error.message);
  }
}

window.openAccountModal = openAccountModal;

async function openAccountModalById(username) {
  try {
    const res = await api(`/accounts/${username}`);
    await openAccountModal(res.data);
  } catch (error) {
    showToast(error.message);
  }
}

window.openAccountModalById = openAccountModalById;

async function deleteAccount(username) {
  if (!confirm("Bạn có chắc muốn xóa tài khoản này không?")) return;

  try {
    await api(`/accounts/${username}`, { method: "DELETE" });
    showToast("Xóa tài khoản thành công", "success");
    loadAccounts();
  } catch (error) {
    showToast(error.message);
  }
}

window.deleteAccount = deleteAccount;

async function openTeacherModal(item = null) {
  if (!canAdmin()) return;

  try {
    const accountsRes = await api("/accounts");
    const accounts = accountsRes.data || [];

    openModal(
      item ? "Sửa giảng viên" : "Thêm giảng viên",
      `
      <form id="teacherForm" class="form-grid">
        <div class="form-group full">
          <label>Mã giảng viên</label>
          <input 
            type="text" 
            name="magv" 
            placeholder="Mã giảng viên"
            value="${escapeHtml(item?.magv || '')}"
            ${item ? "disabled" : "required"}
          />
        </div>

        <div class="form-group full">
          <label>Tên giảng viên</label>
          <input 
            type="text" 
            name="tengv" 
            placeholder="Tên giảng viên"
            value="${escapeHtml(item?.tengv || '')}"
            required
          />
        </div>

        <div class="form-group full">
          <label>Tài khoản</label>
          <select name="username" ${item ? "disabled" : "required"}>
            <option value="">-- Chọn tài khoản --</option>
            ${accounts
              .map(
                (a) => `
                  <option value="${escapeHtml(a.username)}" ${item?.username === a.username ? "selected" : ""}>
                    ${escapeHtml(a.username)}
                  </option>
                `
              )
              .join("")}
          </select>
        </div>

        <div class="form-group full">
          <label>Quê quán</label>
          <input 
            type="text" 
            name="quequan" 
            placeholder="Quê quán"
            value="${escapeHtml(item?.quequan || '')}"
          />
        </div>

        <div class="form-group full">
          <label>Ngày sinh</label>
          <input 
            type="date" 
            name="ngaysinh" 
            value="${escapeHtml(formatDate(item?.ngaysinh))}"
            required
          />
        </div>

        <div class="form-group full">
          <label>Giới tính</label>
          <select name="gioitinh" required>
            <option value="">-- Chọn --</option>
            <option value="Nam" ${item?.gioitinh === "Nam" ? "selected" : ""}>Nam</option>
            <option value="Nữ" ${item?.gioitinh === "Nữ" ? "selected" : ""}>Nữ</option>
            <option value="Khác" ${item?.gioitinh === "Khác" ? "selected" : ""}>Khác</option>
          </select>
        </div>

        <div class="form-group full">
          <label>Số điện thoại</label>
          <input 
            type="text" 
            name="sodienthoai" 
            placeholder="Số điện thoại"
            value="${escapeHtml(item?.sodienthoai || '')}"
            required
          />
        </div>

        <div class="modal-actions">
          <button type="button" onclick="closeModal()">Hủy</button>
          <button type="submit" class="primary">Lưu</button>
        </div>
      </form>
      `
    );

    document.getElementById("teacherForm").onsubmit = async (e) => {
      e.preventDefault();

      const formData = Object.fromEntries(new FormData(e.target).entries());
      
      try {
        if (item?.magv) {
          await api(`/teachers/${item.magv}`, {
            method: "PUT",
            body: JSON.stringify(formData)
          });
          showToast("Cập nhật giảng viên thành công", "success");
        } else {
          await api("/teachers", {
            method: "POST",
            body: JSON.stringify(formData)
          });
          showToast("Thêm giảng viên thành công", "success");
        }

        closeModal();
        loadTeachers();
      } catch (error) {
        showToast(error.message);
      }
    };
  } catch (error) {
    showToast(error.message);
  }
}

window.openTeacherModal = openTeacherModal;

async function openTeacherModalById(magv) {
  try {
    const res = await api(`/teachers/${magv}`);
    await openTeacherModal(res.data);
  } catch (error) {
    showToast(error.message);
  }
}

window.openTeacherModalById = openTeacherModalById;

async function deleteTeacher(magv) {
  if (!confirm("Bạn có chắc muốn xóa giảng viên này không?")) return;

  try {
    await api(`/teachers/${magv}`, { method: "DELETE" });
    showToast("Xóa giảng viên thành công", "success");
    loadTeachers();
  } catch (error) {
    showToast(error.message);
  }
}

window.deleteTeacher = deleteTeacher;

async function openSubjectModal(item = null) {
  if (!canAdmin()) return;

  try {
    openModal(
      item ? "Sửa môn học" : "Thêm môn học",
      `
      <form id="subjectForm" class="form-grid">
        <div class="form-group full">
          <label>Mã môn</label>
          <input 
            type="text" 
            name="mamon" 
            placeholder="Mã môn"
            value="${escapeHtml(item?.mamon || '')}"
            ${item ? "disabled" : "required"}
          />
        </div>

        <div class="form-group full">
          <label>Tên môn</label>
          <input 
            type="text" 
            name="tenmon" 
            placeholder="Tên môn"
            value="${escapeHtml(item?.tenmon || '')}"
            required
          />
        </div>

        <div class="form-group full">
          <label>Số tiết</label>
          <input 
            type="number" 
            name="sotiet" 
            min="1"
            placeholder="Số tiết"
            value="${escapeHtml(item?.sotiet || '')}"
            required
          />
        </div>

        <div class="form-group full">
          <label>Số tín chỉ</label>
          <input 
            type="number" 
            name="sotinchi" 
            min="1"
            placeholder="Số tín chỉ"
            value="${escapeHtml(item?.sotinchi || '')}"
            required
          />
        </div>

        <div class="modal-actions">
          <button type="button" onclick="closeModal()">Hủy</button>
          <button type="submit" class="primary">Lưu</button>
        </div>
      </form>
      `
    );

    document.getElementById("subjectForm").onsubmit = async (e) => {
      e.preventDefault();

      const formData = Object.fromEntries(new FormData(e.target).entries());
      
      try {
        if (item?.mamon) {
          await api(`/subjects/${item.mamon}`, {
            method: "PUT",
            body: JSON.stringify(formData)
          });
          showToast("Cập nhật môn học thành công", "success");
        } else {
          await api("/subjects", {
            method: "POST",
            body: JSON.stringify(formData)
          });
          showToast("Thêm môn học thành công", "success");
        }

        closeModal();
        loadSubjects();
      } catch (error) {
        showToast(error.message);
      }
    };
  } catch (error) {
    showToast(error.message);
  }
}

window.openSubjectModal = openSubjectModal;

async function openSubjectModalById(mamon) {
  try {
    const res = await api(`/subjects/${mamon}`);
    await openSubjectModal(res.data);
  } catch (error) {
    showToast(error.message);
  }
}

window.openSubjectModalById = openSubjectModalById;

async function deleteSubject(mamon) {
  if (!confirm("Bạn có chắc muốn xóa môn học này không?")) return;

  try {
    await api(`/subjects/${mamon}`, { method: "DELETE" });
    showToast("Xóa môn học thành công", "success");
    loadSubjects();
  } catch (error) {
    showToast(error.message);
  }
}

window.deleteSubject = deleteSubject;

async function openSemesterModal(item = null) {
  if (!canAdmin()) return;

  try {
    openModal(
      item ? "Sửa học kỳ" : "Thêm học kỳ",
      `
      <form id="semesterForm" class="form-grid">
        <div class="form-group full">
          <label>Mã học kỳ</label>
          <input 
            type="text" 
            name="mahocky" 
            placeholder="Mã học kỳ"
            value="${escapeHtml(item?.mahocky || '')}"
            ${item ? "disabled" : "required"}
          />
        </div>

        <div class="form-group full">
          <label>Tên học kỳ</label>
          <input 
            type="text" 
            name="tenhocky" 
            placeholder="Tên học kỳ"
            value="${escapeHtml(item?.tenhocky || '')}"
            required
          />
        </div>

        <div class="form-group full">
          <label>Ngày bắt đầu</label>
          <input 
            type="date" 
            name="ngaybatdau" 
            value="${escapeHtml(formatDate(item?.ngaybatdau))}"
            required
          />
        </div>

        <div class="form-group full">
          <label>Ngày kết thúc</label>
          <input 
            type="date" 
            name="ngayketthuc" 
            value="${escapeHtml(formatDate(item?.ngayketthuc))}"
            required
          />
        </div>

        <div class="modal-actions">
          <button type="button" onclick="closeModal()">Hủy</button>
          <button type="submit" class="primary">Lưu</button>
        </div>
      </form>
      `
    );

    document.getElementById("semesterForm").onsubmit = async (e) => {
      e.preventDefault();

      const formData = Object.fromEntries(new FormData(e.target).entries());
      
      try {
        if (item?.mahocky) {
          await api(`/semesters/${item.mahocky}`, {
            method: "PUT",
            body: JSON.stringify(formData)
          });
          showToast("Cập nhật học kỳ thành công", "success");
        } else {
          await api("/semesters", {
            method: "POST",
            body: JSON.stringify(formData)
          });
          showToast("Thêm học kỳ thành công", "success");
        }

        closeModal();
        loadSemesters();
      } catch (error) {
        showToast(error.message);
      }
    };
  } catch (error) {
    showToast(error.message);
  }
}

window.openSemesterModal = openSemesterModal;

async function openSemesterModalById(mahocky) {
  try {
    const res = await api(`/semesters/${mahocky}`);
    await openSemesterModal(res.data);
  } catch (error) {
    showToast(error.message);
  }
}

window.openSemesterModalById = openSemesterModalById;

async function deleteSemester(mahocky) {
  if (!confirm("Bạn có chắc muốn xóa học kỳ này không?")) return;

  try {
    await api(`/semesters/${mahocky}`, { method: "DELETE" });
    showToast("Xóa học kỳ thành công", "success");
    loadSemesters();
  } catch (error) {
    showToast(error.message);
  }
}

window.deleteSemester = deleteSemester;

async function runGlobalSearch() {
  const keyword = $("#globalKeyword")?.value.trim() || "";
  const box = $("#searchResults");
  if (!box) return;

  if (!keyword) {
    box.innerHTML = `
      <div class="card">
        <h3>Tra cứu</h3>
        <p>Vui lòng nhập từ khóa để tìm kiếm.</p>
      </div>
    `;
    return;
  }

  box.innerHTML = `
    <div class="card">
      <p>Đang tra cứu...</p>
    </div>
  `;

  try {
    const [teachersRes, subjectsRes, semestersRes, assignmentsRes] = await Promise.all([
      api(`/teachers?keyword=${encodeURIComponent(keyword)}`).catch(() => ({ data: [] })),
      api(`/subjects?keyword=${encodeURIComponent(keyword)}`).catch(() => ({ data: [] })),
      api(`/semesters?keyword=${encodeURIComponent(keyword)}`).catch(() => ({ data: [] })),
      api(`/assignments?keyword=${encodeURIComponent(keyword)}`).catch(() => ({ data: [] }))
    ]);

    const teachers = teachersRes.data || [];
    const subjects = subjectsRes.data || [];
    const semesters = semestersRes.data || [];
    const assignments = assignmentsRes.data || [];

    let html = `
      <div class="cards">
        <div class="card">
          <h3>Giảng viên</h3>
          <strong>${teachers.length}</strong>
        </div>
        <div class="card">
          <h3>Môn học</h3>
          <strong>${subjects.length}</strong>
        </div>
        <div class="card">
          <h3>Học kỳ</h3>
          <strong>${semesters.length}</strong>
        </div>
        <div class="card">
          <h3>Phân công</h3>
          <strong>${assignments.length}</strong>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px;">
        <h3>Kết quả tra cứu cho: "${escapeHtml(keyword)}"</h3>
      </div>
    `;

    if (teachers.length > 0) {
      html += `
        <div class="card" style="margin-bottom:16px;">
          <h3>Giảng viên liên quan</h3>
          ${renderTable(
            ["Mã GV", "Tên giảng viên", "Quê quán", "Ngày sinh", "Giới tính", "SĐT"],
            teachers.map(
              (x) => `
                <tr>
                  <td>${escapeHtml(x.magv)}</td>
                  <td>${escapeHtml(x.tengv)}</td>
                  <td>${escapeHtml(x.quequan || "")}</td>
                  <td>${escapeHtml(formatDate(x.ngaysinh))}</td>
                  <td>${escapeHtml(x.gioitinh || "")}</td>
                  <td>${escapeHtml(x.sodienthoai || "")}</td>
                </tr>
              `
            )
          )}
        </div>
      `;
    }

    if (subjects.length > 0) {
      html += `
        <div class="card" style="margin-bottom:16px;">
          <h3>Môn học liên quan</h3>
          ${renderTable(
            ["Mã môn", "Tên môn", "Số tiết"],
            subjects.map(
              (x) => `
                <tr>
                  <td>${escapeHtml(x.mamon)}</td>
                  <td>${escapeHtml(x.tenmon)}</td>
                  <td>${escapeHtml(x.sotiet)}</td>
                </tr>
              `
            )
          )}
        </div>
      `;
    }

    if (semesters.length > 0) {
      html += `
        <div class="card" style="margin-bottom:16px;">
          <h3>Học kỳ liên quan</h3>
          ${renderTable(
            ["Mã học kỳ", "Tên học kỳ", "Ngày bắt đầu", "Ngày kết thúc"],
            semesters.map(
              (x) => `
                <tr>
                  <td>${escapeHtml(x.mahocky)}</td>
                  <td>${escapeHtml(x.tenhocky)}</td>
                  <td>${escapeHtml(formatDate(x.ngaybatdau))}</td>
                  <td>${escapeHtml(formatDate(x.ngayketthuc))}</td>
                </tr>
              `
            )
          )}
        </div>
      `;
    }

    if (assignments.length > 0) {
      html += `
        <div class="card">
          <h3>Phân công liên quan</h3>
          ${renderTable(
            ["ID", "Giảng viên", "Môn học", "Học kỳ", "Ngày dạy", "Tiết", "Số tiết"],
            assignments.map(
              (x) => `
                <tr>
                  <td>${escapeHtml(x.id)}</td>
                  <td>${escapeHtml(x.magv)} - ${escapeHtml(x.tengv || "")}</td>
                  <td>${escapeHtml(x.mamon)} - ${escapeHtml(x.tenmon || "")}</td>
                  <td>${escapeHtml(x.mahocky)} - ${escapeHtml(x.tenhocky || "")}</td>
                  <td>${escapeHtml(formatDate(x.ngayday))}</td>
                  <td>${escapeHtml(x.tietbatdau)} - ${escapeHtml(x.tietketthuc)}</td>
                  <td>${escapeHtml(x.soTietPhanCong || "")}</td>
                </tr>
              `
            )
          )}
        </div>
      `;
    }

    if (
      teachers.length === 0 &&
      subjects.length === 0 &&
      semesters.length === 0 &&
      assignments.length === 0
    ) {
      html += `
        <div class="card">
          <p>Không tìm thấy kết quả nào phù hợp.</p>
        </div>
      `;
    }

    box.innerHTML = html;
  } catch (error) {
    box.innerHTML = `
      <div class="card">
        <h3>Lỗi tra cứu</h3>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

async function handleLogin(e) {
  e.preventDefault();

  const formData = Object.fromEntries(new FormData(e.target).entries());

  try {
    const res = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify(formData)
    });

    saveAuth(res.data.token, res.data.user);
    updateAuthUI();
    switchView("dashboard");
    showToast("Đăng nhập thành công", "success");
  } catch (error) {
    showToast(error.message);
  }
}

async function handleRegister(e) {
  e.preventDefault();

  const formData = Object.fromEntries(new FormData(e.target).entries());

  try {
    await api("/auth/register", {
      method: "POST",
      body: JSON.stringify(formData)
    });

    showToast("Đăng ký thành công", "success");
    e.target.reset();

    const loginTabButton = document.querySelector('[data-tab="loginTab"]');
    if (loginTabButton) loginTabButton.click();
  } catch (error) {
    showToast(error.message);
  }
}

function bindTabEvents() {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((x) => x.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(btn.dataset.tab)?.classList.add("active");
    });
  });
}

function bindMenuEvents() {
  document.querySelectorAll(".menu-item").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });
}

function bindEvents() {
  const apiBaseInput = $("#apiBaseInput");
  if (apiBaseInput) apiBaseInput.value = state.apiBase;

  $("#saveApiBase")?.addEventListener("click", () => {
    state.apiBase = $("#apiBaseInput")?.value.trim() || "http://localhost:3000/api";
    localStorage.setItem("apiBase", state.apiBase);
    showToast("Đã lưu API URL", "success");
  });

  $("#loginForm")?.addEventListener("submit", handleLogin);
  $("#registerForm")?.addEventListener("submit", handleRegister);

  $("#logoutBtn")?.addEventListener("click", () => {
    clearAuth();
    updateAuthUI();
    showToast("Đã đăng xuất", "success");
  });

  bindTabEvents();
  bindMenuEvents();

  $("#reloadAccounts")?.addEventListener("click", loadAccounts);
  $("#reloadTeachers")?.addEventListener("click", loadTeachers);
  $("#reloadSubjects")?.addEventListener("click", loadSubjects);
  $("#reloadSemesters")?.addEventListener("click", loadSemesters);
  $("#reloadReports")?.addEventListener("click", loadReports);
  $("#runSearch")?.addEventListener("click", runGlobalSearch);
  $("#openAccountModal")?.addEventListener("click", () => openAccountModal());
  $("#openTeacherModal")?.addEventListener("click", () => openTeacherModal());
  $("#openSubjectModal")?.addEventListener("click", () => openSubjectModal());
  $("#openSemesterModal")?.addEventListener("click", () => openSemesterModal());
  $("#openAssignmentModal")?.addEventListener("click", () => openAssignmentModal());

  const assignmentSearch = document.getElementById("assignmentSearch");
  if (assignmentSearch) {
    assignmentSearch.addEventListener("input", () => {
      if (state.currentView === "assignments") {
        loadAssignments();
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  updateAuthUI();

  if (state.token && state.user) {
    switchView("dashboard");
  }
});