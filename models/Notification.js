const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title:    { type: String, required: true },
  message:  { type: String, required: true },
  type:     { type: String, enum: ["rental", "order", "system"], default: "system" },
  read:     { type: Boolean, default: false },
  rentalId: { type: mongoose.Schema.Types.ObjectId, ref: "Rental", default: null },
}, { timestamps: true });

module.exports = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);