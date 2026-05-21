// const Rental       = require("./models/Rental");
// const Notification = require("./models/Notification");

// const FINE_PER_DAY = 5;

// async function runRentalNotifications() {
//   try {
//     const now     = new Date();
//     const rentals = await Rental.find({
//       rentalStatus: { $in: ["active", "overdue"] },
//       dueDate:      { $exists: true, $ne: null },
//     }).populate("book", "title");

//     for (const rental of rentals) {
//       const dueDate   = new Date(rental.dueDate);
//       const daysLeft  = Math.ceil((dueDate - now) / 86400000);
//       const daysLate  = Math.ceil((now - dueDate) / 86400000);

//       // 2 days before due — send reminder
//       if (daysLeft === 2) {
//         // Check if already sent today
//         const existing = await Notification.findOne({
//           user:      rental.user,
//           title:     { $regex: "Due Soon" },
//           createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
//         });
//         if (!existing) {
//           await Notification.create({
//             user:    rental.user,
//             title:   "📚 Return Reminder",
//             message: `Your rental of "${rental.book?.title}" is due in 2 days (${dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}). Please return it on time to avoid late fees.`,
//             type:    "rental",
//           });
//         }
//       }

//       // Overdue — send daily fine notification
//       if (daysLeft < 0) {
//         rental.rentalStatus = "overdue";
//         rental.fine = daysLate * FINE_PER_DAY;
//         await rental.save();

//         // Check if already sent today
//         const existing = await Notification.findOne({
//           user:      rental.user,
//           title:     { $regex: "Overdue" },
//           createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
//         });
//         if (!existing) {
//           await Notification.create({
//             user:    rental.user,
//             title:   "⚠️ Overdue Rental",
//             message: `Your rental of "${rental.book?.title}" is ${daysLate} day(s) overdue. Late fee: Rs ${rental.fine} (Rs ${FINE_PER_DAY}/day). Please return immediately.`,
//             type:    "rental",
//           });
//         }
//       }
//     }
//     console.log(`[Cron] Rental notifications checked at ${now.toLocaleTimeString()}`);
//   } catch (e) {
//     console.error("[Cron] Error:", e.message);
//   }
// }

// // Run every hour
// function startCronJobs() {
//   runRentalNotifications(); // run immediately on start
//   setInterval(runRentalNotifications, 60 * 60 * 1000); // then every hour
// }

// module.exports = { startCronJobs };




























// const Rental       = require("./models/Rental");
// const Notification = require("./models/Notification");
// const nodemailer   = require("nodemailer");

// const FINE_PER_DAY = 5;

// // ── Email transporter ─────────────────────────────────────────────────────────
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
// });

// // ── Send reminder email ───────────────────────────────────────────────────────
// async function sendReminderEmail({ to, name, bookTitle, dueDate }) {
//   const dueDateStr = new Date(dueDate).toLocaleDateString("en-US", {
//     weekday: "long", month: "long", day: "numeric", year: "numeric",
//   });

//   const html = `
//   <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
//     <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:28px 24px;text-align:center">
//       <h1 style="color:white;margin:0;font-size:24px">📚 The BookShelf</h1>
//       <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:14px">Rental Due Date Reminder</p>
//     </div>
//     <div style="padding:28px 24px">
//       <p style="font-size:16px;color:#111827;margin:0 0 8px">Hello, <strong>${name}</strong>!</p>
//       <p style="color:#6b7280;font-size:14px;margin:0 0 20px">
//         This is a friendly reminder that your rental is due in <strong style="color:#d97706">2 days</strong>.
//       </p>

//       <div style="background:#fef3c7;border-radius:10px;padding:16px 20px;margin-bottom:20px;border-left:4px solid #f59e0b">
//         <table style="width:100%;font-size:13px">
//           <tr>
//             <td style="color:#92400e;padding:4px 0;font-weight:500">Book</td>
//             <td style="text-align:right;color:#111827;font-weight:600">${bookTitle}</td>
//           </tr>
//           <tr>
//             <td style="color:#92400e;padding:4px 0;font-weight:500">Due Date</td>
//             <td style="text-align:right;color:#d97706;font-weight:700">${dueDateStr}</td>
//           </tr>
//           <tr>
//             <td style="color:#92400e;padding:4px 0;font-weight:500">Late Fee</td>
//             <td style="text-align:right;color:#dc2626;font-weight:600">Rs ${FINE_PER_DAY}/day after due date</td>
//           </tr>
//         </table>
//       </div>

//       <div style="background:#f0fdf4;border-radius:10px;padding:14px 18px;border-left:4px solid #059669;margin-bottom:20px">
//         <p style="margin:0;font-size:13px;color:#065f46">
//           Please return the book to our store at <strong>Lubhu, Lalitpur</strong> by the due date to avoid late fees.
//           You can also request a return from your <a href="http://localhost:3000/rental-history" style="color:#059669">Rental History</a> page.
//         </p>
//       </div>

//       <p style="color:#9ca3af;font-size:12px;margin:0">
//         If you have already returned the book, please ignore this email.
//         Questions? Contact us at <a href="mailto:${process.env.EMAIL_USER}" style="color:#f59e0b">${process.env.EMAIL_USER}</a>
//       </p>
//     </div>
//     <div style="background:#f9fafb;padding:12px 24px;text-align:center;border-top:1px solid #e5e7eb">
//       <p style="margin:0;font-size:12px;color:#9ca3af">© 2024 The BookShelf · Lubhu, Lalitpur, Nepal</p>
//     </div>
//   </div>`;

//   try {
//     await transporter.sendMail({
//       from:    `"The BookShelf" <${process.env.EMAIL_USER}>`,
//       to,
//       subject: `⏰ Reminder: "${bookTitle}" is due in 2 days`,
//       html,
//     });
//     console.log(`[Cron] Reminder email sent to ${to}`);
//   } catch (e) {
//     console.error(`[Cron] Failed to send reminder email to ${to}:`, e.message);
//   }
// }

// // ── Send overdue email ────────────────────────────────────────────────────────
// async function sendOverdueEmail({ to, name, bookTitle, daysLate, fine }) {
//   const html = `
//   <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
//     <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:28px 24px;text-align:center">
//       <h1 style="color:white;margin:0;font-size:24px">📚 The BookShelf</h1>
//       <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:14px">Overdue Rental Notice</p>
//     </div>
//     <div style="padding:28px 24px">
//       <p style="font-size:16px;color:#111827;margin:0 0 8px">Hello, <strong>${name}</strong>,</p>
//       <p style="color:#6b7280;font-size:14px;margin:0 0 20px">
//         Your rental is <strong style="color:#dc2626">${daysLate} day(s) overdue</strong>. Please return it as soon as possible.
//       </p>

//       <div style="background:#fef2f2;border-radius:10px;padding:16px 20px;margin-bottom:20px;border-left:4px solid #dc2626">
//         <table style="width:100%;font-size:13px">
//           <tr>
//             <td style="color:#991b1b;padding:4px 0;font-weight:500">Book</td>
//             <td style="text-align:right;color:#111827;font-weight:600">${bookTitle}</td>
//           </tr>
//           <tr>
//             <td style="color:#991b1b;padding:4px 0;font-weight:500">Days Overdue</td>
//             <td style="text-align:right;color:#dc2626;font-weight:700">${daysLate} days</td>
//           </tr>
//           <tr>
//             <td style="color:#991b1b;padding:4px 0;font-weight:500">Late Fee So Far</td>
//             <td style="text-align:right;color:#dc2626;font-weight:700">Rs ${fine}</td>
//           </tr>
//           <tr>
//             <td style="color:#991b1b;padding:4px 0;font-weight:500">Fee Rate</td>
//             <td style="text-align:right;color:#6b7280">Rs ${FINE_PER_DAY}/day</td>
//           </tr>
//         </table>
//       </div>

//       <div style="background:#fef2f2;border-radius:10px;padding:14px 18px;border-left:4px solid #dc2626;margin-bottom:20px">
//         <p style="margin:0;font-size:13px;color:#991b1b">
//           Please return <strong>${bookTitle}</strong> to our store at <strong>Lubhu, Lalitpur</strong> immediately to stop further charges. 
//           You can initiate a return from your <a href="http://localhost:3000/rental-history" style="color:#dc2626">Rental History</a> page.
//         </p>
//       </div>

//       <p style="color:#9ca3af;font-size:12px;margin:0">
//         Questions? Contact us at <a href="mailto:${process.env.EMAIL_USER}" style="color:#dc2626">${process.env.EMAIL_USER}</a>
//       </p>
//     </div>
//     <div style="background:#f9fafb;padding:12px 24px;text-align:center;border-top:1px solid #e5e7eb">
//       <p style="margin:0;font-size:12px;color:#9ca3af">© 2024 The BookShelf · Lubhu, Lalitpur, Nepal</p>
//     </div>
//   </div>`;

//   try {
//     await transporter.sendMail({
//       from:    `"The BookShelf" <${process.env.EMAIL_USER}>`,
//       to,
//       subject: `⚠️ Overdue: "${bookTitle}" — Rs ${fine} late fee`,
//       html,
//     });
//     console.log(`[Cron] Overdue email sent to ${to}`);
//   } catch (e) {
//     console.error(`[Cron] Failed to send overdue email to ${to}:`, e.message);
//   }
// }

// // ── Main cron function ────────────────────────────────────────────────────────
// async function runRentalNotifications() {
//   try {
//     const now     = new Date();
//     const rentals = await Rental.find({
//       rentalStatus: { $in: ["active", "overdue"] },
//       dueDate:      { $exists: true, $ne: null },
//     })
//       .populate("book", "title")
//       .populate("user", "name email");   // ← also fetch user email for emails

//     for (const rental of rentals) {
//       const dueDate  = new Date(rental.dueDate);
//       const daysLeft = Math.ceil((dueDate - now) / 86400000);
//       const daysLate = Math.ceil((now - dueDate) / 86400000);

//       // ── 2 days before due — reminder ─────────────────────────────────────
//       if (daysLeft === 2) {
//         const existing = await Notification.findOne({
//           user:      rental.user._id,
//           title:     { $regex: "Reminder" },
//           createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
//         });

//         if (!existing) {
//           // DB notification (bell icon)
//           await Notification.create({
//             user:    rental.user._id,
//             title:   "📚 Return Reminder",
//             message: `Your rental of "${rental.book?.title}" is due in 2 days (${dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}). Please return it on time to avoid late fees.`,
//             type:    "rental",
//           });

//           // Email reminder
//           if (rental.user?.email) {
//             await sendReminderEmail({
//               to:        rental.user.email,
//               name:      rental.user.name,
//               bookTitle: rental.book?.title || "your book",
//               dueDate:   rental.dueDate,
//             });
//           }
//         }
//       }

//       // ── Overdue — fine + daily notification ──────────────────────────────
//       if (daysLeft < 0) {
//         rental.rentalStatus = "overdue";
//         rental.fine         = daysLate * FINE_PER_DAY;
//         await rental.save();

//         const existing = await Notification.findOne({
//           user:      rental.user._id,
//           title:     { $regex: "Overdue" },
//           createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
//         });

//         if (!existing) {
//           // DB notification (bell icon)
//           await Notification.create({
//             user:    rental.user._id,
//             title:   "⚠️ Overdue Rental",
//             message: `Your rental of "${rental.book?.title}" is ${daysLate} day(s) overdue. Late fee: Rs ${rental.fine} (Rs ${FINE_PER_DAY}/day). Please return immediately.`,
//             type:    "rental",
//           });

//           // Overdue email (once per day)
//           if (rental.user?.email) {
//             await sendOverdueEmail({
//               to:        rental.user.email,
//               name:      rental.user.name,
//               bookTitle: rental.book?.title || "your book",
//               daysLate,
//               fine:      rental.fine,
//             });
//           }
//         }
//       }
//     }
//     console.log(`[Cron] Rental notifications checked at ${now.toLocaleTimeString()}`);
//   } catch (e) {
//     console.error("[Cron] Error:", e.message);
//   }
// }

// // ── Start cron — runs every hour ──────────────────────────────────────────────
// function startCronJobs() {
//   runRentalNotifications();
//   setInterval(runRentalNotifications, 60 * 60 * 1000);
// }

// module.exports = { startCronJobs };



































































const Rental       = require("./models/Rental");
const Notification = require("./models/Notification");
const nodemailer   = require("nodemailer");

const FINE_PER_DAY = 5;

// ── Email transporter ─────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

// ── Send reminder email ───────────────────────────────────────────────────────
async function sendReminderEmail({ to, name, bookTitle, dueDate }) {
  const dueDateStr = new Date(dueDate).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:28px 24px;text-align:center">
      <h1 style="color:white;margin:0;font-size:24px">📚 The BookShelf</h1>
      <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:14px">Rental Due Date Reminder</p>
    </div>
    <div style="padding:28px 24px">
      <p style="font-size:16px;color:#111827;margin:0 0 8px">Hello, <strong>${name}</strong>!</p>
      <p style="color:#6b7280;font-size:14px;margin:0 0 20px">Your rental is due in <strong style="color:#d97706">2 days</strong>.</p>
      <div style="background:#fef3c7;border-radius:10px;padding:16px 20px;margin-bottom:20px;border-left:4px solid #f59e0b">
        <table style="width:100%;font-size:13px">
          <tr><td style="color:#92400e;padding:4px 0;font-weight:500">Book</td><td style="text-align:right;font-weight:600">${bookTitle}</td></tr>
          <tr><td style="color:#92400e;padding:4px 0;font-weight:500">Due Date</td><td style="text-align:right;color:#d97706;font-weight:700">${dueDateStr}</td></tr>
          <tr><td style="color:#92400e;padding:4px 0;font-weight:500">Late Fee</td><td style="text-align:right;color:#dc2626;font-weight:600">Rs ${FINE_PER_DAY}/day after due</td></tr>
        </table>
      </div>
      <p style="color:#9ca3af;font-size:12px">Please return to our store at <strong>Lubhu, Lalitpur</strong> by the due date.</p>
    </div>
    <div style="background:#f9fafb;padding:12px 24px;text-align:center;border-top:1px solid #e5e7eb">
      <p style="margin:0;font-size:12px;color:#9ca3af">© 2024 The BookShelf · Lubhu, Lalitpur, Nepal</p>
    </div>
  </div>`;
  try {
    await transporter.sendMail({
      from: `"The BookShelf" <${process.env.EMAIL_USER}>`,
      to, subject: `⏰ Reminder: "${bookTitle}" is due in 2 days`, html,
    });
    console.log(`[Cron] Reminder email sent to ${to}`);
  } catch (e) {
    console.error(`[Cron] Reminder email failed:`, e.message);
  }
}

// ── Send overdue email ────────────────────────────────────────────────────────
async function sendOverdueEmail({ to, name, bookTitle, daysLate, fine }) {
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:28px 24px;text-align:center">
      <h1 style="color:white;margin:0;font-size:24px">📚 The BookShelf</h1>
      <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:14px">Overdue Rental Notice</p>
    </div>
    <div style="padding:28px 24px">
      <p style="font-size:16px;color:#111827;margin:0 0 8px">Hello, <strong>${name}</strong>,</p>
      <p style="color:#6b7280;font-size:14px;margin:0 0 20px">Your rental is <strong style="color:#dc2626">${daysLate} day(s) overdue</strong>.</p>
      <div style="background:#fef2f2;border-radius:10px;padding:16px 20px;margin-bottom:20px;border-left:4px solid #dc2626">
        <table style="width:100%;font-size:13px">
          <tr><td style="color:#991b1b;padding:4px 0;font-weight:500">Book</td><td style="text-align:right;font-weight:600">${bookTitle}</td></tr>
          <tr><td style="color:#991b1b;padding:4px 0;font-weight:500">Days Overdue</td><td style="text-align:right;color:#dc2626;font-weight:700">${daysLate} days</td></tr>
          <tr><td style="color:#991b1b;padding:4px 0;font-weight:500">Late Fee</td><td style="text-align:right;color:#dc2626;font-weight:700">Rs ${fine}</td></tr>
        </table>
      </div>
      <p style="color:#9ca3af;font-size:12px">Please return immediately to stop further charges.</p>
    </div>
    <div style="background:#f9fafb;padding:12px 24px;text-align:center;border-top:1px solid #e5e7eb">
      <p style="margin:0;font-size:12px;color:#9ca3af">© 2024 The BookShelf · Lubhu, Lalitpur, Nepal</p>
    </div>
  </div>`;
  try {
    await transporter.sendMail({
      from: `"The BookShelf" <${process.env.EMAIL_USER}>`,
      to, subject: `⚠️ Overdue: "${bookTitle}" — Rs ${fine} late fee`, html,
    });
    console.log(`[Cron] Overdue email sent to ${to}`);
  } catch (e) {
    console.error(`[Cron] Overdue email failed:`, e.message);
  }
}

// ── Main cron function ────────────────────────────────────────────────────────
async function runRentalNotifications() {
  try {
    const now     = new Date();
    const rentals = await Rental.find({
      rentalStatus: { $in: ["active", "overdue"] },
      dueDate:      { $exists: true, $ne: null },
    })
      .populate("book", "title")
      .populate("user", "name email");

    for (const rental of rentals) {
      // ── Skip if user or book was deleted ────────────────────────────────
      if (!rental.user || !rental.user._id) continue;
      if (!rental.book)                      continue;

      const userId   = rental.user._id;
      const dueDate  = new Date(rental.dueDate);
      const daysLeft = Math.ceil((dueDate - now) / 86400000);
      const daysLate = Math.ceil((now - dueDate) / 86400000);

      // ── 2 days before due — reminder ─────────────────────────────────────
      if (daysLeft === 2) {
        const existing = await Notification.findOne({
          user:      userId,
          title:     { $regex: "Reminder" },
          createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
        });
        if (!existing) {
          await Notification.create({
            user:    userId,
            title:   "📚 Return Reminder",
            message: `Your rental of "${rental.book.title}" is due in 2 days (${dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}). Please return it on time to avoid late fees.`,
            type:    "rental",
          });
          if (rental.user.email) {
            await sendReminderEmail({
              to:        rental.user.email,
              name:      rental.user.name,
              bookTitle: rental.book.title,
              dueDate:   rental.dueDate,
            });
          }
        }
      }

      // ── Overdue — fine + daily notification ──────────────────────────────
      if (daysLeft < 0) {
        rental.rentalStatus = "overdue";
        rental.fine         = daysLate * FINE_PER_DAY;
        await rental.save();

        const existing = await Notification.findOne({
          user:      userId,
          title:     { $regex: "Overdue" },
          createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
        });
        if (!existing) {
          await Notification.create({
            user:    userId,
            title:   "⚠️ Overdue Rental",
            message: `Your rental of "${rental.book.title}" is ${daysLate} day(s) overdue. Late fee: Rs ${rental.fine} (Rs ${FINE_PER_DAY}/day). Please return immediately.`,
            type:    "rental",
          });
          if (rental.user.email) {
            await sendOverdueEmail({
              to:        rental.user.email,
              name:      rental.user.name,
              bookTitle: rental.book.title,
              daysLate,
              fine:      rental.fine,
            });
          }
        }
      }
    }
    console.log(`[Cron] Rental notifications checked at ${now.toLocaleTimeString()}`);
  } catch (e) {
    console.error("[Cron] Error:", e.message);
  }
}

// ── Start cron — runs every hour ──────────────────────────────────────────────
function startCronJobs() {
  runRentalNotifications();
  setInterval(runRentalNotifications, 60 * 60 * 1000);
}

module.exports = { startCronJobs };