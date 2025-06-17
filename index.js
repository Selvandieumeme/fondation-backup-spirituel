require('dotenv').config(); // Fè sa yon sèl fwa an tèt

const express = require("express");
const path = require("path");
const Pusher = require("pusher");
const cors = require("cors");
const fs = require("fs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

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
    res.send("✅ Bienvenue administrateur Fobas!");
  } else {
    res.status(401).send("❌ Erè: Enfòmasyon ou mete yo pa valab!");
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

// 🔵 Si ou vle, ou ka mete route debaz sa si w ap teste API sèlman
// app.get('/', (req, res) => {
//   res.send("✅ Sèvè a ap mache kòrèkteman sou Render!");
// });

// Koute sou PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur ap koute sou le port ${PORT}`);
});
