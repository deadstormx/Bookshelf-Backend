const express = require("express");
const Book = require("../models/Book");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

// ➕ ADD BOOK (Admin)
router.post("/", protect, adminOnly, async (req, res) => {
  const book = await Book.create(req.body);
  res.status(201).json(book);
});

// 📚 GET ALL BOOKS (Public)
router.get("/", async (req, res) => {
  const books = await Book.find().populate("genre");
  res.json(books);
});

// ✏️ UPDATE BOOK (Admin)
router.put("/:id", protect, adminOnly, async (req, res) => {
  const book = await Book.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(book);
});

// ❌ DELETE BOOK (Admin)
router.delete("/:id", protect, adminOnly, async (req, res) => {
  await Book.findByIdAndDelete(req.params.id);
  res.json({ message: "Book deleted" });
});

// PUBLIC – Show only rentable books
router.get("/rentable", async (req, res) => {
  const books = await Book.find({
    rentAvailable: true,
    inStock: true
  }).populate("genre");

  res.json(books);
});


module.exports = router;
