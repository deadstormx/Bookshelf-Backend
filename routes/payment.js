// const express = require("express");
// const Rental = require("../models/Rental");
// const Book = require("../models/Book");
// const { protect } = require("../middleware/auth");

// const router = express.Router();

// router.post("/:rentalId", protect, async (req, res) => {
//   const rental = await Rental.findById(req.params.rentalId);
//   if (!rental) return res.status(404).json({ message: "Rental not found" });

//   rental.paymentStatus = "paid";
//   await rental.save();

//   const book = await Book.findById(rental.book);
//   book.inStock = false;
//   await book.save();

//   res.json({ message: "Payment successful & book rented" });
// });

// module.exports = router;







// const express = require("express");
// const router  = express.Router();
// const Order   = require("../models/Order");
// const { protect } = require("../middleware/auth");

// const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY;
// const KHALTI_API        = "https://dev.khalti.com/api/v2";
// const FRONTEND_URL      = "http://localhost:3000";

// // ── POST /api/payment/initiate ────────────────────────────────────────────────
// router.post("/initiate", protect, async (req, res) => {
//   const { items, totalAmount, shippingInfo } = req.body;

//   if (!items || items.length === 0)
//     return res.status(400).json({ message: "No items provided" });

//   try {
//     // Create pending order in DB
//     const order = await Order.create({
//       user:          req.user._id,
//       items,
//       totalAmount,
//       status:        "pending",
//       paymentMethod: "khalti",
//       shippingAddress: shippingInfo,
//     });

//     // Initiate Khalti payment
//     const response = await fetch(`${KHALTI_API}/epayment/initiate/`, {
//       method:  "POST",
//       headers: {
//         "Authorization": `Key ${KHALTI_SECRET_KEY}`,
//         "Content-Type":  "application/json",
//       },
//       body: JSON.stringify({
//         return_url:          `${FRONTEND_URL}/payment/verify`,
//         website_url:         FRONTEND_URL,
//         amount:              totalAmount * 100, // convert to paisa
//         purchase_order_id:   order._id.toString(),
//         purchase_order_name: `BookShelf Order #${order._id.toString().slice(-6)}`,
//         customer_info: {
//           name:  `${shippingInfo.firstName} ${shippingInfo.lastName}`,
//           email: shippingInfo.email,
//           phone: shippingInfo.phone,
//         },
//         product_details: items.map(item => ({
//           identity:    item.id || item._id || "book",
//           name:        item.title,
//           total_price: item.price * item.quantity * 100,
//           quantity:    item.quantity,
//           unit_price:  item.price * 100,
//         })),
//       }),
//     });

//     const data = await response.json();
//     if (!response.ok) throw new Error(JSON.stringify(data));

//     // Save pidx to order
//     order.pidx = data.pidx;
//     await order.save();

//     res.json({
//       payment_url: data.payment_url,
//       pidx:        data.pidx,
//       orderId:     order._id,
//     });
//   } catch (e) {
//     res.status(500).json({ message: e.message });
//   }
// });

// // ── POST /api/payment/verify ──────────────────────────────────────────────────
// router.post("/verify", protect, async (req, res) => {
//   const { pidx } = req.body;
//   if (!pidx) return res.status(400).json({ message: "pidx is required" });

//   try {
//     // Lookup payment status from Khalti
//     const response = await fetch(`${KHALTI_API}/epayment/lookup/`, {
//       method:  "POST",
//       headers: {
//         "Authorization": `Key ${KHALTI_SECRET_KEY}`,
//         "Content-Type":  "application/json",
//       },
//       body: JSON.stringify({ pidx }),
//     });

//     const data = await response.json();

//     // Find order by pidx
//     const order = await Order.findOne({ pidx });
//     if (!order) return res.status(404).json({ message: "Order not found" });

//     if (data.status === "Completed") {
//       order.status        = "paid";
//       order.transactionId = data.transaction_id;
//       order.khaltiStatus  = data.status;
//       await order.save();
//       res.json({ success: true, status: "Completed", order });
//     } else {
//       order.status       = "failed";
//       order.khaltiStatus = data.status;
//       await order.save();
//       res.json({ success: false, status: data.status, order });
//     }
//   } catch (e) {
//     res.status(500).json({ message: e.message });
//   }
// });

// // ── GET /api/payment/orders — user's order history ───────────────────────────
// router.get("/orders", protect, async (req, res) => {
//   try {
//     const orders = await Order.find({ user: req.user._id })
//       .sort({ createdAt: -1 });
//     res.json(orders);
//   } catch (e) {
//     res.status(500).json({ message: e.message });
//   }
// });

// module.exports = router;















































const express = require("express");
const router  = express.Router();
const Order   = require("../models/Order");
const { protect } = require("../middleware/auth");

const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY;
const KHALTI_API        = "https://dev.khalti.com/api/v2";
const FRONTEND_URL      = "http://localhost:3000";

// ── POST /api/payment/initiate ────────────────────────────────────────────────
router.post("/initiate", protect, async (req, res) => {
  const { items, totalAmount, shippingInfo } = req.body;

  if (!items || items.length === 0)
    return res.status(400).json({ message: "No items provided" });

  try {
    // Create pending order in DB
    const order = await Order.create({
      user:          req.user._id,
      items,
      totalAmount,
      status:        "pending",
      paymentMethod: "khalti",
      shippingAddress: shippingInfo,
    });

    // Initiate Khalti payment
    const response = await fetch(`${KHALTI_API}/epayment/initiate/`, {
      method:  "POST",
      headers: {
        "Authorization": `Key ${KHALTI_SECRET_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        return_url:          `${FRONTEND_URL}/payment/verify`,
        website_url:         FRONTEND_URL,
        amount:              totalAmount * 100, // convert to paisa
        purchase_order_id:   order._id.toString(),
        purchase_order_name: `BookShelf Order #${order._id.toString().slice(-6)}`,
        customer_info: {
          name:  `${shippingInfo.firstName} ${shippingInfo.lastName}`,
          email: shippingInfo.email,
          phone: shippingInfo.phone,
        },
        product_details: items.map(item => ({
          identity:    item.id || item._id || "book",
          name:        item.title,
          total_price: item.price * item.quantity * 100,
          quantity:    item.quantity,
          unit_price:  item.price * 100,
        })),
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));

    // Save pidx to order
    order.pidx = data.pidx;
    await order.save();

    res.json({
      payment_url: data.payment_url,
      pidx:        data.pidx,
      orderId:     order._id,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── POST /api/payment/verify ──────────────────────────────────────────────────
router.post("/verify", protect, async (req, res) => {
  const { pidx } = req.body;
  if (!pidx) return res.status(400).json({ message: "pidx is required" });

  try {
    // Lookup payment status from Khalti
    const response = await fetch(`${KHALTI_API}/epayment/lookup/`, {
      method:  "POST",
      headers: {
        "Authorization": `Key ${KHALTI_SECRET_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({ pidx }),
    });

    const data = await response.json();

    // Find order by pidx
    const order = await Order.findOne({ pidx });
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (data.status === "Completed") {
      order.status        = "paid";
      order.transactionId = data.transaction_id;
      order.khaltiStatus  = data.status;
      await order.save();
      res.json({ success: true, status: "Completed", order });
    } else {
      order.status       = "failed";
      order.khaltiStatus = data.status;
      await order.save();
      res.json({ success: false, status: data.status, order });
    }
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ── GET /api/payment/orders — user's order history ───────────────────────────
router.get("/orders", protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;

// ── GET /api/payment/admin/orders — all orders (admin) ───────────────────────
const { adminOnly } = require("../middleware/auth");
router.get("/admin/orders", protect, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── PUT /api/payment/orders/:id/status — update order status (admin) ─────────
router.put("/orders/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("user", "name email");
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── POST /api/payment/initiate-cod — Cash on Delivery ────────────────────────
router.post("/initiate-cod", protect, async (req, res) => {
  const { items, totalAmount, shippingInfo } = req.body;
  if (!items || items.length === 0)
    return res.status(400).json({ message: "No items provided" });
  try {
    const order = await Order.create({
      user:          req.user._id,
      items,
      totalAmount,
      status:        "pending",
      paymentMethod: "cod",
      shippingAddress: shippingInfo,
    });
    res.status(201).json({ message: "Order placed successfully", orderId: order._id });
  } catch (e) { res.status(500).json({ message: e.message }); }
});