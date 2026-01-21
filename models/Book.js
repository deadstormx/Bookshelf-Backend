const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    author: {
      type: String,
    },

    description: {
      type: String,
      required: true,
    },

    genre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Genre",
      required: true,
    },

    image: {
      type: String, // image URL
    },

    inStock: {
      type: Boolean,
      default: true,
    },

    rentAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Book", bookSchema);
