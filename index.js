require('dotenv').config(); // Fè sa yon sèl fwa an tèt

const express = require("express");
const path = require("path");
const Pusher = require("pusher");
const cors = require("cors");
const fs = require("fs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { Parser } = require("json2csv"); // CSV Export

// Kreye app la
const app = express();

// Test si .env byen chaje
console.log("MONGODB_URI =>", process.env.MONGODB_URI);

// Middleware JSON & CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"))); // Pou l ka sèvi admin si bezwen

// 🟢 ROUTES API: Auth routes yo vini ANVAN static
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send("✅ API Chat Fobas ap mache kòrèkteman sou Render!");
});

// ✅ ROUTE ADMIN LOGIN - AJOUT SÉCURISÉ
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;

app.get("/admin", (req, res) => {
  res.send(`
    <form method="POST" action="/admin" style="padding: 50px; font-family: sans-serif;">
      <h2>Connexion Admin</h2>
      <input type="text" name="username" placeholder="Nom d'utilisateur" required style="padding: 10px; margin: 10px 0; width: 100%;"><br>
      <input type="password" name="password" placeholder="Mot de passe" required style="padding: 10px; margin: 10px 0; width: 100%;"><br>
      <button type="submit" style="padding: 10px 20px;">Se connecter</button>
    </form>
  `);
});

app.post("/admin", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    res.send(`
      <h2>✅ Bienvenue administrateur Fobas!</h2>
      <p><a href="/admin/export-messages" target="_blank" style="padding: 10px; background: green; color: white; text-decoration: none;">📥 Telechaje CSV Mesaj</a></p>
      <form method="POST" action="/admin/delete-message" style="margin-top: 20px;">
        <input type="text" name="messageId" placeholder="Antre ID mesaj la pou efase" required style="padding: 8px; width: 300px;">
        <button type="submit" style="padding: 8px 15px; background: red; color: white;">🗑️ Efase Mesaj</button>
      </form>
    `);
  } else {
    res.status(401).send("❌ Erè: Enfòmasyon ou mete yo pa valab!");
  }
});

app.post("/admin/delete-message", async (req, res) => {
  const { messageId } = req.body;
  try {
    await Message.findByIdAndDelete(messageId);
    res.send(`<p>✅ Mesaj efase avèk siksè!</p><a href="/admin">Retounen</a>`);
  } catch (error) {
    res.status(500).send("❌ Erè pandan efasman mesaj la.");
  }
});

app.get("/admin/export-messages", async (req, res) => {
  try {
    const messages = await Message.find().lean();
    const fields = ["_id", "sender", "content", "createdAt"];
    const opts = { fields };
    const parser = new Parser(opts);
    const csv = parser.parse(messages);
    
    res.header("Content-Type", "text/csv");
    res.attachment("messages.csv");
    return res.send(csv);
  } catch (error) {
    console.error("❌ Erè ekspòtasyon:", error);
    res.status(500).send("Erè pandan ekspòtasyon CSV la.");
  }
});

// Koneksyon ak MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB konekte avèk siksè !"))
  .catch(err => console.error("❌ Erè koneksyon MongoDB:", err));

// Mongoose schemas
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

// Pusher config
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

// Koute sou PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur ap koute sou le port ${PORT}`);
});
