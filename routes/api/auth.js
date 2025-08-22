const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const User = require("../../models/User");
const { check, validationResult } = require("express-validator");
const auth = require("../../middleware/auth");
const PasswordReset = require("../../models/PasswordReset");

const MAIL_API_KEY = process.env.MAIL_API_KEY;

// @route   GET api/users
router.get("/", (req, res) => {
  return res.status(200).send({ message: "Auth route is working" });
});

router.post("/register", auth, async (req, res) => {
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
  const userByUserName = await User.findOne({ userName });
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

// @route   POST api/auth/login
router.post(
  "/login",
  [
    check("userName", "Username is required").not().isEmpty(),
    check("password", "Password is required").not().isEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userName, password } = req.body;

    try {
      const user = await User.findOne({ userName }).select("+passwordHash");
      if (!user) {
        return res
          .status(400)
          .json({ message: "Invalid Username or Password" });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "Invalid Username or Password" });
      }

      const token = jwt.sign({ id: user._id }, config.get("jwtSecret"), {});

      await User.updateOne(
        { _id: user._id },
        { $set: { lastLogin: Date.now() } }
      );

      res.status(200).json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          userName: user.userName,
          role: user.role,
        },
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

// @router POST
// request password reset random number
router.post("/request-reset", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const resetNumber = Math.floor(100000 + Math.random() * 900000).toString();
    const passwordReset = new PasswordReset({
      userId: user._id,
      resetNumber,
    });
    await passwordReset.save();
    // Here you would typically send the resetNumber to the user's email

    sgMail.setApiKey(MAIL_API_KEY);

    const msg = {
      to: email,
      from: "info@codex-fze.com",
      templateId: "d-ab6ab1f201b84ae1aedf1beb97fecca2",
      dynamicTemplateData: {
        user_name: user.name,
        reset_number: resetNumber,
      },
    };

    sgMail.send(msg);

    res.status(200).json({
      message:
        "Password reset number generated has been sent to your registered Email ID, ",
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send(err.message);
  }
});

module.exports = router;
