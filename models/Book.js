const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: { type: String, required: true },
    rating:   { type: Number, required: true, min: 1, max: 5 },
    comment:  { type: String, required: true },
  },
  { timestamps: true }
);

const bookSchema = new mongoose.Schema(
  {
    title:        { type: String, required: true },
    author:       { type: String, default: "" },
    description:  { type: String, required: true },
    genre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Genre",
      required: true,
    },
    image:        { type: String, default: "" },
    price:        { type: Number, default: 0 },       // buy price $
    pricePerDay:  { type: Number, default: 0 },       // rent price $/day
    inStock:      { type: Boolean, default: true },
    stockCount:   { type: Number, default: 0 },
    rentAvailable:{ type: Boolean, default: true },
    isFeatured:   { type: Boolean, default: false },
    rating:       { type: Number, default: 0 },       // auto-computed average
    reviews:      [reviewSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Book", bookSchema);