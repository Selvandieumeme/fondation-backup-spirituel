// ... [tout kòd ou te gen deja anwo rete san chanjman]

app.get("/admin", basicAuth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Kreye query filtraj si dat yo egziste
    let filter = {};
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const messages = await Message.find(filter).sort({ createdAt: -1 });

    let html = `
      <html>
        <head>
          <title>Admin Dashboard</title>
          <style>
            body { font-family: Arial; background: #f7f7f7; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 10px; border: 1px solid #ccc; }
            th { background-color: #4CAF50; color: white; }
            tr:nth-child(even) { background-color: #f2f2f2; }
            input[type=date] { padding: 5px; margin-right: 10px; }
            button { padding: 5px 10px; }
          </style>
        </head>
        <body>
          <h2>📊 Mesaj ki sove</h2>

          <form method="GET" action="/admin">
            <label>Filtre ant de dat :</label>
            <input type="date" name="startDate" required>
            <input type="date" name="endDate" required>
            <button type="submit">Filtre</button>
          </form>

          <table>
            <tr>
              <th>Expediteur</th>
              <th>Contenu</th>
              <th>Lè li voye</th>
              <th>🛠 Aksyon</th>
            </tr>
    `;

    messages.forEach(msg => {
      html += `
        <tr>
          <td>${escapeHtml(msg.sender)}</td>
          <td>${escapeHtml(msg.content)}</td>
          <td>${new Date(msg.createdAt).toLocaleString()}</td>
          <td>
            <form method="POST" action="/admin/reply/${msg._id}" style="display:inline;">
              <input type="text" name="reply" placeholder="Reponn..." required/>
              <button type="submit">Repons</button>
            </form>
            <form method="POST" action="/admin/delete/${msg._id}" style="display:inline;" onsubmit="return confirm('Ou sèten pou efase?');">
              <button type="submit" style="color:red;">🗑 Supprimer</button>
            </form>
          </td>
        </tr>
      `;
    });

    html += `
          </table>
        </body>
      </html>
    `;

    res.send(html);
  } catch (err) {
    console.error("❌ Erè admin dashboard:", err);
    res.status(500).send("Pa kapab chaje mesaj yo.");
  }
});

// --- Route pou efase mesaj ---
app.post('/admin/delete/:id', basicAuth, async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.redirect('/admin');
  } catch (err) {
    console.error("❌ Erè lè w ap efase mesaj:", err);
    res.status(500).send("Pa kapab efase mesaj la.");
  }
});

// --- Route pou reponn a yon mesaj (senpleman log li pou kounya) ---
app.post('/admin/reply/:id', basicAuth, async (req, res) => {
  const { reply } = req.body;
  const messageId = req.params.id;

  try {
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).send("Mesaj pa jwenn.");

    console.log(`✉️ Repons pou ${msg.sender}: ${reply}`);
    // Ou ka ajoute log, voye pa email, oswa mete nan yon lòt koleksyon si ou vle
    res.redirect('/admin');
  } catch (err) {
    console.error("❌ Erè pandan repons mesaj:", err);
    res.status(500).send("Erè pandan ou t ap reponn mesaj la.");
  }
});
