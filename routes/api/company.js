const express = require("express");
const router = express.Router();
const Company = require("../../models/Company");
const User = require("../../models/User");
const auth = require("../../middleware/auth");
const { sendTemplateEmail } = require("../../lib/brevo");
const CompanyConfirmation = require("../../models/CompanyConfirmation");
const bcrypt = require("bcryptjs");

router.post("/confirm-email", async (req, res) => {
  const { email, companyName, name } = req.body;

  try {
    if (!email) {
      return res
        .status(400)
        .json({ message: "Please provide all required fields" });
    }

    const company = await Company.findOne({ email });

    if (company) {
      return res.status(200).send({
        message:
          "This email is used with another account, please contact your admin or use another email.",
      });
    }

    const emailProvider = email.split("@")[1];
    if (emailProvider === "gmail.com" || emailProvider === "yahoo.com") {
      return res.status(400).json({
        message: "You can not create with a general email provider",
      });
    }

    let existingConfirmation = await CompanyConfirmation.findOne({ email });

    // check if there's an existing confirmation and if it's not expired (assuming 15 minutes expiry)
    if (existingConfirmation) {
      return res.status(400).json({
        message:
          "A confirmation code has already been sent to this email. Please check your inbox.",
      });
    }

    const emailConfirmationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    await CompanyConfirmation.insertMany([
      {
        email,
        confirmationCode: emailConfirmationCode,
        isExpired: false,
        companyName,
      },
    ]);

    await sendTemplateEmail({
      to: email,
      name: name,
      templateId: 2, // replace with your Brevo template ID
      params: {
        user_name: name,
        confirmation_code: emailConfirmationCode,
        company_name: companyName,
      },
    });

    return res.status(200).json({
      message: `A confirmation code has been sent to ${email}. Please check your inbox.`,
      canNavigate: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred, please try again later.",
      error: error.message,
    });
  }
});

router.post("/create", async (req, res) => {
  const {
    confirmationCode,
    address,
    phone,
    domain,
    logo,
    socialMedia,
    industry,
    howWillYouUse,
    ownerName,
    ownerPassword,
    ownerUserName,
  } = req.body;
  try {
    if (!confirmationCode || !address || !phone || !domain) {
      return res
        .status(400)
        .json({ message: "Please provide all required fields" });
    }

    const confirmation = await CompanyConfirmation.findOne({
      confirmationCode,
      isExpired: false,
    });

    if (!confirmation) {
      return res
        .status(400)
        .json({ message: "Invalid or expired confirmation code" });
    }

    const existingCompany = await Company.findOne({
      email: confirmation.email,
    });

    if (existingCompany) {
      return res
        .status(400)
        .json({ message: "A company with this email already exists" });
    }

    const companyCode = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    const isUserNameTaken = await User.findOne({ userName: ownerUserName });
    if (isUserNameTaken) {
      return res.status(400).json({
        message: "This username is already taken, please choose another one.",
      });
    }

    const hasedPassword = await bcrypt.hash(ownerPassword, 10);

    const ownerUser = new User({
      name: ownerName,
      email: confirmation.email,
      passwordHash: hasedPassword,
      role: "owner",
      companyCode,
      isActive: true,
      userName: ownerUserName,
    });
    await ownerUser.save();

    const newCompany = new Company({
      companyName: confirmation.companyName,
      address,
      phone,
      email: confirmation.email,
      domain,
      logo,
      socialMedia,
      adminId: ownerUser._id,
      industry,
      howWillYouUse,
      companyCode,
      emailIsConfirmed: true,
    });

    await newCompany.save();

    await User.updateOne(
      { _id: ownerUser._id },
      { $set: { company: newCompany._id } }
    );

    await CompanyConfirmation.deleteOne({ _id: confirmation._id });

    sendTemplateEmail({
      to: confirmation.email,
      name: ownerName,
      templateId: 3,
      params: {
        user_name: ownerName,
        company_name: confirmation.companyName,
        user_email: confirmation.email,
        company_domain: domain,
        companyCode,
        phone,
        address,
      },
    });

    return res.status(200).json({
      message: `Company and owner user created successfully with a code ${companyCode}, an email with all details has been sent to ${confirmation.email}`,
      company: newCompany,
      ownerUser: {
        _id: ownerUser._id,
        name: ownerUser.name,
        email: ownerUser.email,
        role: ownerUser.role,
        userName: ownerUser.userName,
        company: newCompany._id,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred, please try again later.",
      error: error.message,
    });
  }
});

module.exports = router;
