const app = require("./app");
const db = require("./config/db");

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await db.query("SELECT 1");
    console.log("Kết nối database thành công");
    app.listen(PORT, () => {
      console.log(`Server đang chạy tại http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Không thể kết nối database:", error.message);
    process.exit(1);
  }
})();
