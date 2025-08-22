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
  return res.status(200).send({ message: "Auth route is working" });
});

router.post("/register", async (req, res) => {
  const { name, email, password, userName, role } = req.body;

  // Simple validation
  if (!name || !email || !password || !userName) {
    return res.status(400).json({ message: "Please enter all fields" });
  }

  const userByEmail = await User.findOne({ email });
  if (userByEmail) {
    return res.status(400).json({ message: "Email already exists" });
  }

  // check if email is not unique
  const userByUserName = User.findOne({ userName });
  if (userByUserName)
    return res.status(400).json({ message: "UserName already exists" });

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = new User({
    name,
    email,
    passwordHash,
    userName,
    role,
  });

  const userToken = jwt.sign({ id: newUser._id }, config.get("jwtSecret"), {});

  await User.insertMany(newUser);
  res.status(200).send({
    message: "User registered successfully",
    user: newUser,
    token: userToken,
  });
});

module.exports = router;
