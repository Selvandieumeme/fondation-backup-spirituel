const express = require("express");
const Pusher = require("pusher");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || "2004792",
  key: process.env.PUSHER_KEY || "5c6d93290538e3d2fbda",
  secret: process.env.PUSHER_SECRET || "048602b30ec836088197",
  cluster: process.env.PUSHER_CLUSTER || "us2",
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
