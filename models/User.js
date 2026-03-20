const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true },
    email:       { type: String, required: true, unique: true },
    password:    { type: String, required: true },
    phone:       { type: String, default: "" },
    address:     { type: String, default: "" },
    dateOfBirth: { type: String, default: "" },
    otp:         String,
    otpExpires:  Date,
    otpVerified: { type: Boolean, default: false },
    isVerified:  { type: Boolean, default: false },
    isAdmin:     { type: Boolean, default: false },
    isBlocked:    { type: Boolean, default: false },
profileImage: { type: String, default: "" },
favorites:    [{ type: mongoose.Schema.Types.ObjectId, ref: "Book" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);