const router = require("express").Router();
const controller = require("../controllers/teachers.controller");
const { verifyToken, requireAdmin } = require("../middleware/auth.middleware");

router.get("/search", verifyToken, controller.search);
router.get("/", verifyToken, controller.getAll);
router.get("/:id", verifyToken, controller.getById);
router.post("/", verifyToken, requireAdmin, controller.create);
router.put("/:id", verifyToken, requireAdmin, controller.update);
router.delete("/:id", verifyToken, requireAdmin, controller.remove);

module.exports = router;
