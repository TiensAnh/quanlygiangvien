const router = require("express").Router();
const controller = require("../controllers/auth.controller");
const { verifyToken } = require("../middleware/auth.middleware");

router.post("/register", controller.register);
router.post("/login", controller.login);
router.get("/me", verifyToken, controller.me);

module.exports = router;
