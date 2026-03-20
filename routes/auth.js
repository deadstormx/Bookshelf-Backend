const express = require("express");
const {
  sendOtp,
  verifyOtp,
  registerUser,
  loginUser,
  forgotPassword,
  verifyForgotOtp,
  resetPassword,
} = require("../controllers/authController");

const router = express.Router();

router.post("/send-otp",                sendOtp);         // Step 1: email → send OTP
router.post("/verify-otp",              verifyOtp);       // Step 2: verify OTP
router.post("/register",                registerUser);    // Step 3: fill form → create account
router.post("/login",                   loginUser);       // Login

router.post("/forgot-password",         forgotPassword);         // Send reset OTP
router.post("/forgot-password/verify",  verifyForgotOtp);        // Verify reset OTP
router.post("/forgot-password/reset",   resetPassword);          // Set new password

module.exports = router;