const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/User');

router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const newUser = new User({ username, email, password });
    await newUser.save();
    res.status(201).json({ message: "✅ Itilizatè kreye ak siksè" });
  } catch (err) {
    console.error("❌ Erè signup:", err);
    res.status(400).json({ error: "Signup echwe" });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "❌ Itilizatè pa jwenn" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "❌ Modpas pa bon" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ message: "✅ Login reyalize", token });
  } catch (err) {
    console.error("❌ Erè login:", err);
    res.status(500).json({ error: "Erè login" });
  }
});

module.exports = router;
