const cors      = require("cors");
const express   = require("express");
const http      = require("http");
const { Server } = require("socket.io");
const dotenv    = require("dotenv");
const connectDB = require("./config/db");
const Message   = require("./models/Message");

dotenv.config();
connectDB();

const app    = express();
const server = http.createServer(app);          // wrap express in http server
const io     = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"],
  },
});

app.use(cors({ origin: ["http://localhost:3000", "http://localhost:3001"] }));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/auth",          require("./routes/auth"));
app.use("/api/genres",        require("./routes/genres"));
app.use("/api/books",         require("./routes/books"));
app.use("/api/rentals",       require("./routes/rentals"));
app.use("/api/users",         require("./routes/users"));
app.use("/api/payment",       require("./routes/payment"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/chat",          require("./routes/chat"));
app.use("/api/contact",       require("./routes/contact"));

// ── REST endpoints for chat history ──────────────────────────────────────────
const { protect, adminOnly } = require("./middleware/auth");

// User: fetch their own chat history
app.get("/api/support/history", protect, async (req, res) => {
  try {
    const msgs = await Message.find({ roomId: req.user._id.toString() })
      .sort({ createdAt: 1 })
      .limit(100);
    res.json(msgs);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Admin: get all conversation rooms (one per user who has chatted)
app.get("/api/support/rooms", protect, adminOnly, async (req, res) => {
  try {
    // Aggregate latest message per room + unread count + user name from User collection
    const rooms = await Message.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id:        "$roomId",
          lastMsg:    { $first: "$text" },
          lastTime:   { $first: "$createdAt" },
          unread:     { $sum: { $cond: [{ $and: [{ $eq: ["$sender","user"] }, { $eq: ["$read", false] }] }, 1, 0] } },
        },
      },
      { $sort: { lastTime: -1 } },
      // Look up the user's name and profileImage from the User collection
      {
        $addFields: {
          userObjectId: { $toObjectId: "$_id" },
        },
      },
      {
        $lookup: {
          from:         "users",
          localField:   "userObjectId",
          foreignField: "_id",
          as:           "userInfo",
        },
      },
      {
        $addFields: {
          userName:     { $ifNull: [{ $arrayElemAt: ["$userInfo.name", 0] }, "Unknown User"] },
          profileImage: { $ifNull: [{ $arrayElemAt: ["$userInfo.profileImage", 0] }, ""] },
        },
      },
      { $project: { userInfo: 0, userObjectId: 0 } },
    ]);
    res.json(rooms);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Admin: fetch full history of one room
app.get("/api/support/rooms/:roomId", protect, adminOnly, async (req, res) => {
  try {
    const msgs = await Message.find({ roomId: req.params.roomId })
      .sort({ createdAt: 1 })
      .limit(200);
    // Mark all user messages in this room as read
    await Message.updateMany(
      { roomId: req.params.roomId, sender: "user", read: false },
      { $set: { read: true } }
    );
    res.json(msgs);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ── Socket.IO live chat ───────────────────────────────────────────────────────
// Track which socket belongs to which userId (for admin → user routing)
const userSockets  = new Map(); // userId → socketId
const adminSockets = new Set(); // all admin socket ids

io.on("connection", (socket) => {

  // ── User joins their personal room ─────────────────────────────────────────
  socket.on("user:join", ({ userId, userName }) => {
    socket.join(`room:${userId}`);
    socket.data.userId   = userId;
    socket.data.userName = userName;
    socket.data.role     = "user";
    userSockets.set(userId, socket.id);
  });

  // ── Admin joins the admin room (sees all conversations) ────────────────────
  socket.on("admin:join", () => {
    socket.join("admin:room");
    socket.data.role = "admin";
    adminSockets.add(socket.id);
  });

  // ── User sends a message ───────────────────────────────────────────────────
  socket.on("user:message", async ({ userId, userName, text }) => {
    if (!text?.trim()) return;

    const msg = await Message.create({
      roomId:   userId,
      sender:   "user",
      senderId: userId,
      text:     text.trim(),
    });

    const payload = {
      _id:       msg._id,
      roomId:    userId,
      userName:  userName,
      sender:    "user",
      text:      msg.text,
      createdAt: msg.createdAt,
    };

    // Send back to the user's own room
    io.to(`room:${userId}`).emit("message:new", payload);
    // Notify all connected admins
    io.to("admin:room").emit("message:new", payload);
  });

  // ── Admin sends a reply to a specific user room ────────────────────────────
  socket.on("admin:message", async ({ roomId, text }) => {
    if (!text?.trim()) return;

    const msg = await Message.create({
      roomId,
      sender: "admin",
      text:   text.trim(),
      read:   true,
    });

    const payload = {
      _id:       msg._id,
      roomId,
      sender:    "admin",
      text:      msg.text,
      createdAt: msg.createdAt,
    };

    // Send to the user's room
    io.to(`room:${roomId}`).emit("message:new", payload);
    // Echo to all admins too (so multiple admin tabs stay in sync)
    io.to("admin:room").emit("message:new", payload);
  });

  // ── Typing indicators ──────────────────────────────────────────────────────
  socket.on("user:typing", ({ userId }) => {
    io.to("admin:room").emit("user:typing", { roomId: userId });
  });

  socket.on("admin:typing", ({ roomId }) => {
    io.to(`room:${roomId}`).emit("admin:typing");
  });

  // ── Cleanup ────────────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    if (socket.data.userId) userSockets.delete(socket.data.userId);
    adminSockets.delete(socket.id);
  });
});

const { startCronJobs } = require("./cronJobs");

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {          // listen on http server, not app
  console.log(`Server running on port ${PORT}`);
  startCronJobs();
});