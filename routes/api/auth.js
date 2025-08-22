const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");
const User = require("../../models/User");
const { check, validationResult } = require("express-validator");
const auth = require("../../middleware/auth");
const PasswordReset = require("../../models/PasswordReset");
const { sendTemplateEmail } = require("../../lib/brevo");
const isAdmin = require("../../middleware/isAdmin");

// @route   GET api/users
router.get("/", (req, res) => {
  return res.status(200).send({ message: "Auth route is working" });
});

router.post("/register", auth, isAdmin, async (req, res) => {
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

    // check if the same user requested a reset number in the last 5 minutes
    const recentReset = await PasswordReset.findOne({
      userId: user._id,
      isExpired: false,
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
    });

    // if a recent reset exists, do not allow another request
    // this prevents spamming the reset request
    if (recentReset) {
      return res.status(400).json({
        message:
          "A password reset request has already been made recently. Please wait before requesting a new one.",
      });
    }

    const resetNumber = Math.floor(100000 + Math.random() * 900000).toString();

    const passwordReset = new PasswordReset({
      userId: user._id,
      resetNumber,
    });
    await passwordReset.save();
    // Here you would typically send the resetNumber to the user's email

    await sendTemplateEmail({
      to: user.email,
      name: user.name,
      templateId: 1, // replace with your Brevo template ID
      params: {
        user_name: user.name,
        reset_code: resetNumber,
      },
    });

    res.status(200).json({
      message:
        "Password reset number generated has been sent to your registered Email ID, it will valid for 5 minutes.",
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

//@eouter PUT
// changing password using the reset number and checking if it is valid
router.put("/reset-password", async (req, res) => {
  const { email, resetNumber, newPassword } = req.body;

  if (!email || !resetNumber || !newPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const passwordReset = await PasswordReset.findOne({
      userId: user._id,
      resetNumber,
      isExpired: false,
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // valid for 5 minutes
    });

    if (!passwordReset) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset number" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    await user.save();

    // Mark the reset number as expired
    await PasswordReset.deleteOne({ _id: passwordReset._id });

    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

router.put("/change-password/:id", auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const { id } = req.params;

  // basic validation
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  // authorization: self or admin/manager
  const isSelf = String(req.user.id) === String(id);
  const adminRoles = new Set(["owner", "manager", "admin"]);
  const isAdminLike = adminRoles.has(req.user.role);
  if (!isSelf && !isAdminLike) {
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    // if admin is changing someone else's password, you may choose to skip currentPassword check.
    // Here we enforce it unless requester is admin-like and NOT self:
    const user = await User.findOne({ _id: id }).select("+passwordHash");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (isSelf || !isAdminLike) {
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok)
        return res.status(400).json({ message: "Old password is incorrect" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res
      .status(200)
      .json({ message: "Password has been changed successfully" });
  } catch (error) {
    console.error("change-password error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

router.delete("/delete-user/:id", auth, async (req, res) => {
  try {
    const userId = req.params.id;
    await User.deleteOne({ _id: userId });
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
