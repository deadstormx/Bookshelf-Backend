// const User = require("../models/User");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const nodemailer = require("nodemailer");

// // EMAIL CONFIG
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// // REGISTER → SEND OTP
// exports.registerUser = async (req, res) => {
//   const { name, email, password } = req.body;

//   try {
//     const userExists = await User.findOne({ email });
//     if (userExists && userExists.isVerified) {
//       return res.status(400).json({ message: "User already exists" });
//     }

//     // Generate OTP
//     const otp = Math.floor(100000 + Math.random() * 900000).toString();

//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);

//     let user;

//     if (userExists) {
//       user = userExists;
//       user.otp = otp;
//       user.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
//     } else {
//       user = await User.create({
//         name,
//         email,
//         password: hashedPassword,
//         otp,
//         otpExpires: Date.now() + 5 * 60 * 1000,
//         isVerified: false,
//       });
//     }

//     await user.save();

//     // Send email
//     await transporter.sendMail({
//       from: `"BookShelf" <${process.env.EMAIL_USER}>`,
//       to: email,
//       subject: "Your OTP Code",
//       html: `<h2>Your OTP is: ${otp}</h2><p>Valid for 5 minutes</p>`,
//     });

//     res.status(200).json({ message: "OTP sent to email" });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // VERIFY OTP → ACTIVATE ACCOUNT
// exports.verifyOtp = async (req, res) => {
//   const { email, otp } = req.body;

//   try {
//     const user = await User.findOne({ email });
//     if (!user)
//       return res.status(400).json({ message: "User not found" });

//     if (user.otp !== otp)
//       return res.status(400).json({ message: "Invalid OTP" });

//     if (user.otpExpires < Date.now())
//       return res.status(400).json({ message: "OTP expired" });

//     user.isVerified = true;
//     user.otp = undefined;
//     user.otpExpires = undefined;

//     await user.save();

//     res.json({ message: "OTP verified successfully" });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

// // LOGIN
// exports.loginUser = async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     const user = await User.findOne({ email });
//     if (!user || !user.isVerified)
//       return res.status(400).json({ message: "Account not verified" });

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch)
//       return res.status(400).json({ message: "Invalid credentials" });

//     const token = jwt.sign(
//       { id: user._id },
//       process.env.JWT_SECRET,
//       { expiresIn: "1d" }
//     );

//     res.json({
//       token,
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };




























const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// ================= EMAIL CONFIG =================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ================= REGISTER → SEND OTP =================
exports.registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists && userExists.isVerified) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let user;

    if (userExists) {
      user = userExists;
      user.name = name;
      user.password = hashedPassword;
      user.otp = otp;
      user.otpExpires = Date.now() + 5 * 60 * 1000;
    } else {
      user = await User.create({
        name,
        email,
        password: hashedPassword,
        otp,
        otpExpires: Date.now() + 5 * 60 * 1000,
        isVerified: false,
      });
    }

    await user.save();

    // ================= SEND OTP EMAIL =================
   await transporter.sendMail({
  from: `"The BookShelf" <${process.env.EMAIL_USER}>`,
  to: email,
  subject: "Verify Your Email – The BookShelf",
  html: `
  <div style="background:#f4f6f8;padding:20px;font-family:Arial,sans-serif">
    <div style="max-width:520px;margin:auto;background:#ffffff;border-radius:10px;overflow:hidden">

      <div style="background:#111827;padding:20px;text-align:center">
        <img 
          src="cid:bookshelflogo"
          alt="The BookShelf Logo"
          width="90"
          style="margin-bottom:10px"
        />
        <h2 style="color:#ffffff;margin:0">The BookShelf</h2>
      </div>

      <div style="padding:25px;color:#333">
        <p style="font-size:16px">Hello <b>${name}</b>, 👋</p>

        <p>
          Welcome to <b>The BookShelf</b>!  
          Please use the OTP below to verify your email address.
        </p>

        <div style="
          margin:25px 0;
          text-align:center;
          font-size:30px;
          letter-spacing:6px;
          font-weight:bold;
          color:#4F46E5;
          background:#EEF2FF;
          padding:15px;
          border-radius:8px
        ">
          ${otp}
        </div>

        <p>⏳ This OTP is valid for <b>5 minutes</b>.</p>

        <p style="font-size:14px;color:#666">
          If you did not request this, please ignore this email.
        </p>
      </div>

      <div style="background:#f9fafb;padding:15px;text-align:center;font-size:12px;color:#888">
        © ${new Date().getFullYear()} The BookShelf. All rights reserved.
      </div>

    </div>
  </div>
  `,
  attachments: [
    {
      filename: "Bookshelf.png",
      path: "./assets/Bookshelf.png",
      cid: "bookshelflogo",
    },
  ],
});


    res.status(200).json({ message: "OTP sent to email" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= VERIFY OTP =================
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    if (user.otpExpires < Date.now())
      return res.status(400).json({ message: "OTP expired" });

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;

    await user.save();

    res.json({ message: "OTP verified successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ================= LOGIN =================
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !user.isVerified) {
      return res.status(400).json({ message: "Account not verified" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
