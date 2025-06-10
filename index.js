require('dotenv').config(); // Pou .env
const express = require("express");
const Pusher = require("pusher");
const cors = require("cors");
const fs = require("fs");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

require('dotenv').config(); // Asire li monte premye

// 🔗 Koneksyon ak MongoDB (an sekirite)
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB konekte avèk siksè !"))
.catch(err => console.error("❌ Erè koneksyon MongoDB:", err));


// 🔧 Definisyon modèl pou mesaj
const messageSchema = new mongoose.Schema({
  sender: String,
  content: String,
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// 🔐 Pusher konfig
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

// ✅ Sove mesaj ak fichye + voye sou Pusher
app.post("/send", (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Mesaj pa ka vid." });
  }

  pusher.trigger("my-channel", "my-event", { message });

  const logMessage = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFile("chat-log.txt", logMessage, err => {
    if (err) {
      console.error("❌ Echèk pou sove mesaj:", err);
      return res.status(500).json({ sent: false, error: "Pa kapab sove mesaj." });
    }

    console.log("✅ Mesaj sovgade nan chat-log.txt");
    res.status(200).json({ sent: true });
  });
});

// ✅ Sove mesaj ak MongoDB + voye sou Pusher tou
app.post('/message', async (req, res) => {
  const { sender, content } = req.body;

  try {
    const newMsg = new Message({ sender, content });
    await newMsg.save();

    // Voye sou Pusher si ou vle
    pusher.trigger("chat-channel", "new-message", {
      sender,
      content,
      timestamp: newMsg.timestamp
    });

    res.status(201).json({ message: "Mesaj sove ak siksè ✅" });
  } catch (err) {
    console.error("❌ Erè:", err);
    res.status(500).json({ error: "Erè pandan anrejistreman mesaj" });
  }
});

// 🧪 Tès route
app.get("/", (req, res) => {
  res.send("Serve a ap mache");
});

// 🚀 Kòmanse sèvè a
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Sèvè ap koute sou pò ${PORT}`);
});
