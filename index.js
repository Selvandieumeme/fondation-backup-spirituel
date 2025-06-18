require('dotenv').config(); // Fè sa yon sèl fwa an tèt



const express = require("express");
const path = require("path");
const Pusher = require("pusher");
const cors = require("cors");
const fs = require("fs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const session = require("express-session");
const MongoStore = require("connect-mongo");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// --- Session MongoDB ---
app.use(
  session({
    secret: 'fobas_session_secret_key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: { maxAge: 3600000 },
  })
);

// --- Log aksè ---
app.use((req, res, next) => {
  const logLine = `${new Date().toISOString()} | IP: ${req.ip} | Path: ${req.path}\n`;
  fs.appendFileSync("access-log.txt", logLine);
  next();
});

const SECURE_ADMIN_PATH = "/kontwol-fobas-sekirite";
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
const ADMIN_SECRET_CODE = process.env.ADMIN_SECRET_CODE;
const ALLOWED_IP = process.env.ALLOWED_ADMIN_IP;
let failedAttempts = 0;

// --- Verify IP ---
app.use((req, res, next) => {
  const realIP =
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null);
  console.log("🔍 Vre IP kap eseye antre:", realIP);
  if (ALLOWED_IP !== "*" && !realIP.includes(ALLOWED_IP)) {
    return res.status(403).send("❌ Ou pa gen dwa antre isit la");
  }
  next();
});

// --- Login admin ---
app.get(SECURE_ADMIN_PATH, (req, res) => {
  if (req.session.isAdmin) return res.redirect("/admin");
  if (failedAttempts >= 3) return res.status(403).send("❌ Ou bloke.");
  res.send(`
    <html><body style="font-family:sans-serif; padding:30px">
      <h2>🔐 Login Admin (3 eleman)</h2>
      <form method="POST" action="${SECURE_ADMIN_PATH}">
        <input name="username" placeholder="Non itilizatè" required><br><br>
        <input name="password" type="password" placeholder="Modpas" required><br><br>
        <input name="secret" placeholder="Kòd sekrè" required><br><br>
        <button>Antre</button>
      </form>
      <p>Tantativ echwe: ${failedAttempts}/3</p>
    </body></html>
  `);
});

app.post(SECURE_ADMIN_PATH, (req, res) => {
  const { username, password, secret } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS && secret === ADMIN_SECRET_CODE) {
    req.session.isAdmin = true;
    failedAttempts = 0;
    return res.redirect("/admin");
  }
  failedAttempts++;
  if (failedAttempts >= 3) {
    return res.status(403).send("❌ Ou bloke.");
  }
  res.status(401).send(`❌ Echwe: ${failedAttempts}/3`);
});

// --- Dashboard admin ---
app.get("/admin", async (req, res) => {
  if (!req.session.isAdmin) return res.status(403).send("❌ Aksè entèdi");

  const [messages, users] = await Promise.all([
    Message.find().sort({ createdAt: -1 }),
    User.find().sort({ username: 1 })
  ]);

  const dashboardHtml = `...same as before...`;
  res.send(dashboardHtml);
});

// --- Kor lòt route admin /export /delete-message /logout --- OK

// --- Mongoose & Pusher setup ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB konekte!"))
  .catch(err => console.error(err));

const messageSchema = new mongoose.Schema({ sender: String, content: String }, { timestamps: true });
const Message = mongoose.model("Message", messageSchema);
const userSchema = new mongoose.Schema({ username: String, email: String, password: String });
userSchema.pre('save', async function(next) {
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

// --- ROUTE CHAT PIBLIK ---
app.post("/public-chat", async (req, res) => {
  const { sender, content } = req.body;
  if (!sender || !content) {
    return res.status(400).send("❌ Obligatwa sender & content");
  }
  try {
    const newMessage = await Message.create({ sender, content });
    pusher.trigger("public-chat", "new-message", {
      _id: newMessage._id,
      sender: newMessage.sender,
      content: newMessage.content,
      createdAt: newMessage.createdAt
    });
    return res.status(200).send("✅ Mesaj voye");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Erè entèrn");
  }
});

// --- Ajoute route /send pou frontend -->
app.post("/send", (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ sent: false });
  try {
    pusher.trigger("public-chat", "new-message", {
      sender: "Anonim",
      content: message,
      createdAt: new Date().toISOString()
    });
    return res.json({ sent: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ sent: false });
  }
});

// --- Start serve ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Serveur koute sou ${PORT}`));




<script>
  const boutonVoye = document.getElementById("btn-voye");
  const kareMesaj = document.getElementById("mesaj");
  const lisMesaj = document.getElementById("lis-mesaj");

  boutonVoye.addEventListener("click", () => {
    const mesaj = kareMesaj.value.trim();
    if (mesaj === "") return;

    fetch("https://chat-en-direct-fobas.onrender.com/public-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sender: "Anonim",
        content: mesaj
      })
    })
    .then(res => res.text())
    .then(() => {
      ajouteMesajTekst(mesaj);
      kareMesaj.value = "";
    })
    .catch(err => {
      alert("❌ Mesaj la pa rive voye. Tcheke koneksyon.");
      console.error(err);
    });
  });

  function ajouteMesajTekst(msg) {
    const li = document.createElement("li");
    li.textContent = "Anonim: " + msg;
    lisMesaj.appendChild(li);
  }
</script>



<input id="mesaj" placeholder="Tape mesaj ou..." />
<button id="btn-voye">Voye</button>
<ul id="lis-mesaj"></ul>
