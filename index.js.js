require('dotenv').config(); // Fè sa yon sèl fwa an tèt

// 👇 Test si .env byen chaje
console.log("MONGODB_URI =>", process.env.MONGODB_URI);

const express = require("express");
const Pusher = require("pusher");
const cors = require("cors");
const fs = require("fs");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

// 🔗 Koneksyon ak MongoDB (an sekirite)
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log("✅ MongoDB konekte avèk siksè !"))
.catch(err => console.error("❌ Erè koneksyon MongoDB:", err));

// ✅ DEFINISYON SCHEMA & MODÈL LA — bon plas!
const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  content: { type: String, required: true }
}, { timestamps: true }); // `createdAt` ak `updatedAt`

const Message = mongoose.model("Message", messageSchema);

// 🔐 Pusher konfig
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

// --- Middleware pou Basic Auth sou route admin ---
function basicAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Otorizasyon obligatwa');
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  if (
    username === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Non itilizatè oswa modpas pa kòrèk');
  }
}

// --- Route pou sove mesaj nan fichye ak voye sou Pusher ---
app.post("/send", (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Mesaj pa ka vid." });
  }

  pusher.trigger("my-channel", "my-event", { message }).catch(err => {
    console.error("❌ Erè Pusher trigger:", err);
  });

  const logMessage = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFile("chat-log.txt", logMessage, err => {
    if (err) {
      console.error("❌ Echèk pou sove mesaj:", err);
      return res.status(500).json({ sent: false, error: "Pa kapab sove mesaj." });
    } else {
      console.log("Mesaj la sove avèk siksè nan chat-log.txt");
      return res.status(200).json({ sent: true });
    }
  });
});

// --- Route pou sove mesaj nan MongoDB epi voye sou Pusher ---
app.post('/message', async (req, res) => {
  const { sender, content } = req.body;

  if (!sender || !content) {
    return res.status(400).json({ error: "Sender ak content obligatwa." });
  }

  try {
    const newMsg = new Message({ sender, content });
    await newMsg.save();

    pusher.trigger("chat-channel", "new-message", {
      sender,
      content,
      timestamp: newMsg.createdAt
    }).catch(err => {
      console.error("❌ Erè Pusher trigger:", err);
    });

    res.status(201).json({ message: "Mesaj sove ak siksè ✅" });
  } catch (err) {
    console.error("❌ Erè pandan anrejistreman mesaj:", err);
    res.status(500).json({ error: "Erè pandan anrejistreman mesaj" });
  }
});

// --- Route tès ---
app.get("/", (req, res) => {
  res.send("Serve a ap mache");
});

// --- Dashboard admin pou wè tout mesaj yo (pwoteje) ---
app.get("/admin", basicAuth, async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });

    let html = `
      <html>
        <head>
          <title>Admin Dashboard</title>
          <style>
            body { font-family: Arial; background: #f7f7f7; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 10px; border: 1px solid #ccc; }
            th { background-color: #4CAF50; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h2>📊 Mesaj ki sove</h2>
          <table>
            <tr>
              <th>Expediteur</th>
              <th>Contenu</th>
              <th>Lè li voye</th>
            </tr>
    `;

    messages.forEach(msg => {
      html += `
        <tr>
          <td>${escapeHtml(msg.sender)}</td>
          <td>${escapeHtml(msg.content)}</td>
          <td>${new Date(msg.createdAt).toLocaleString()}</td>
        </tr>
      `;
    });

    html += `
          </table>
        </body>
      </html>
    `;

    res.send(html);
  } catch (err) {
    console.error("❌ Erè admin dashboard:", err);
    res.status(500).send("Pa kapab chaje mesaj yo.");
  }
});

// --- Fonksyon pou evite XSS nan admin ---
function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --- Kòmanse sèvè a ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Sèvè ap koute sou pò ${PORT}`);
});
