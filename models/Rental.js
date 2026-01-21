const mongoose = require("mongoose");

const rentalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true
    },

    rentalDays: Number,
    pricePerDay: Number,
    totalAmount: Number,

    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending"
    },

    rentalStatus: {
      type: String,
      enum: ["active", "returned"],
      default: "active"
    },

    citizenshipDoc: {
  type: String,
  required: true
},


    rentedAt: {
      type: Date,
      default: Date.now
    },

    returnDate: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model("Rental", rentalSchema);
