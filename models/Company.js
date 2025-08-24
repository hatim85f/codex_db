const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CompanySchema = Schema(
  {
    companyName: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    domain: {
      type: String,
      required: true,
      unique: true,
    },
    logo: {
      type: String,
      required: false,
    },
    socialMedia: {
      facebook: { type: String, required: false },
      tiktok: { type: String, required: false },
      linkedin: { type: String, required: false },
      instagram: { type: String, required: false },
      twitter: { type: String, required: false },
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    industry: {
      type: String,
      required: false,
    },
    howWillYouUse: {
      type: String,
      required: false,
    },
    companyCode: {
      type: String,
      required: true,
      unique: true,
    },
    emailIsConfirmed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = Company = mongoose.model("company", CompanySchema);
