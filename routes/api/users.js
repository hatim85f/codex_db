const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const User = require("../../models/User");
const { check, validationResult } = require("express-validator");
const auth = require("../../middleware/auth");

// @route   GET api/users
router.get("/", (req, res) => {
  return res.status(200).send({ message: "Users route is working" });
});

module.exports = router;
