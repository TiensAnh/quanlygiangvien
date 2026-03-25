const router = require("express").Router();
const controller = require("../controllers/reports.controller");
const { verifyToken } = require("../middleware/auth.middleware");

router.get("/", verifyToken, controller.globalSearch);

module.exports = router;
