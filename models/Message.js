const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    roomId:   { type: String, required: true, index: true }, // userId of the user
    sender:   { type: String, enum: ["user", "admin"], required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text:     { type: String, required: true },
    read:     { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);