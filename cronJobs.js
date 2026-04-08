const Rental       = require("./models/Rental");
const Notification = require("./models/Notification");

const FINE_PER_DAY = 5;

async function runRentalNotifications() {
  try {
    const now     = new Date();
    const rentals = await Rental.find({
      rentalStatus: { $in: ["active", "overdue"] },
      dueDate:      { $exists: true, $ne: null },
    }).populate("book", "title");

    for (const rental of rentals) {
      const dueDate   = new Date(rental.dueDate);
      const daysLeft  = Math.ceil((dueDate - now) / 86400000);
      const daysLate  = Math.ceil((now - dueDate) / 86400000);

      // 2 days before due — send reminder
      if (daysLeft === 2) {
        // Check if already sent today
        const existing = await Notification.findOne({
          user:      rental.user,
          title:     { $regex: "Due Soon" },
          createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
        });
        if (!existing) {
          await Notification.create({
            user:    rental.user,
            title:   "📚 Return Reminder",
            message: `Your rental of "${rental.book?.title}" is due in 2 days (${dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}). Please return it on time to avoid late fees.`,
            type:    "rental",
          });
        }
      }

      // Overdue — send daily fine notification
      if (daysLeft < 0) {
        rental.rentalStatus = "overdue";
        rental.fine = daysLate * FINE_PER_DAY;
        await rental.save();

        // Check if already sent today
        const existing = await Notification.findOne({
          user:      rental.user,
          title:     { $regex: "Overdue" },
          createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
        });
        if (!existing) {
          await Notification.create({
            user:    rental.user,
            title:   "⚠️ Overdue Rental",
            message: `Your rental of "${rental.book?.title}" is ${daysLate} day(s) overdue. Late fee: Rs ${rental.fine} (Rs ${FINE_PER_DAY}/day). Please return immediately.`,
            type:    "rental",
          });
        }
      }
    }
    console.log(`[Cron] Rental notifications checked at ${now.toLocaleTimeString()}`);
  } catch (e) {
    console.error("[Cron] Error:", e.message);
  }
}

// Run every hour
function startCronJobs() {
  runRentalNotifications(); // run immediately on start
  setInterval(runRentalNotifications, 60 * 60 * 1000); // then every hour
}

module.exports = { startCronJobs };