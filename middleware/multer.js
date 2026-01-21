const multer = require("multer");

// Set storage destination and filename
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // make sure uploads folder exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// Allow only images and PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only image and PDF files are allowed"), false);
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
