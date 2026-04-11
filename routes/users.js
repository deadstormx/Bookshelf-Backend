const express = require("express");
const router  = express.Router();
const User    = require("../models/User");
const bcrypt  = require("bcryptjs");
const { protect, adminOnly } = require("../middleware/auth");
const { uploadProfileImage } = require("../config/cloudinary");

// ── GET /api/users/profile ────────────────────────────────────────────────────
router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password -otp -otpExpires")
      .populate("favorites");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ── PUT /api/users/profile ────────────────────────────────────────────────────
router.put("/profile", protect, async (req, res) => {
  try {
    const { name, phone, address, dateOfBirth } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (name)                      user.name        = name;
    if (phone !== undefined)       user.phone       = phone;
    if (address !== undefined)     user.address     = address;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
    await user.save();
    res.json({
      _id: user._id, id: user._id,
      name: user.name, email: user.email,
      phone: user.phone, address: user.address,
      dateOfBirth: user.dateOfBirth, isAdmin: user.isAdmin,
      profileImage: user.profileImage || "",
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ── POST /api/users/profile/image — upload profile picture via Cloudinary ─────
router.post(
  "/profile/image",
  protect,
  uploadProfileImage.single("profileImage"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No image uploaded" });
      const imageUrl = req.file.path;
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      user.profileImage = imageUrl;
      await user.save();
      res.json({ profileImage: imageUrl });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
);

// ── PUT /api/users/change-password ────────────────────────────────────────────
router.put("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Both fields required" });
    if (newPassword.length < 8)
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── GET /api/users/favorites ──────────────────────────────────────────────────
router.get("/favorites", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: "favorites",
      populate: { path: "genre" },
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.favorites);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ── POST /api/users/favorites/:bookId ────────────────────────────────────────
router.post("/favorites/:bookId", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.favorites.map(id => id.toString()).includes(req.params.bookId))
      return res.status(400).json({ message: "Already in favorites" });
    user.favorites.push(req.params.bookId);
    await user.save();
    res.json({ message: "Added to favorites", favorites: user.favorites });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ── DELETE /api/users/favorites/:bookId ──────────────────────────────────────
router.delete("/favorites/:bookId", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.favorites = user.favorites.filter(
      id => id.toString() !== req.params.bookId
    );
    await user.save();
    res.json({ message: "Removed from favorites", favorites: user.favorites });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ── GET /api/users — admin: list all users ────────────────────────────────────
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password -otp -otpExpires");
    res.json(users);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ── PUT /api/users/:id/block — admin: toggle block/unblock ───────────────────
router.put("/:id/block", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.isBlocked = !user.isBlocked;
    await user.save();
    res.json({
      message: user.isBlocked ? "User blocked" : "User unblocked",
      isBlocked: user.isBlocked,
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// ── DELETE /api/users/:id — admin: delete user ────────────────────────────────
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;