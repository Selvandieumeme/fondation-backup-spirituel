const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user'); // ✅ Ranje non model la (User ak U majiskil)
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

// SIGN UP route
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.json({ success: false, message: "Email sa deja egziste." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username: name,
      email,
      password: hashedPassword,
      isVerified: false
    });

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1h"
    });

    const confirmLink = `https://chat-en-direct-fobas.onrender.com/api/auth/confirm/${token}`;

    await transporter.sendMail({
      from: `"Fobas Sekirite" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "✅ Konfimasyon Kont ou",
      html: `
        <p>Bonjou ${name},</p>
        <p>Klike sou bouton sa pou konfime kont ou:</p>
        <p><a href="${confirmLink}" target="_blank" style="background-color:#2563eb;color:white;padding:10px 15px;border-radius:5px;text-decoration:none;">Konfime Kont mwen</a></p>
        <p>Si ou pa t kreye kont sa, ou ka ignore mesaj sa.</p>
      `
    });

    res.json({ success: true, message: "✅ Kont kreye. Tanpri verifye imel ou." });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ success: false, message: "❌ Erè pandan enskripsyon." });
  }
});

// KONFIMASYON route
router.get("/confirm/:token", async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    await User.findByIdAndUpdate(decoded.id, { isVerified: true });
    res.send("✅ Bravo! Kont ou verifye. Ou ka konekte kounya.");
  } catch (err) {
    res.status(400).send("❌ Token pa valab oswa ekspire.");
  }
});




// 🔐 Sekrè pou JWT
const JWT_SECRET = process.env.JWT_SECRET || "backupsecret"; // mete sa nan .env ou

// ✅ Signup (kreye kont)
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "Tout chan obligatwa." });
  }

  try {
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(409).json({ error: "Itilizatè oswa imel deja egziste." });
    }

    const newUser = new User({ username, email, password });
    await newUser.save();

    res.status(201).json({ message: "✅ Kont kreye avèk siksè!" });
  } catch (e) {
    console.error("❌ Erè signup:", e);
    res.status(500).json({ error: "Erè pandan kreasyon kont." });
  }
});

// ✅ Login (konekte)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Imel ak modpas obligatwa." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Itilizatè pa jwenn." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Modpas pa bon." });

    // ✅ Kreye token
    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '2h' });

    res.status(200).json({
      message: "✅ Login reyisi!",
      token,
      user: { username: user.username, email: user.email }
    });
  } catch (e) {
    console.error("❌ Erè login:", e);
    res.status(500).json({ error: "Erè pandan login." });
  }
});

module.exports = router;
