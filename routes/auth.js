const express = require("express");
const {
  sendOtp,
  verifyOtp,
  registerUser,
  loginUser,
} = require("../controllers/authController");

const router = express.Router();

router.post("/send-otp",    sendOtp);       // Step 1: email → send OTP
router.post("/verify-otp",  verifyOtp);     // Step 2: verify OTP
router.post("/register",    registerUser);  // Step 3: fill form → create account
router.post("/login",       loginUser);     // Login


// ── Google OAuth ─────────────────────────────────────────────────────────────
const { OAuth2Client } = require("google-auth-library");
const jwt_g    = require("jsonwebtoken");
const User_g   = require("../models/User");
const bcrypt_g = require("bcryptjs");
const gClient  = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: "No credential provided" });
    const ticket = await gClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    const { email, name, picture } = ticket.getPayload();
    let user = await User_g.findOne({ email });
    if (!user) {
      const hashed = await bcrypt_g.hash(email + process.env.JWT_SECRET, 10);
      user = await User_g.create({ name, email, password: hashed, profileImage: picture, isVerified: true });
    } else if (!user.profileImage && picture) {
      user.profileImage = picture; await user.save();
    }
    const token = jwt_g.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, profileImage: user.profileImage, isAdmin: user.isAdmin || false } });
  } catch (e) { res.status(500).json({ message: "Google auth failed: " + e.message }); }
});

module.exports = router;