const express = require("express");
const { body } = require("express-validator");
const { register, login } = require("../../controllers/authController");

const router = express.Router();

router.post("/register", register);

router.post("/login", login);

module.exports = router;
