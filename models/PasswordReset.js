const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PasswordResetSchema = Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    resetNumber: {
      type: String,
      required: true,
    },
    isExpired: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = PasswordReset = mongoose.model(
  "passwordReset",
  PasswordResetSchema
);
