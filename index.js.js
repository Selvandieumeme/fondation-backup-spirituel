require('dotenv').config(); // Fè sa yon sèl fwa an tèt

const express = require("express");
const path = require("path");
const Pusher = require("pusher");
const cors = require("cors");
const fs = require("fs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Kreye app la AVAN ou itilize li
const app = express();

// Test si .env byen chaje
console.log("MONGODB_URI =>", process.env.MONGODB_URI);

// MIddleware
app.use(cors());
app.use(express.json());

// Servi fichye static nan folder "public"
app.use(express.static(path.join(__dirname, "public")));

// 🟢 AJOUT ROUTE AUTH
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Konekte ak MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB konekte avèk siksè !"))
  .catch(err => console.error("❌ Erè koneksyon MongoDB:", err));

// Schemas & Models
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

// Route debaz
app.get('/', (req, res) => {
  res.send("✅ Sèvè a ap mache kòrèkteman sou Render!");
});

// Koute sou PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur ap koute sou le port ${PORT}`);
});
