const nodemailer = require("nodemailer");

const sendEmail = async (to, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: `"BookShelf" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your BookShelf OTP",
    text: `Your OTP is: ${otp}\nValid for 5 minutes.`
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
