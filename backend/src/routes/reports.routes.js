const router = require("express").Router();
const controller = require("../controllers/reports.controller");
const { verifyToken } = require("../middleware/auth.middleware");

router.get("/overview", verifyToken, controller.overview);
router.get("/by-teacher", verifyToken, controller.byTeacher);
router.get("/by-semester", verifyToken, controller.bySemester);

module.exports = router;
