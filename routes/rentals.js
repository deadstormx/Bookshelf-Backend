// const express = require("express");
// const Rental = require("../models/Rental");
// const Book = require("../models/Book");
// const { protect } = require("../middleware/auth");

// const router = express.Router();

// router.post("/", protect, async (req, res) => {
//   const { bookId, rentalDays } = req.body;

//   const book = await Book.findById(bookId);
//   if (!book || !book.inStock || !book.rentAvailable) {
//     return res.status(400).json({ message: "Book not available" });
//   }

//   const pricePerDay = 5;
//   const totalAmount = pricePerDay * rentalDays;

//   const rental = await Rental.create({
//     user: req.user._id,
//     book: bookId,
//     rentalDays,
//     pricePerDay,
//     totalAmount,
//     returnDate: new Date(Date.now() + rentalDays * 86400000)
//   });

//   res.status(201).json(rental);
// });

// module.exports = router;

const express = require("express");
const Rental = require("../models/Rental");
const { protect, adminOnly } = require("../middleware/auth");
const upload = require("../middleware/multer"); // your multer config
const router = express.Router();

// CREATE RENTAL (User)
router.post(
  "/",
  protect,
  (req, res, next) => {
    // Multer file upload with error handling
    upload.single("citizenshipDoc")(req, res, function (err) {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      // Check if file is uploaded
      if (!req.file) {
        return res.status(400).json({ message: "Citizenship document is required" });
      }

      // Create rental
      const rental = new Rental({
        user: req.user._id,
        book: req.body.book,        // send book ID in request body
        rentDays: req.body.rentDays,
        citizenshipDoc: req.file.path,
      });

      await rental.save();
      res.status(201).json({ message: "Rental request submitted" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// GET ALL RENTALS (Admin)
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const rentals = await Rental.find()
      .populate("user", "name email")
      .populate("book", "title");
    res.json(rentals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE RENTAL STATUS (Admin)
router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);

    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    rental.status = req.body.status; // "Pending" / "Approved" / "Rejected"
    await rental.save();

    res.json(rental);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
