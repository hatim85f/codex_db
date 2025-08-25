const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const User = require("../../models/User");
const { check, validationResult } = require("express-validator");
const auth = require("../../middleware/auth");

// @route   GET api/users
router.get("/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findOne({ _id: userId }).select("-passwordHash");

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ error: "Error!", message: "Server error" });
  }
});

module.exports = router;
