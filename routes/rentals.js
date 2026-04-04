// const express = require("express");
// const router  = express.Router();
// const Rental  = require("../models/Rental");
// const Book    = require("../models/Book");
// const { protect, adminOnly } = require("../middleware/auth");
// const { uploadCitizenshipDoc } = require("../config/cloudinary");

// const multer = require("multer");
// const { CloudinaryStorage } = require("multer-storage-cloudinary");
// const { cloudinary } = require("../config/cloudinary");

// const citizenshipStorage = new CloudinaryStorage({
//   cloudinary,
//   params: {
//     folder:          "bookshelf/citizenship_docs",
//     allowed_formats: ["jpg", "jpeg", "png", "webp"],
//     resource_type:   "image",
//   },
// });

// const upload = multer({ storage: citizenshipStorage }).fields([
//   { name: "citizenshipFront", maxCount: 1 },
//   { name: "citizenshipBack",  maxCount: 1 },
// ]);

// const FINE_PER_DAY = 5; // Rs 5/day late fee

// // ── POST /api/rentals ─────────────────────────────────────────────────────────
// router.post("/", protect, upload, async (req, res) => {
//   try {
//     const front = req.files?.citizenshipFront?.[0];
//     const back  = req.files?.citizenshipBack?.[0];

//     if (!front || !back)
//       return res.status(400).json({ message: "Both citizenship front and back photos are required" });

//     const { book: bookId, rentalDays, renterName, renterEmail, renterPhone, renterAddress } = req.body;
//     const days = Number(rentalDays);

//     if (!bookId)         return res.status(400).json({ message: "Book ID is required" });
//     if (!days || days < 1) return res.status(400).json({ message: "Rental days must be at least 1" });
//     if (!renterName || !renterEmail || !renterPhone || !renterAddress)
//       return res.status(400).json({ message: "All renter details are required" });

//     const book = await Book.findById(bookId);
//     if (!book)              return res.status(404).json({ message: "Book not found" });
//     if (!book.rentAvailable) return res.status(400).json({ message: "This book is not available for rent" });
//     if (!book.inStock || book.stockCount <= 0)
//       return res.status(400).json({ message: "This book is out of stock" });

//     // Check existing rental
//     const existing = await Rental.findOne({
//       user: req.user._id, book: bookId,
//       rentalStatus: { $in: ["pending", "approved", "active"] },
//     });
//     if (existing)
//       return res.status(400).json({ message: "You already have an active or pending rental for this book" });

//     const pricePerDay   = book.pricePerDay;
//     const totalAmount   = pricePerDay * days;

//     const rental = await Rental.create({
//       user:             req.user._id,
//       book:             bookId,
//       renterName, renterEmail, renterPhone, renterAddress,
//       rentalDays:       days,
//       pricePerDay,
//       totalAmount,
//       citizenshipFront: front.path,
//       citizenshipBack:  back.path,
//       rentalStatus:     "pending",
//       paymentStatus:    "pending",
//     });

//     const populated = await Rental.findById(rental._id)
//       .populate("user", "name email")
//       .populate("book", "title author image pricePerDay");

//     res.status(201).json({ message: "Rental request submitted! Awaiting admin approval.", rental: populated });
//   } catch (e) {
//     res.status(500).json({ message: e.message });
//   }
// });

// // ── GET /api/rentals/my ───────────────────────────────────────────────────────
// router.get("/my", protect, async (req, res) => {
//   try {
//     const rentals = await Rental.find({ user: req.user._id })
//       .populate("book", "title author image price pricePerDay genre")
//       .sort({ createdAt: -1 });

//     const now = new Date();
//     for (const r of rentals) {
//       if (r.rentalStatus === "active" && r.dueDate && now > r.dueDate) {
//         r.rentalStatus = "overdue";
//         r.fine = Math.ceil((now - r.dueDate) / 86400000) * FINE_PER_DAY;
//         await r.save();
//       }
//     }
//     res.json(rentals);
//   } catch (e) { res.status(500).json({ message: e.message }); }
// });

// // ── POST /api/rentals/:id/return ──────────────────────────────────────────────
// router.post("/:id/return", protect, async (req, res) => {
//   try {
//     const rental = await Rental.findById(req.params.id);
//     if (!rental) return res.status(404).json({ message: "Rental not found" });
//     if (rental.user.toString() !== req.user._id.toString())
//       return res.status(403).json({ message: "Not authorized" });
//     if (!["active", "overdue"].includes(rental.rentalStatus))
//       return res.status(400).json({ message: "This rental cannot be returned in its current status" });

//     const now = new Date();
//     rental.returnedDate = now;
//     if (rental.dueDate && now > rental.dueDate)
//       rental.fine = Math.ceil((now - rental.dueDate) / 86400000) * FINE_PER_DAY;
//     rental.rentalStatus = "returned";

//     const book = await Book.findById(rental.book);
//     if (book) { book.stockCount = (book.stockCount || 0) + 1; book.inStock = true; await book.save(); }

//     await rental.save();
//     res.json({ message: "Book returned successfully" });
//   } catch (e) { res.status(500).json({ message: e.message }); }
// });

// // ── GET /api/rentals (Admin) ──────────────────────────────────────────────────
// router.get("/", protect, adminOnly, async (req, res) => {
//   try {
//     const rentals = await Rental.find()
//       .populate("user", "name email")
//       .populate("book", "title author image price pricePerDay")
//       .sort({ createdAt: -1 });

//     const now = new Date();
//     for (const r of rentals) {
//       if (r.rentalStatus === "active" && r.dueDate && now > r.dueDate) {
//         r.rentalStatus = "overdue";
//         r.fine = Math.ceil((now - r.dueDate) / 86400000) * FINE_PER_DAY;
//         await r.save();
//       }
//     }
//     res.json(rentals);
//   } catch (e) { res.status(500).json({ message: e.message }); }
// });

// // ── PUT /api/rentals/:id/status (Admin) ──────────────────────────────────────
// router.put("/:id/status", protect, adminOnly, async (req, res) => {
//   try {
//     const { status } = req.body;
//     if (!["approved", "rejected"].includes(status))
//       return res.status(400).json({ message: "Status must be approved or rejected" });

//     const rental = await Rental.findById(req.params.id);
//     if (!rental) return res.status(404).json({ message: "Rental not found" });
//     if (rental.rentalStatus !== "pending")
//       return res.status(400).json({ message: "Only pending rentals can be approved or rejected" });

//     if (status === "approved") {
//       const startDate = new Date();
//       const dueDate   = new Date();
//       dueDate.setDate(dueDate.getDate() + rental.rentalDays);

//       rental.rentalStatus  = "active";
//       rental.paymentStatus = "paid";
//       rental.startDate     = startDate;
//       rental.dueDate       = dueDate;

//       const book = await Book.findById(rental.book);
//       if (book) {
//         book.stockCount = Math.max(0, (book.stockCount || 0) - 1);
//         if (book.stockCount <= 0) book.inStock = false;
//         await book.save();
//       }
//     } else {
//       rental.rentalStatus = "rejected";
//     }

//     await rental.save();
//     const populated = await Rental.findById(rental._id)
//       .populate("user", "name email")
//       .populate("book", "title author image price pricePerDay");
//     res.json({ message: `Rental ${status} successfully`, rental: populated });
//   } catch (e) { res.status(500).json({ message: e.message }); }
// });

// // ── PUT /api/rentals/:id/return-confirm (Admin) ───────────────────────────────
// router.put("/:id/return-confirm", protect, adminOnly, async (req, res) => {
//   try {
//     const rental = await Rental.findById(req.params.id);
//     if (!rental) return res.status(404).json({ message: "Rental not found" });
//     if (!["active", "overdue"].includes(rental.rentalStatus))
//       return res.status(400).json({ message: "Cannot mark this rental as returned" });

//     const now = new Date();
//     rental.returnedDate = now;
//     rental.rentalStatus = "returned";
//     if (rental.dueDate && now > rental.dueDate)
//       rental.fine = Math.ceil((now - rental.dueDate) / 86400000) * FINE_PER_DAY;

//     const book = await Book.findById(rental.book);
//     if (book) { book.stockCount = (book.stockCount || 0) + 1; book.inStock = true; await book.save(); }

//     await rental.save();
//     const populated = await Rental.findById(rental._id)
//       .populate("user", "name email")
//       .populate("book", "title author image price pricePerDay");
//     res.json({ message: "Return confirmed", rental: populated });
//   } catch (e) { res.status(500).json({ message: e.message }); }
// });

// module.exports = router;






















































































const express = require("express");
const router  = express.Router();
const Rental  = require("../models/Rental");
const Book    = require("../models/Book");
const { protect, adminOnly } = require("../middleware/auth");
const Notification = require("../models/Notification");
const { uploadCitizenshipDoc } = require("../config/cloudinary");

const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary } = require("../config/cloudinary");

const citizenshipStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          "bookshelf/citizenship_docs",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    resource_type:   "image",
  },
});

const upload = multer({ storage: citizenshipStorage }).fields([
  { name: "citizenshipFront", maxCount: 1 },
  { name: "citizenshipBack",  maxCount: 1 },
]);

const FINE_PER_DAY = 5; // Rs 5/day late fee

// ── POST /api/rentals ─────────────────────────────────────────────────────────
router.post("/", protect, upload, async (req, res) => {
  try {
    const front = req.files?.citizenshipFront?.[0];
    const back  = req.files?.citizenshipBack?.[0];

    if (!front || !back)
      return res.status(400).json({ message: "Both citizenship front and back photos are required" });

    const { book: bookId, rentalDays, renterName, renterEmail, renterPhone, renterAddress } = req.body;
    const days = Number(rentalDays);

    if (!bookId)         return res.status(400).json({ message: "Book ID is required" });
    if (!days || days < 1) return res.status(400).json({ message: "Rental days must be at least 1" });
    if (!renterName || !renterEmail || !renterPhone || !renterAddress)
      return res.status(400).json({ message: "All renter details are required" });

    const book = await Book.findById(bookId);
    if (!book)              return res.status(404).json({ message: "Book not found" });
    if (!book.rentAvailable) return res.status(400).json({ message: "This book is not available for rent" });
    if (!book.inStock || book.stockCount <= 0)
      return res.status(400).json({ message: "This book is out of stock" });

    // Check existing rental
    const existing = await Rental.findOne({
      user: req.user._id, book: bookId,
      rentalStatus: { $in: ["pending", "approved", "active"] },
    });
    if (existing)
      return res.status(400).json({ message: "You already have an active or pending rental for this book" });

    const pricePerDay   = book.pricePerDay;
    const totalAmount   = pricePerDay * days;

    const rental = await Rental.create({
      user:             req.user._id,
      book:             bookId,
      renterName, renterEmail, renterPhone, renterAddress,
      rentalDays:       days,
      pricePerDay,
      totalAmount,
      citizenshipFront: front.path,
      citizenshipBack:  back.path,
      rentalStatus:     "pending",
      paymentStatus:    "pending",
    });

    const populated = await Rental.findById(rental._id)
      .populate("user", "name email")
      .populate("book", "title author image pricePerDay");

    res.status(201).json({ message: "Rental request submitted! Awaiting admin approval.", rental: populated });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── GET /api/rentals/my ───────────────────────────────────────────────────────
router.get("/my", protect, async (req, res) => {
  try {
    const rentals = await Rental.find({ user: req.user._id })
      .populate("book", "title author image price pricePerDay genre")
      .sort({ createdAt: -1 });

    const now = new Date();
    for (const r of rentals) {
      if (r.rentalStatus === "active" && r.dueDate && now > r.dueDate) {
        r.rentalStatus = "overdue";
        r.fine = Math.ceil((now - r.dueDate) / 86400000) * FINE_PER_DAY;
        await r.save();
      }
    }
    res.json(rentals);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── POST /api/rentals/:id/return ──────────────────────────────────────────────
router.post("/:id/return", protect, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) return res.status(404).json({ message: "Rental not found" });
    if (rental.user.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });
    if (!["active", "overdue"].includes(rental.rentalStatus))
      return res.status(400).json({ message: "This rental cannot be returned in its current status" });

    const now = new Date();
    rental.returnedDate = now;
    if (rental.dueDate && now > rental.dueDate)
      rental.fine = Math.ceil((now - rental.dueDate) / 86400000) * FINE_PER_DAY;
    rental.rentalStatus = "returned";

    const book = await Book.findById(rental.book);
    if (book) { book.stockCount = (book.stockCount || 0) + 1; book.inStock = true; await book.save(); }

    await rental.save();
    res.json({ message: "Book returned successfully" });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET /api/rentals (Admin) ──────────────────────────────────────────────────
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const rentals = await Rental.find()
      .populate("user", "name email")
      .populate("book", "title author image price pricePerDay")
      .sort({ createdAt: -1 });

    const now = new Date();
    for (const r of rentals) {
      if (r.rentalStatus === "active" && r.dueDate && now > r.dueDate) {
        r.rentalStatus = "overdue";
        r.fine = Math.ceil((now - r.dueDate) / 86400000) * FINE_PER_DAY;
        await r.save();
      }
    }
    res.json(rentals);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── PUT /api/rentals/:id/status (Admin) ──────────────────────────────────────
router.put("/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status))
      return res.status(400).json({ message: "Status must be approved or rejected" });

    const rental = await Rental.findById(req.params.id);
    if (!rental) return res.status(404).json({ message: "Rental not found" });
    if (rental.rentalStatus !== "pending")
      return res.status(400).json({ message: "Only pending rentals can be approved or rejected" });

    if (status === "approved") {
      const startDate = new Date();
      const dueDate   = new Date();
      dueDate.setDate(dueDate.getDate() + rental.rentalDays);

      rental.rentalStatus  = "active";
      rental.paymentStatus = "paid";
      rental.startDate     = startDate;
      rental.dueDate       = dueDate;

      const book = await Book.findById(rental.book);
      if (book) {
        book.stockCount = Math.max(0, (book.stockCount || 0) - 1);
        if (book.stockCount <= 0) book.inStock = false;
        await book.save();
      }
    } else {
      rental.rentalStatus = "rejected";
    }

    // Create notification for user
    const bookTitle = (await require("../models/Book").findById(rental.book))?.title || "your book";
    await Notification.create({
      user:    rental.user,
      title:   status === "approved" ? "Rental Approved ✅" : "Rental Rejected ❌",
      message: status === "approved"
        ? `Your rental request for "${bookTitle}" has been approved! Enjoy your reading.`
        : `Your rental request for "${bookTitle}" has been rejected. Contact support for more info.`,
      type: "rental",
    });

    await rental.save();
    const populated = await Rental.findById(rental._id)
      .populate("user", "name email")
      .populate("book", "title author image price pricePerDay");
    res.json({ message: `Rental ${status} successfully`, rental: populated });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── PUT /api/rentals/:id/return-confirm (Admin) ───────────────────────────────
router.put("/:id/return-confirm", protect, adminOnly, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) return res.status(404).json({ message: "Rental not found" });
    if (!["active", "overdue"].includes(rental.rentalStatus))
      return res.status(400).json({ message: "Cannot mark this rental as returned" });

    const now = new Date();
    rental.returnedDate = now;
    rental.rentalStatus = "returned";
    if (rental.dueDate && now > rental.dueDate)
      rental.fine = Math.ceil((now - rental.dueDate) / 86400000) * FINE_PER_DAY;

    const book = await Book.findById(rental.book);
    if (book) { book.stockCount = (book.stockCount || 0) + 1; book.inStock = true; await book.save(); }

    await rental.save();
    const populated = await Rental.findById(rental._id)
      .populate("user", "name email")
      .populate("book", "title author image price pricePerDay");
    res.json({ message: "Return confirmed", rental: populated });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;