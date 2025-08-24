const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CompanyConfirmationSchema = Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    confirmationCode: {
      type: String,
      required: true,
    },
    isExpired: {
      type: Boolean,
      default: false,
    },
    companyName: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = CompanyConfirmation = mongoose.model(
  "companyConfirmation",
  CompanyConfirmationSchema
);
