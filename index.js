require('dotenv').config(); // Pou li .env otomatik
const express = require("express");
const Pusher = require("pusher");
const cors = require("cors");
const fs = require("fs"); // <-- Nou ajoute sa pou sove fichye yo

const app = express();
app.use(cors());
app.use(express.json());

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});


app.post("/send", (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Mesaj pa ka vid." });
  }

  // Voye sou Pusher
  pusher.trigger("my-channel", "my-event", { message });

  // Prepare fichye
  const logMessage = `[${new Date().toISOString()}] ${message}\n`;

  // Sove mesaj la nan chat-log.txt
  fs.appendFile("chat-log.txt", logMessage, err => {
    if (err) {
      console.error("❌ Echèk pou sove mesaj:", err);
      return res.status(500).json({ sent: false, error: "Pa kapab sove mesaj." });
    }

    console.log("✅ Mesaj sovgade nan chat-log.txt");
    res.status(200).json({ sent: true });
  });
});


app.get("/", (req, res) => {
  res.send("Serve a ap mache");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sèvè ap koute sou pò ${PORT}`);
});

const mongoose = require('mongoose');



// Koneksyon ak MongoDB Atlas
mongoose.connect("mongodb+srv://adminfobas:Selvandieu509ranise@fobas-chat.rxmfd4k.mongodb.net/fobas_chat_db?retryWrites=true&w=majority&appName=fobas-chat", {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB konekte avèk siksè !"))
.catch(err => console.error("❌ Erè koneksyon MongoDB:", err));

const mongoose = require('mongoose');



// Modèl pou mesaj chat yo
const messageSchema = new mongoose.Schema({
  sender: String,
  content: String,
  timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);


// Egzanp ak Express + Pusher oswa Socket.io
app.post('/message', async (req, res) => {
  const { sender, content } = req.body;

  try {
    const newMsg = new Message({ sender, content });
    await newMsg.save();
    res.status(201).json({ message: "Mesaj sove ak siksè ✅" });
  } catch (err) {
    res.status(500).json({ error: "Erè pandan anrejistreman mesaj ❌" });
  }
});
