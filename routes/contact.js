const express      = require("express");
const router       = express.Router();
const Contact      = require("../models/Contact");
const { protect, adminOnly } = require("../middleware/auth");
const nodemailer   = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// POST /api/contact — submit message (public)
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !subject || !message)
      return res.status(400).json({ message: "Name, email, subject and message required" });
    const contact = await Contact.create({ name, email, phone, subject, message });
    res.status(201).json({ message: "Message sent successfully! We'll get back to you soon.", contact });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /api/contact — admin: view all messages
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PUT /api/contact/:id/status — admin: update status
router.put("/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json(contact);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /api/contact/:id/reply — admin: send email reply
router.post("/:id/reply", protect, adminOnly, async (req, res) => {
  try {
    const { replyMessage } = req.body;
    if (!replyMessage?.trim()) return res.status(400).json({ message: "Reply message required" });

    const contact = await Contact.findById(req.params.id);
    if (!contact) return res.status(404).json({ message: "Message not found" });

    await transporter.sendMail({
      from: `"The BookShelf Support" <${process.env.EMAIL_USER}>`,
      to:   contact.email,
      subject: `Re: ${contact.subject} – The BookShelf`,
      html: `
      <div style="background:#f4f6f8;padding:20px;font-family:Arial,sans-serif">
        <div style="max-width:580px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
          <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px;text-align:center">
            <h2 style="color:#ffffff;margin:0;font-size:22px">📚 The BookShelf</h2>
            <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px">Support Team</p>
          </div>
          <div style="padding:28px;color:#333">
            <p style="font-size:16px;margin:0 0 16px">Hello <b>${contact.name}</b>,</p>
            <p style="color:#6b7280;margin:0 0 20px">Thank you for reaching out to us. Here is our response to your inquiry:</p>
            <div style="background:#f8fafc;border-left:4px solid #6366f1;border-radius:8px;padding:16px 20px;margin:0 0 24px;color:#374151;line-height:1.7">
              ${replyMessage.replace(/\n/g, "<br>")}
            </div>
            <div style="background:#f0fdf4;border-radius:8px;padding:14px 16px;margin:0 0 24px">
              <p style="margin:0;font-size:13px;color:#166534"><b>Your original message:</b> "${contact.subject}"</p>
            </div>
            <p style="color:#6b7280;font-size:13px;margin:0">If you have any more questions, feel free to reply to this email or contact us again through our website.</p>
          </div>
          <div style="background:#f8fafc;padding:16px 28px;text-align:center;border-top:1px solid #e5e7eb">
            <p style="margin:0;color:#9ca3af;font-size:12px">© ${new Date().getFullYear()} The BookShelf, Lubhu, Lalitpur, Nepal</p>
          </div>
        </div>
      </div>`,
    });

    // Mark as replied
    contact.status = "replied";
    await contact.save();

    res.json({ message: "Reply sent successfully!" });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// DELETE /api/contact/:id
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;