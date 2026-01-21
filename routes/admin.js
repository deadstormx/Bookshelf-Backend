router.get("/rentals", protect, adminOnly, async (req, res) => {
  const rentals = await Rental.find()
    .populate("user", "name email")
    .populate("book", "title");

  res.json(rentals);
});
