const express = require("express");
const Genre = require("../models/Genre");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();


// 🔹 GET ALL GENRES (Public)
router.get("/", async (req, res) => {
  const genres = await Genre.find().sort({ name: 1 });
  res.json(genres);
});


// 🔹 CREATE GENRE (Admin)
router.post("/", protect, adminOnly, async (req, res) => {
  const { name } = req.body;

  const genre = await Genre.create({ name });
  res.status(201).json(genre);
});


// 🔹 UPDATE GENRE (Admin)
router.put("/:id", protect, adminOnly, async (req, res) => {
  const genre = await Genre.findByIdAndUpdate(
    req.params.id,
    { name: req.body.name },
    { new: true }
  );

  res.json(genre);
});


// 🔹 DELETE GENRE (Admin)
router.delete("/:id", protect, adminOnly, async (req, res) => {
  await Genre.findByIdAndDelete(req.params.id);
  res.json({ message: "Genre deleted" });
});

module.exports = router;
