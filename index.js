require('dotenv').config(); // Fè sa yon sèl fwa an tèt


const express = require("express");
const path = require("path");
const Pusher = require("pusher");
const cors = require("cors");
const fs = require("fs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const session = require("express-session");
const crypto = require("crypto");

const app = express();

console.log("MONGODB_URI =>", process.env.MONGODB_URI);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ✅ Session setup pou admin otantifikasyon
app.use(session({
  secret: crypto.randomBytes(64).toString("hex"),
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3600000 } // 1h
}));

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send("✅ API Chat Fobas ap mache kòrèkteman sou Render!");
});

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

// ✅ Middleware pou verifye si admin konekte
function verifyAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    next();
  } else {
    res.redirect("/admin/login");
  }
}

app.get("/admin/login", (req, res) => {
  res.send(`
    <form method="POST" action="/admin/login" style="padding: 50px; font-family: sans-serif;">
      <h2>Connexion Admin</h2>
      <input type="text" name="username" placeholder="Nom d'utilisateur" required style="padding: 10px; margin: 10px 0; width: 100%;"><br>
      <input type="password" name="password" placeholder="Mot de passe" required style="padding: 10px; margin: 10px 0; width: 100%;"><br>
      <button type="submit" style="padding: 10px 20px;">Se connecter</button>
    </form>
  `);
});

app.post("/admin/login", async (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.isAdmin = true;
    res.redirect("/admin");
  } else {
    res.status(401).send("❌ Erè: Enfòmasyon ou mete yo pa valab!");
  }
});

app.get("/admin", verifyAdmin, async (req, res) => {
  const messages = await Message.find().sort({ createdAt: -1 });
  const users = await User.find().sort({ username: 1 });

  const dashboardHtml = `
    <div style="padding: 30px; font-family: sans-serif;">
      <h1>✅ Bienvenue administrateur Fobas!</h1>
      <p><strong>Koneksyon fèt:</strong> ${new Date().toLocaleString()}</p>

      <form action="/export" method="GET" style="margin-bottom: 20px;">
        <button type="submit" style="padding: 10px 20px; background: green; color: white; border: none;">📁 Telechaje CSV</button>
      </form>

      <form action="/admin/logout" method="POST" style="margin-bottom: 20px;">
        <button type="submit" style="padding: 10px 20px; background: #333; color: white; border: none;">🔓 Dekonekte</button>
      </form>

      <h2>🗣️ Dènye Mesaj yo</h2>
      <ul>
        ${messages.map(msg => `
          <li>
            <strong>${msg.sender}:</strong> ${msg.content} (${new Date(msg.createdAt).toLocaleString()})
            <form method="POST" action="/delete-message" style="display:inline;">
              <input type="hidden" name="id" value="${msg._id}" />
              <button type="submit" style="color:red; margin-left:10px;">🗑️ Efase</button>
            </form>
          </li>
        `).join('')}
      </ul>

      <h2>👥 Lis Itilizatè yo</h2>
      <ul>
        ${users.map(user => `<li>${user.username} - ${user.email}</li>`).join('')}
      </ul>
    </div>
  `;
  res.send(dashboardHtml);
});

app.post("/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin/login");
  });
});

app.get("/export", verifyAdmin, async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    const header = "ID,SENDER,CONTENT,DATE\n";
    const rows = messages.map(m => {
      return `"${m._id}","${m.sender}","${m.content.replace(/"/g, '""')}","${m.createdAt.toISOString()}"`;
    }).join("\n");
    const csv = header + rows;

    res.header("Content-Type", "text/csv");
    res.attachment("messages.csv");
    return res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Erè pandan ekspòtasyon CSV.");
  }
});

app.post("/delete-message", verifyAdmin, async (req, res) => {
  const { id } = req.body;
  try {
    await Message.findByIdAndDelete(id);
    res.redirect("/admin");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Erè pandan efasman mesaj la.");
  }
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB konekte avèk siksè !"))
  .catch(err => console.error("❌ Erè koneksyon MongoDB:", err));

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

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur ap koute sou le port ${PORT}`);
});
