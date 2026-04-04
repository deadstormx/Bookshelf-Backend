const express = require("express");
const router  = express.Router();
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");

// GET /api/notifications — get user's notifications
router.get("/", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(notifications);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PUT /api/notifications/:id/read — mark one as read
router.put("/:id/read", protect, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ message: "Marked as read" });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PUT /api/notifications/read-all — mark all as read
router.put("/read-all", protect, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id }, { read: true });
    res.json({ message: "All marked as read" });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;