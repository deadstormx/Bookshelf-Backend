const mongoose = require("mongoose");

const rentalSchema = new mongoose.Schema(
  {
    user:          { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    book:          { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },

    renterName:    { type: String, required: true },
    renterEmail:   { type: String, required: true },
    renterPhone:   { type: String, required: true },
    renterAddress: { type: String, required: true },

    rentalDays:    { type: Number, required: true, min: 1 },
    pricePerDay:   { type: Number, required: true },
    totalAmount:   { type: Number, required: true },
    securityDeposit: { type: Number, default: 500 },

    citizenshipFront: { type: String, required: true },
    citizenshipBack:  { type: String, required: true },

    rentalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "active", "returned", "overdue"],
      default: "pending",
    },
    paymentStatus:  { type: String, enum: ["pending", "paid"], default: "pending" },
    paymentMethod:  { type: String, enum: ["khalti", "cod", "store", ""], default: "" },
    rejectionReason:{ type: String, default: "" },

    // Khalti payment
    pidx:          { type: String, default: "" },
    transactionId: { type: String, default: "" },

    startDate:     { type: Date, default: null },
    dueDate:       { type: Date, default: null },
    returnedDate:  { type: Date, default: null },
    fine:          { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Rental", rentalSchema);