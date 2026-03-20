const express = require("express");
const router  = express.Router();
const User    = require("../models/User");
const { protect, adminOnly } = require("../middleware/auth");

// GET /api/users/profile
router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password -otp -otpExpires")
      .populate("favorites");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch { res.status(500).json({ message: "Server error" }); }
});

// PUT /api/users/profile
router.put("/profile", protect, async (req, res) => {
  try {
    const { name, phone, address, dateOfBirth } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (name)                    user.name        = name;
    if (phone !== undefined)     user.phone       = phone;
    if (address !== undefined)   user.address     = address;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
    await user.save();
    res.json({ id: user._id, name: user.name, email: user.email,
      phone: user.phone, address: user.address, dateOfBirth: user.dateOfBirth, isAdmin: user.isAdmin });
  } catch { res.status(500).json({ message: "Server error" }); }
});

// POST /api/users/profile/image — upload profile picture via Cloudinary
const { uploadProfileImage } = require("../config/cloudinary");
router.post("/profile/image", protect, uploadProfileImage.single("profileImage"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No image uploaded" });
    const imageUrl = req.file.path; // Cloudinary URL
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.profileImage = imageUrl;
    await user.save();
    res.json({ profileImage: imageUrl });
  } catch { res.status(500).json({ message: "Server error" }); }
});

// GET /api/users/favorites — get all favorites
router.get("/favorites", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: "favorites",
      populate: { path: "genre" }
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.favorites);
  } catch { res.status(500).json({ message: "Server error" }); }
});

// POST /api/users/favorites/:bookId — add to favorites
router.post("/favorites/:bookId", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.favorites.includes(req.params.bookId))
      return res.status(400).json({ message: "Already in favorites" });
    user.favorites.push(req.params.bookId);
    await user.save();
    res.json({ message: "Added to favorites", favorites: user.favorites });
  } catch { res.status(500).json({ message: "Server error" }); }
});

// DELETE /api/users/favorites/:bookId — remove from favorites
router.delete("/favorites/:bookId", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.favorites = user.favorites.filter(id => id.toString() !== req.params.bookId);
    await user.save();
    res.json({ message: "Removed from favorites", favorites: user.favorites });
  } catch { res.status(500).json({ message: "Server error" }); }
});

// GET /api/users — admin only
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password -otp -otpExpires");
    res.json(users);
  } catch { res.status(500).json({ message: "Server error" }); }
});

// PUT /api/users/:id/block — admin: toggle block/unblock
router.put("/:id/block", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.isBlocked = !user.isBlocked;
    await user.save();
    res.json({ message: user.isBlocked ? "User blocked" : "User unblocked", isBlocked: user.isBlocked });
  } catch { res.status(500).json({ message: "Server error" }); }
});

// DELETE /api/users/:id — admin: delete user
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch { res.status(500).json({ message: "Server error" }); }
});

// POST /api/chat — AI chatbot using Gemini
router.post("/chat", async (req, res) => {
  const { message, history } = req.body;
  if (!message) return res.status(400).json({ message: "Message is required" });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: `You are a helpful assistant for The BookShelf — an online bookstore and book rental platform in Nepal. 
              You help users with:
              - Book recommendations based on their interests
              - Information about rental plans and pricing
              - How to rent, return books
              - Account and order questions
              - General book-related questions
              Keep responses concise, friendly and helpful. 
              If asked about something unrelated to books or the bookstore, politely redirect to book topics.
              Use emojis occasionally to be friendly. Respond in the same language the user writes in.`
            }]
          },
          contents: [
            ...(history || []),
            { role: "user", parts: [{ text: message }] }
          ],
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7,
          }
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Gemini API error");

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't understand that.";
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;