require('dotenv').config(); // Pou li .env otomatik
const express = require("express");
const Pusher = require("pusher");
const cors = require("cors");

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

  pusher.trigger("my-channel", "my-event", {
    message: message
  });

  res.json({ sent: true });
});

app.get("/", (req, res) => {
  res.send("Serve a ap mache");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sèvè ap koute sou pò ${PORT}`);
});
