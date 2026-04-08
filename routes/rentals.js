const express  = require("express");
const router   = express.Router();
const Rental   = require("../models/Rental");
const Book     = require("../models/Book");
const Notification = require("../models/Notification");
const { protect, adminOnly } = require("../middleware/auth");

const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary } = require("../config/cloudinary");

const citizenshipStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: "bookshelf/citizenship_docs", allowed_formats: ["jpg","jpeg","png","webp"], resource_type: "image" },
});
const upload = multer({ storage: citizenshipStorage }).fields([
  { name: "citizenshipFront", maxCount: 1 },
  { name: "citizenshipBack",  maxCount: 1 },
]);

const FINE_PER_DAY      = 5;
const SECURITY_DEPOSIT  = 500;
const KHALTI_API        = "https://dev.khalti.com/api/v2";
const FRONTEND_URL      = "http://localhost:3000";

// ── POST /api/rentals — Create rental request ─────────────────────────────────
router.post("/", protect, upload, async (req, res) => {
  try {
    const front = req.files?.citizenshipFront?.[0];
    const back  = req.files?.citizenshipBack?.[0];
    if (!front || !back) return res.status(400).json({ message: "Both citizenship photos required" });

    const { book: bookId, rentalDays, renterName, renterEmail, renterPhone, renterAddress } = req.body;
    const days = Number(rentalDays);
    if (!bookId)      return res.status(400).json({ message: "Book ID required" });
    if (!days || days < 1) return res.status(400).json({ message: "Rental days must be at least 1" });

    const book = await Book.findById(bookId);
    if (!book)               return res.status(404).json({ message: "Book not found" });
    if (!book.rentAvailable) return res.status(400).json({ message: "Book not available for rent" });
    if (!book.inStock)       return res.status(400).json({ message: "Book out of stock" });

    const existing = await Rental.findOne({
      user: req.user._id, book: bookId,
      rentalStatus: { $in: ["pending","approved","active"] },
    });
    if (existing) return res.status(400).json({ message: "You already have an active rental for this book" });

    const rental = await Rental.create({
      user: req.user._id, book: bookId,
      renterName, renterEmail, renterPhone, renterAddress,
      rentalDays: days, pricePerDay: book.pricePerDay,
      totalAmount: book.pricePerDay * days,
      securityDeposit: SECURITY_DEPOSIT,
      citizenshipFront: front.path, citizenshipBack: back.path,
      rentalStatus: "pending", paymentStatus: "pending",
    });

    const populated = await Rental.findById(rental._id)
      .populate("user", "name email")
      .populate("book", "title author image pricePerDay");

    res.status(201).json({ message: "Rental request submitted! Awaiting admin approval.", rental: populated });
  } catch (e) { res.status(500).json({ message: e.message }); }
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

// ── POST /api/rentals/:id/return — User returns book ─────────────────────────
router.post("/:id/return", protect, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) return res.status(404).json({ message: "Rental not found" });
    if (rental.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Not authorized" });
    if (!["active","overdue"].includes(rental.rentalStatus)) return res.status(400).json({ message: "Cannot return in current status" });

    const now = new Date();
    rental.returnedDate = now;
    if (rental.dueDate && now > rental.dueDate)
      rental.fine = Math.ceil((now - rental.dueDate) / 86400000) * FINE_PER_DAY;
    rental.rentalStatus = "returned";

    const book = await Book.findById(rental.book);
    if (book) { book.stockCount = (book.stockCount||0)+1; book.inStock = true; await book.save(); }
    await rental.save();
    res.json({ message: "Book returned successfully" });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET /api/rentals — All rentals (Admin) ────────────────────────────────────
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const rentals = await Rental.find()
      .populate("user", "name email")
      .populate("book", "title author image price pricePerDay")
      .sort({ createdAt: -1 });
    res.json(rentals);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── PUT /api/rentals/:id/status — Admin Approve/Reject ───────────────────────
router.put("/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!["approved","rejected"].includes(status))
      return res.status(400).json({ message: "Status must be approved or rejected" });

    const rental = await Rental.findById(req.params.id).populate("book","title");
    if (!rental) return res.status(404).json({ message: "Rental not found" });
    if (rental.rentalStatus !== "pending")
      return res.status(400).json({ message: "Only pending rentals can be approved or rejected" });

    if (status === "approved") {
      rental.rentalStatus = "approved"; // Wait for payment, not active yet
    } else {
      rental.rentalStatus = "rejected";
      rental.rejectionReason = rejectionReason || "Your rental request did not meet our requirements.";
    }
    await rental.save();

    // Notify user
    await Notification.create({
      user:    rental.user,
      title:   status === "approved" ? "Rental Approved ✅" : "Rental Rejected ❌",
      message: status === "approved"
        ? `Your rental for "${rental.book?.title}" has been approved! Click here to complete payment.`
        : `Your rental for "${rental.book?.title}" was rejected. Reason: ${rental.rejectionReason}`,
      type:    "rental",
      rentalId: rental._id,
    });

    const populated = await Rental.findById(rental._id)
      .populate("user","name email")
      .populate("book","title author image price pricePerDay");
    res.json({ message: `Rental ${status} successfully`, rental: populated });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── POST /api/rentals/:id/pay-khalti — Initiate Khalti payment for rental ────
router.post("/:id/pay-khalti", protect, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id).populate("book","title");
    if (!rental) return res.status(404).json({ message: "Rental not found" });
    if (rental.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Not authorized" });
    if (rental.rentalStatus !== "approved") return res.status(400).json({ message: "Rental not approved yet" });

    const totalWithDeposit = rental.totalAmount + rental.securityDeposit;

    const response = await fetch(`${KHALTI_API}/epayment/initiate/`, {
      method: "POST",
      headers: { "Authorization": `Key ${process.env.KHALTI_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        return_url:          `${FRONTEND_URL}/rental/payment/verify`,
        website_url:         FRONTEND_URL,
        amount:              totalWithDeposit * 100,
        purchase_order_id:   `RENT-${rental._id}`,
        purchase_order_name: `Rental: ${rental.book?.title}`,
        customer_info: { name: rental.renterName, email: rental.renterEmail, phone: rental.renterPhone },
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Khalti error");

    rental.pidx = data.pidx;
    await rental.save();

    res.json({ payment_url: data.payment_url, pidx: data.pidx });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── POST /api/rentals/:id/pay-cod — COD/Store pickup ─────────────────────────
router.post("/:id/pay-cod", protect, async (req, res) => {
  try {
    const { paymentMethod } = req.body; // "cod" or "store"
    const rental = await Rental.findById(req.params.id).populate("book","title");
    if (!rental) return res.status(404).json({ message: "Rental not found" });
    if (rental.user.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Not authorized" });
    if (rental.rentalStatus !== "approved") return res.status(400).json({ message: "Rental not approved yet" });

    const startDate = new Date();
    const dueDate   = new Date();
    dueDate.setDate(dueDate.getDate() + rental.rentalDays);

    rental.rentalStatus  = "active";
    rental.paymentStatus = "pending"; // COD = pay later
    rental.paymentMethod = paymentMethod || "cod";
    rental.startDate     = startDate;
    rental.dueDate       = dueDate;

    // Decrement stock
    const book = await Book.findById(rental.book._id || rental.book);
    if (book) { book.stockCount = Math.max(0,(book.stockCount||0)-1); if(book.stockCount<=0) book.inStock=false; await book.save(); }

    await rental.save();

    await Notification.create({
      user:    rental.user,
      title:   "Rental Active 📚",
      message: `Your rental for "${rental.book?.title}" is now active! ${paymentMethod==="cod"?"Pay on delivery.":"Pick up from our store."}`,
      type:    "rental",
    });

    res.json({ message: "Rental confirmed!", rental });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── GET /api/rentals/verify-payment — Khalti callback ────────────────────────
router.get("/verify-payment", protect, async (req, res) => {
  const { pidx, status } = req.query;
  try {
    const rental = await Rental.findOne({ pidx }).populate("book","title");
    if (!rental) return res.status(404).json({ message: "Rental not found" });

    if (status === "User canceled") {
      return res.json({ success: false, status: "User canceled" });
    }

    // Verify with Khalti
    const response = await fetch(`${KHALTI_API}/epayment/lookup/`, {
      method: "POST",
      headers: { "Authorization": `Key ${process.env.KHALTI_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ pidx }),
    });
    const data = await response.json();

    if (data.status === "Completed") {
      const startDate = new Date();
      const dueDate   = new Date();
      dueDate.setDate(dueDate.getDate() + rental.rentalDays);

      rental.rentalStatus  = "active";
      rental.paymentStatus = "paid";
      rental.paymentMethod = "khalti";
      rental.transactionId = data.transaction_id;
      rental.startDate     = startDate;
      rental.dueDate       = dueDate;

      const book = await Book.findById(rental.book._id || rental.book);
      if (book) { book.stockCount = Math.max(0,(book.stockCount||0)-1); if(book.stockCount<=0) book.inStock=false; await book.save(); }
      await rental.save();

      await Notification.create({
        user:    rental.user,
        title:   "Payment Successful 💳",
        message: `Payment for "${rental.book?.title}" confirmed! Your rental starts today.`,
        type:    "rental",
      });

      res.json({ success: true, status: "Completed", rental });
    } else {
      res.json({ success: false, status: data.status });
    }
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── PUT /api/rentals/:id/return-confirm (Admin) ───────────────────────────────
router.put("/:id/return-confirm", protect, adminOnly, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) return res.status(404).json({ message: "Rental not found" });
    if (!["active","overdue"].includes(rental.rentalStatus))
      return res.status(400).json({ message: "Cannot confirm return" });

    const now = new Date();
    rental.returnedDate = now;
    rental.rentalStatus = "returned";
    if (rental.dueDate && now > rental.dueDate)
      rental.fine = Math.ceil((now - rental.dueDate) / 86400000) * FINE_PER_DAY;

    const book = await Book.findById(rental.book);
    if (book) { book.stockCount=(book.stockCount||0)+1; book.inStock=true; await book.save(); }
    await rental.save();

    const populated = await Rental.findById(rental._id)
      .populate("user","name email").populate("book","title author image price pricePerDay");
    res.json({ message: "Return confirmed", rental: populated });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;