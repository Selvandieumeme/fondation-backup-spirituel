require('dotenv').config(); // Fè sa yon sèl fwa an tèt

const express = require("express");
const path = require("path");
const Pusher = require("pusher");
const cors = require("cors");
const fs = require("fs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ✅ Log aksè yo
app.use((req, res, next) => {
  const logLine = `${new Date().toISOString()} | IP: ${req.ip} | Path: ${req.path}\n`;
  fs.appendFileSync("access-log.txt", logLine);
  next();
});

// ✅ Chemen sekirite admin lan
const SECURE_ADMIN_PATH = "/kontwol-fobas-sekirite";

// ✅ Règle sekirite
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
const ADMIN_SECRET_CODE = process.env.ADMIN_SECRET_CODE;
const ALLOWED_IP = process.env.ALLOWED_ADMIN_IP;

// ✅ Aksè ak fòm sekirite admin lan + verifikasyon IP
app.get(SECURE_ADMIN_PATH, (req, res) => {
  const realIP =
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null);

  console.log("🔍 Vre IP kap eseye antre:", realIP);

  if (ALLOWED_IP !== "*" && !realIP.includes(ALLOWED_IP)) {
    return res.status(403).send("❌ Ou pa gen dwa antre isit la");
  }

  const loginHtml = `
    <html>
    <head>
      <title>Kontwòl Sekirite Fobas</title>
    </head>
    <body style="font-family: sans-serif; padding: 30px">
      <h2>🔐 Antre Kòd Sekrè Administratè</h2>
      <form method="POST" action="/${SECURE_ADMIN_PATH.replace('/', '')}">
        <input type="password" name="secret" placeholder="Antre kòd la" required />
        <button type="submit">✅ Antre</button>
      </form>
    </body>
    </html>
  `;
  res.send(loginHtml);
});

// ✅ Tcheke si kòd sekrè admin lan kòrèk
app.post(SECURE_ADMIN_PATH, (req, res) => {
  const secret = req.body.secret;
  if (secret === ADMIN_SECRET_CODE) {
    res.redirect("/admin");
  } else {
    res.status(401).send("❌ Kòd sa pa kòrèk.");
  }
});

// ✅ Dashboard admin lan
app.get("/admin", async (req, res) => {
  const messages = await Message.find().sort({ createdAt: -1 });
  const users = await User.find().sort({ username: 1 });

  const dashboardHtml = `
    <html>
    <head>
      <style>
        body { background: #f4f4f4; font-family: Arial; padding: 30px; }
        h1, h2 { color: #111; }
        ul { list-style-type: none; padding: 0; }
        li { background: #fff; padding: 10px 15px; margin-bottom: 10px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .btn { border: none; padding: 8px 16px; border-radius: 4px; font-weight: bold; cursor: pointer; }
        .btn-export { background-color: #16a34a; color: white; margin-bottom: 20px; }
        .btn-delete { background-color: #dc2626; color: white; margin-left: 10px; }
      </style>
      <script>
        async function deleteMessage(id) {
          if (!confirm("Èske ou vle efase mesaj sa?")) return;
          const res = await fetch('/delete-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
          });
          if (res.ok) window.location.reload();
          else alert("❌ Erè pandan efasman.");
        }
      </script>
    </head>
    <body>
      <h1>✅ Bienvenue administratè Fobas!</h1>
      <p><strong>Koneksyon fèt:</strong> ${new Date().toLocaleString()}</p>
      <form action="/export" method="GET">
        <button class="btn btn-export">📁 Telechaje CSV</button>
      </form>
      <h2>🗣️ Dènye Mesaj yo</h2>
      <ul>
        ${messages.map(msg => `
          <li><strong>${msg.sender}:</strong> ${msg.content} <em> (${new Date(msg.createdAt).toLocaleString()})</em>
          <button class="btn btn-delete" onclick="deleteMessage('${msg._id}')">🗑️ Efase</button></li>`).join('')}
      </ul>
      <h2>👥 Lis Itilizatè yo</h2>
      <ul>
        ${users.map(user => `<li>${user.username} - ${user.email}</li>`).join('')}
      </ul>
    </body>
    </html>
  `;
  res.send(dashboardHtml);
});

// ✅ Login ak kòd sekrè
app.post("/admin", async (req, res) => {
  const { username, password, code } = req.body;
  if (
    username === ADMIN_USER &&
    password === ADMIN_PASS &&
    code === ADMIN_SECRET_CODE
  ) {
    res.redirect(SECURE_ADMIN_PATH);
  } else {
    res.status(401).send("❌ Enfòmasyon ou mete yo pa valab!");
  }
});

// ✅ Export CSV
app.get("/export", async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    const header = "ID,SENDER,CONTENT,DATE\n";
    const rows = messages.map(m => {
      return `"${m._id}","${m.sender}","${m.content.replace(/"/g, '""')}","${m.createdAt.toISOString()}"`;
    }).join("\n");
    res.header("Content-Type", "text/csv");
    res.attachment("messages.csv");
    return res.send(header + rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Erè pandan ekspòtasyon CSV.");
  }
});

// ✅ Efase mesaj
app.post("/delete-message", async (req, res) => {
  const { id } = req.body;
  try {
    await Message.findByIdAndDelete(id);
    res.status(200).send("✅ Mesaj efase.");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Erè pandan efasman mesaj la.");
  }
});

// ✅ Rès API yo
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send("✅ API Chat Fobas ap mache kòrèkteman sou Render!");
});

// ✅ MongoDB koneksyon
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB konekte avèk siksè !"))
  .catch(err => console.error("❌ Erè koneksyon MongoDB:", err));

// ✅ Modèl
const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  content: { type: String, required: true }
}, { timestamps: true });
const Message = mongoose.model("Message", messageSchema);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
const User = mongoose.model('User', userSchema);

// ✅ Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

// ✅ Start Serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur ap koute sou le port ${PORT}`);
});
