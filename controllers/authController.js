const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// ── Email transporter ────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── Helper: send OTP email ───────────────────────────────────────────────────
const sendOtpEmail = async (email, name, otp) => {
  await transporter.sendMail({
    from: `"The BookShelf" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify Your Email – The BookShelf",
    html: `
    <div style="background:#f4f6f8;padding:20px;font-family:Arial,sans-serif">
      <div style="max-width:520px;margin:auto;background:#ffffff;border-radius:10px;overflow:hidden">
        <div style="background:#111827;padding:20px;text-align:center">
          <h2 style="color:#ffffff;margin:0">The BookShelf</h2>
        </div>
        <div style="padding:25px;color:#333">
          <p style="font-size:16px">Hello <b>${name}</b>, 👋</p>
          <p>Please use the OTP below to verify your email address.</p>
          <div style="
            margin:25px 0;text-align:center;font-size:30px;letter-spacing:6px;
            font-weight:bold;color:#4F46E5;background:#EEF2FF;
            padding:15px;border-radius:8px">
            ${otp}
          </div>
          <p>⏳ This OTP is valid for <b>5 minutes</b>.</p>
          <p style="font-size:14px;color:#666">If you did not request this, please ignore this email.</p>
        </div>
        <div style="background:#f9fafb;padding:15px;text-align:center;font-size:12px;color:#888">
          © ${new Date().getFullYear()} The BookShelf. All rights reserved.
        </div>
      </div>
    </div>`,
  });
};

// ────────────────────────────────────────────────────────────────────────────
// STEP 1 — SEND OTP  (only needs email)
// POST /api/auth/send-otp   { email }
// ────────────────────────────────────────────────────────────────────────────
exports.sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    // Block already-verified accounts
    const existing = await User.findOne({ email });
    if (existing && existing.isVerified) {
      return res.status(400).json({ message: "Email already registered. Please log in." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes

    if (existing) {
      // Unverified placeholder — just refresh the OTP
      existing.otp = otp;
      existing.otpExpires = otpExpires;
      await existing.save();
    } else {
      // Create a minimal placeholder — name & password filled in later
      await User.create({
        name: "__pending__",
        email,
        password: "__pending__",
        otp,
        otpExpires,
        isVerified: false,
        otpVerified: false,   // custom flag: OTP passed but form not yet submitted
      });
    }

    await sendOtpEmail(email, "there", otp);
    res.status(200).json({ message: "OTP sent to email" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// STEP 2 — VERIFY OTP
// POST /api/auth/verify-otp   { email, otp }
// ────────────────────────────────────────────────────────────────────────────
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });
    if (user.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    if (user.otpExpires < Date.now()) return res.status(400).json({ message: "OTP expired" });

    // Clear OTP and mark email as verified — but account still incomplete
    user.otp = undefined;
    user.otpExpires = undefined;
    user.otpVerified = true;   // email confirmed ✓, waiting for form
    await user.save();

    res.json({ message: "OTP verified. Please complete your registration." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// STEP 3 — COMPLETE REGISTRATION (after OTP verified)
// POST /api/auth/register   { name, email, password }
// ────────────────────────────────────────────────────────────────────────────
exports.registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Please verify your email first" });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: "Account already exists. Please log in." });
    }
    if (!user.otpVerified) {
      return res.status(400).json({ message: "Email not verified. Please complete OTP first." });
    }

    const { phone, address } = req.body;

    const salt = await bcrypt.genSalt(10);
    user.name = name;
    user.password = await bcrypt.hash(password, salt);
    user.isVerified = true;
    user.otpVerified = undefined; // clean up
    if (phone)   user.phone   = phone;
    if (address) user.address = address;
    await user.save();

    res.status(201).json({ message: "Account created successfully! Please log in." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// LOGIN
// POST /api/auth/login   { email, password }
// ────────────────────────────────────────────────────────────────────────────
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user || !user.isVerified) {
      return res.status(400).json({ message: "Account not found or not verified" });
    }

    // Check if user is blocked
    if (user.isBlocked) {
      return res.status(403).json({ message: "Your account has been blocked. Please contact support." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone   || "",
        address: user.address || "",
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD — SEND OTP
// POST /api/auth/forgot-password   { email }
// ────────────────────────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const user = await User.findOne({ email });
    if (!user || !user.isVerified) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    await user.save();

    await transporter.sendMail({
      from: `"The BookShelf" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset Your Password – The BookShelf",
      html: `
      <div style="background:#f4f6f8;padding:20px;font-family:Arial,sans-serif">
        <div style="max-width:520px;margin:auto;background:#ffffff;border-radius:10px;overflow:hidden">
          <div style="background:#111827;padding:20px;text-align:center">
            <h2 style="color:#ffffff;margin:0">The BookShelf</h2>
          </div>
          <div style="padding:25px;color:#333">
            <p style="font-size:16px">Hello <b>${user.name}</b>, 👋</p>
            <p>We received a request to reset your password. Use the OTP below:</p>
            <div style="
              margin:25px 0;text-align:center;font-size:30px;letter-spacing:6px;
              font-weight:bold;color:#4F46E5;background:#EEF2FF;
              padding:15px;border-radius:8px">
              ${otp}
            </div>
            <p>⏳ This OTP is valid for <b>5 minutes</b>.</p>
            <p style="font-size:14px;color:#666">If you did not request this, please ignore this email.</p>
          </div>
          <div style="background:#f9fafb;padding:15px;text-align:center;font-size:12px;color:#888">
            © ${new Date().getFullYear()} The BookShelf. All rights reserved.
          </div>
        </div>
      </div>`,
    });

    res.json({ message: "OTP sent to your email" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD — VERIFY OTP
// POST /api/auth/forgot-password/verify   { email, otp }
// ────────────────────────────────────────────────────────────────────────────
exports.verifyForgotOtp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    if (user.otpExpires < Date.now()) return res.status(400).json({ message: "OTP expired" });

    // Mark OTP as verified for password reset
    user.otpVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ message: "OTP verified. You can now reset your password." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD — RESET PASSWORD
// POST /api/auth/forgot-password/reset   { email, password }
// ────────────────────────────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "All fields required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.otpVerified) return res.status(400).json({ message: "Please verify OTP first" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.otpVerified = undefined;
    await user.save();

    res.json({ message: "Password reset successfully! Please log in." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};