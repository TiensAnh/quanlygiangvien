const router = require("express").Router();
const controller = require("../controllers/accounts.controller");
const { verifyToken, requireAdmin } = require("../middleware/auth.middleware");

router.use(verifyToken, requireAdmin);
router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

module.exports = router;
