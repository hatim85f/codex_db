const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PushTokenSchema = new Schema(
  {
    token: { type: String, required: true },
    device: {
      type: String,
      enum: ["ios", "android", "web"],
      default: undefined,
    },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserSchema = Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "company",
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    userName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["owner", "manager", "agent", "viewer", "finance", "user", "admin"],
      default: "user",
      index: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    isActive: { type: Boolean, default: true },
    pushTokens: { type: [PushTokenSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

module.exports = User = mongoose.model("user", UserSchema);
