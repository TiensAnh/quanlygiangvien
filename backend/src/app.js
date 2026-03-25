const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API Phần mềm quản lý giảng viên đang chạy"
  });
});

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/accounts", require("./routes/accounts.routes"));
app.use("/api/teachers", require("./routes/teachers.routes"));
app.use("/api/subjects", require("./routes/subjects.routes"));
app.use("/api/semesters", require("./routes/semesters.routes"));
app.use("/api/assignments", require("./routes/assignments.routes"));
app.use("/api/reports", require("./routes/reports.routes"));
app.use("/api/search", require("./routes/search.routes"));

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Không tìm thấy endpoint" });
});

module.exports = app;
