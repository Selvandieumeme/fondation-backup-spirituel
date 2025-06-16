require('dotenv').config(); // Fè sa yon sèl fwa an tèt

// 👇 Test si .env byen chaje
console.log("MONGODB_URI =>", process.env.MONGODB_URI);

const express = require("express");
const Pusher = require("pusher");
const cors = require("cors");
const fs = require("fs");
const mongoose = require("mongoose");

// 🟢 AJOUT ROUTE AUTH
const authRoutes = require('./routes/auth'); // 🟢 Route login/signup

const app = express();
app.use(cors());
app.use(express.json());

// 🟢 AKTIVE ROUTE AUTH
app.use('/api/auth', authRoutes); // 🟢 Fè route auth lan disponib

// 🔗 Koneksyon ak MongoDB (an sekirite)
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB konekte avèk siksè !"))
  .catch(err => console.error("❌ Erè koneksyon MongoDB:", err));

// ✅ DEFINISYON SCHEMA & MODÈL LA
const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  content: { type: String, required: true }
}, { timestamps: true });
const Message = mongoose.model("Message", messageSchema);

// ✅ [NOUVO] MODÈL User pou anrejistreman ak modpas
const bcrypt = require("bcrypt");
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

// 🔐 Pusher konfig
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

// --- Ajout route GET '/' pou evite 'Cannot GET /' ---
app.get('/', (req, res) => {
  res.send("✅ Sèvè a ap mache kòrèkteman sou Render!");
});

// ✅ ✅ ✅ AJOUT FINAL KI TRES ENPÒTAN POU RENDER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Serveur ap koute sou le port ${PORT}`);
});
