const express = require("express");
const Rental = require("../models/Rental");
const Book = require("../models/Book");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/:rentalId", protect, async (req, res) => {
  const rental = await Rental.findById(req.params.rentalId);
  if (!rental) return res.status(404).json({ message: "Rental not found" });

  rental.paymentStatus = "paid";
  await rental.save();

  const book = await Book.findById(rental.book);
  book.inStock = false;
  await book.save();

  res.json({ message: "Payment successful & book rented" });
});

module.exports = router;
