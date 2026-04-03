// const mongoose = require("mongoose");

// const rentalSchema = new mongoose.Schema(
//   {
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },

//     book: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Book",
//       required: true,
//     },

//     // Duration in months (matches frontend: 1, 3, 6, 12)
//     rentalMonths: {
//       type: Number,
//       required: true,
//       enum: [1, 3, 6, 12],
//     },

//     pricePerMonth: {
//       type: Number,
//       required: true,
//     },

//     discount: {
//       type: Number,
//       default: 0, // percentage discount (0, 10, 20, 30)
//     },

//     totalAmount: {
//       type: Number,
//       required: true,
//     },

//     // Citizenship document (Cloudinary URL)
//     citizenshipDoc: {
//       type: String,
//       required: true,
//     },

//     // Rental lifecycle status
//     rentalStatus: {
//       type: String,
//       enum: ["pending", "approved", "rejected", "active", "returned", "overdue"],
//       default: "pending",
//     },

//     paymentStatus: {
//       type: String,
//       enum: ["pending", "paid"],
//       default: "pending",
//     },

//     // Dates
//     startDate: {
//       type: Date,
//       default: null,
//     },

//     dueDate: {
//       type: Date,
//       default: null,
//     },

//     returnedDate: {
//       type: Date,
//       default: null,
//     },

//     // Late fee (Rs 5/day after due date)
//     fine: {
//       type: Number,
//       default: 0,
//     },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("Rental", rentalSchema);
















const mongoose = require("mongoose");

const rentalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },

    // Renter info filled in form
    renterName:    { type: String, required: true },
    renterEmail:   { type: String, required: true },
    renterPhone:   { type: String, required: true },
    renterAddress: { type: String, required: true },

    // Days-based rental
    rentalDays:   { type: Number, required: true, min: 1 },
    pricePerDay:  { type: Number, required: true },
    totalAmount:  { type: Number, required: true },

    // Citizenship front and back photos (Cloudinary URLs)
    citizenshipFront: { type: String, required: true },
    citizenshipBack:  { type: String, required: true },

    // Rental lifecycle
    rentalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "active", "returned", "overdue"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },

    startDate:    { type: Date, default: null },
    dueDate:      { type: Date, default: null },
    returnedDate: { type: Date, default: null },

    // Late fee Rs 5/day
    fine: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Rental", rentalSchema);