require('dotenv').config(); // Fè sa yon sèl fwa an tèt

console.log("MONGODB_URI =>", process.env.MONGODB_URI);

const express = require("express");
const Pusher = require("pusher");
const cors = require("cors");
const fs = require("fs");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log("✅ MongoDB konekte avèk siksè !"))
.catch(err => console.error("❌ Erè koneksyon MongoDB:", err));

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  content: { type: String, required: true }
}, { timestamps: true });

const Message = mongoose.model("Message", messageSchema);

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

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

// --- Route tès ---
app.get("/", (req, res) => {
  res.send("Serve a ap mache");
});

// --- Route pou sove mesaj nan fichye ak Pusher
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

// --- Route pou sove mesaj nan MongoDB ak voye sou Pusher
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

// --- ADMIN DASHBOARD AK FONKSYONALITE NOUVO ---
app.get("/admin", basicAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let filter = {};
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const messages = await Message.find(filter).sort({ createdAt: -1 });

    let html = `
      <html>
        <head>
          <title>Admin Dashboard</title>
          <style>
            body { font-family: Arial; background: #f7f7f7; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 10px; border: 1px solid #ccc; }
            th { background-color: #4CAF50; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            input[type="text"], input[type="date"] { padding: 5px; }
            form { display: inline; }
            button { padding: 5px 10px; margin: 0 2px; }
          </style>
        </head>
        <body>
          <h2>📊 Mesaj ki sove</h2>
          <form method="GET" action="/admin">
            <label>Filtre ant de dat:</label>
            <input type="date" name="startDate" required />
            <input type="date" name="endDate" required />
            <button type="submit">Filtre</button>
          </form>

          <table>
            <tr>
              <th>Expediteur</th>
              <th>Contenu</th>
              <th>Lè</th>
              <th>Aksyon</th>
            </tr>
    `;

    messages.forEach(msg => {
      html += `
        <tr>
          <td>${escapeHtml(msg.sender)}</td>
          <td>${escapeHtml(msg.content)}</td>
          <td>${new Date(msg.createdAt).toLocaleString()}</td>
          <td>
            <form method="POST" action="/admin/reply/${msg._id}">
              <input type="text" name="reply" placeholder="Reponn..." required />
              <button type="submit">Repons</button>
            </form>
            <form method="POST" action="/admin/delete/${msg._id}" onsubmit="return confirm('Ou sèten ou vle efase mesaj sa a?');">
              <button style="color:red;">🗑 Supprimer</button>
            </form>
          </td>
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

// --- Delete mesaj ---
app.post('/admin/delete/:id', basicAuth, async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.redirect('/admin');
  } catch (err) {
    console.error("❌ Erè efase mesaj:", err);
    res.status(500).send("Pa kapab efase mesaj la.");
  }
});

// --- Repons a mesaj (pa email/log pou kounya) ---
app.post('/admin/reply/:id', basicAuth, async (req, res) => {
  const { reply } = req.body;
  const messageId = req.params.id;

  try {
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).send("Mesaj pa jwenn.");

    console.log(`✉️ Repons pou ${msg.sender}: ${reply}`);
    res.redirect('/admin');
  } catch (err) {
    console.error("❌ Erè repons:", err);
    res.status(500).send("Erè pandan ou t ap reponn mesaj la.");
  }
});

function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Sèvè ap koute sou pò ${PORT}`);
});
