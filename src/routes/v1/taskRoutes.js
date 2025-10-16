const express = require("express");
const auth = require("../../middleware/auth");
const controller = require("../../controllers/taskController");

const router = express.Router();
router.use(auth);

router.post("/", controller.createTask);
router.get("/", controller.getTasks);
router.put("/:id", controller.updateTask);
router.delete("/:id", controller.deleteTask);
router.get("/getCount/:id", controller.getCount);

module.exports = router;
