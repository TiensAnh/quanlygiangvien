const router = require("express").Router();
const controller = require("../controllers/assignments.controller");
const { verifyToken, requireAdmin } = require("../middleware/auth.middleware");

router.get("/suggestions", verifyToken, requireAdmin, controller.suggest);
router.get("/teacher/:magv", verifyToken, controller.getByTeacher);
router.get("/semester/:mahocky", verifyToken, controller.getBySemester);
router.get("/report/load", verifyToken, controller.reportLoad);
router.get("/", verifyToken, controller.getAll);
router.get("/:id", verifyToken, controller.getById);
router.post("/", verifyToken, requireAdmin, controller.create);
router.put("/:id", verifyToken, requireAdmin, controller.update);
router.delete("/:id", verifyToken, requireAdmin, controller.remove);

module.exports = router;
