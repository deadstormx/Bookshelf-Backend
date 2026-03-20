const express = require("express");
const router  = express.Router();

// POST /api/chat — AI chatbot using Groq
router.post("/", async (req, res) => {
  const { message, history } = req.body;
  if (!message) return res.status(400).json({ message: "Message is required" });

  try {
    const messages = [
      {
        role: "system",
        content: `You are a helpful assistant for The BookShelf — an online bookstore and book rental platform in Nepal.
        You help users with:
        - Book recommendations based on their interests
        - Information about rental plans and pricing
        - How to rent and return books
        - Account and order questions
        - General book-related questions
        Keep responses concise, friendly and helpful.
        If asked about something unrelated to books or the bookstore, politely redirect to book topics.
        Use emojis occasionally to be friendly. Respond in the same language the user writes in.`
      },
      ...(history || []).map(h => ({
        role: h.role === "model" ? "assistant" : "user",
        content: h.parts[0].text
      })),
      { role: "user", content: message }
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Groq API error");

    const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't understand that.";
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;