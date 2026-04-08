const cors      = require("cors");
const express   = require("express");
const dotenv    = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();
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

const { startCronJobs } = require("./cronJobs");

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startCronJobs();
});