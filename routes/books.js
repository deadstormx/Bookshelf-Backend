const express = require("express");
const Book    = require("../models/Book");
const { uploadBookImage } = require("../config/cloudinary");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

// ── GET all books (public) ────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const books = await Book.find().populate("genre").sort({ createdAt: -1 });
    res.json(books);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET rentable books (public) ───────────────────────────────────────────────
router.get("/rentable", async (req, res) => {
  try {
    const books = await Book.find({ rentAvailable: true, inStock: true })
      .populate("genre")
      .sort({ createdAt: -1 });
    res.json(books);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET single book (public) ──────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const book = await Book.findById(req.params.id)
      .populate("genre")
      .populate("reviews.user", "name profileImage");
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json(book);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── ADD book with image upload (admin) ────────────────────────────────────────
router.post("/", protect, adminOnly, uploadBookImage.single("image"), async (req, res) => {
  try {
    const data = { ...req.body };

    // If a file was uploaded, build the URL; otherwise use the imageUrl text field
    if (req.file) {
      data.image = req.file.path; // Cloudinary URL
    } else if (data.imageUrl) {
      data.image = data.imageUrl;
      delete data.imageUrl;
    }

    const book = await Book.create(data);
    const populated = await Book.findById(book._id).populate("genre");
    res.status(201).json(populated);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── EDIT book (admin) ─────────────────────────────────────────────────────────
router.put("/:id", protect, adminOnly, uploadBookImage.single("image"), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      data.image = req.file.path; // Cloudinary URL
    } else if (data.imageUrl) {
      data.image = data.imageUrl;
      delete data.imageUrl;
    }
    // Auto-sync inStock with stockCount
    if (data.stockCount !== undefined) {
      const count = Number(data.stockCount);
      if (count <= 0) { data.inStock = false; data.stockCount = 0; }
      else if (data.inStock === undefined) { data.inStock = true; }
    }
    const book = await Book.findByIdAndUpdate(req.params.id, data, { new: true }).populate("genre");
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json(book);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── DELETE book (admin) ───────────────────────────────────────────────────────
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    await Book.findByIdAndDelete(req.params.id);
    res.json({ message: "Book deleted" });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── SUBMIT review (logged-in user) ────────────────────────────────────────────
router.post("/:id/reviews", protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || !comment)
      return res.status(400).json({ message: "Rating and comment are required" });

    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    // One review per user
    const already = book.reviews.find(r => r.user?.toString() === req.user._id.toString());
    if (already) return res.status(400).json({ message: "You already reviewed this book" });

    book.reviews.unshift({
      user:     req.user._id,
      userName: req.user.name,
      rating:   Number(rating),
      comment,
    });

    // Recompute average
    const total = book.reviews.reduce((s, r) => s + r.rating, 0);
    book.rating = parseFloat((total / book.reviews.length).toFixed(1));

    await book.save();
    const updated = await Book.findById(book._id).populate("genre").populate("reviews.user", "name profileImage");
    res.status(201).json(updated);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;