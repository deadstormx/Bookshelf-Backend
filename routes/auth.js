// const express = require("express");
// const {
//   registerUser,
//   loginUser,
// } = require("../controllers/authController");

// const router = express.Router();

// router.post("/register", registerUser);
// router.post("/login", loginUser);

// module.exports = router;







const express = require("express");
const {
  registerUser,
  loginUser,
  verifyOtp, // 👈 ADD THIS
} = require("../controllers/authController");

const router = express.Router();

// Register (send OTP)
router.post("/register", registerUser);

// Verify OTP
router.post("/verify-otp", verifyOtp);

// Login
router.post("/login", loginUser);

module.exports = router;
