const express = require("express");
const Pusher = require("pusher");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const pusher = new Pusher({
  appId: "2004792",
  key: "5c6d93290538e3d2fbda",
  secret: "048602b30ec836088197",
  cluster: "us2",
  useTLS: true
});

app.post("/send", (req, res) => {
  const message = req.body.message;
  pusher.trigger("my-channel", "my-event", {
    message: message
  });
  res.send({ sent: true });
});

app.listen(3000, () => {
  console.log("Sèvè ap koute sou pò 3000");
});
