// const cloudinary = require("cloudinary").v2;
// const { CloudinaryStorage } = require("multer-storage-cloudinary");
// const multer = require("multer");

// cloudinary.config({
//   cloud_name: "diqzw8pd0",
//   api_key:    "942367524754317",
//   api_secret: "WO1p3DbNU9QtZfQXWmtnrgXJ0Xo",
// });

// // Storage for book cover images
// const bookStorage = new CloudinaryStorage({
//   cloudinary,
//   params: {
//     folder:         "bookshelf/books",
//     allowed_formats: ["jpg", "jpeg", "png", "webp"],
//     transformation: [{ width: 400, height: 600, crop: "fill" }],
//   },
// });

// // Storage for profile images
// const profileStorage = new CloudinaryStorage({
//   cloudinary,
//   params: {
//     folder:         "bookshelf/profiles",
//     allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
//     transformation: [{ width: 300, height: 300, crop: "fill", gravity: "face" }],
//   },
// });

// const uploadBook    = multer({ storage: bookStorage });
// const uploadProfile = multer({ storage: profileStorage });

// module.exports = { cloudinary, uploadBook, uploadProfile };















const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: "diqzw8pd0",
  api_key:    "942367524754317",
  api_secret: "WO1p3DbNU9QtZfQXWmtnrgXJ0Xo",
});

// Storage for book cover images
const bookStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         "bookshelf/books",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 400, height: 600, crop: "fill" }],
  },
});

// Storage for profile images
const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         "bookshelf/profiles",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    transformation: [{ width: 300, height: 300, crop: "fill", gravity: "face" }],
  },
});

const uploadBook    = multer({ storage: bookStorage });
const uploadProfile = multer({ storage: profileStorage });

module.exports = { cloudinary, uploadBook, uploadBookImage: uploadBook, uploadProfile, uploadProfileImage: uploadProfile };