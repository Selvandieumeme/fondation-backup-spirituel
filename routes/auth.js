const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 🧠 Nou swete ou te deja mete model User nan index.js ou a
const User = mongoose.model('User');

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

    const user = new User({ username, email, password });
    await user.save();

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
