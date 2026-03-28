const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  book:     { type: mongoose.Schema.Types.ObjectId, ref: "Book" },
  title:    { type: String, required: true },
  author:   { type: String },
  price:    { type: Number, required: true },
  quantity: { type: Number, required: true },
  image:    { type: String },
  type:     { type: String, enum: ["buy", "rent"], default: "buy" },
});

const orderSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items:         [orderItemSchema],
  totalAmount:   { type: Number, required: true },
  status:        { type: String, enum: ["pending", "paid", "failed", "cancelled"], default: "pending" },
  paymentMethod: { type: String, default: "khalti" },

  // Khalti payment info
  pidx:          { type: String },
  transactionId: { type: String },
  khaltiStatus:  { type: String },

  // Shipping info
  shippingAddress: {
    firstName: String,
    lastName:  String,
    email:     String,
    phone:     String,
    address:   String,
    city:      String,
  },
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);