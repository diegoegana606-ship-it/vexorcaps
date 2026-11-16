const crypto = require("crypto");

const claveOk = (k) => {
  const a = Buffer.from(String(k || ""));
  const b = Buffer.from(String(process.env.ADMIN_KEY || ""));
  return b.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
};

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const { put, get } = await import("@vercel/blob");
    if (req.method === "GET") {
      const r = await get("vexor/config.json", { access: "private", useCache: false });
      if (!r || r.statusCode !== 200) return res.status(200).json({ cfg: null });
      const txt = await new Response(r.stream).text();
      return res.status(200).json(JSON.parse(txt));
    }
    if (req.method === "POST") {
      if (!claveOk(req.headers["x-admin-key"])) return res.status(401).json({ error: "clave" });
      const b = req.body || {};
      if (b.action === "ping") return res.status(200).json({ ok: true });
      if (b.action === "img") {
        const m = /^data:image\/jpeg;base64,/.exec(String(b.data || ""));
        if (!m || !/^[\w.-]{1,60}$/.test(String(b.name || ""))) return res.status(400).json({ error: "foto no válida" });
        const buf = Buffer.from(b.data.slice(m[0].length), "base64");
        if (buf.length > 4000000) return res.status(413).json({ error: "foto muy grande" });
        await put("vexor/img/" + b.name, buf, {
          access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "image/jpeg",
        });
        return res.status(200).json({ url: "/api/img?n=" + encodeURIComponent(b.name) + "&t=" + Date.now() });
      }
      if (b.action === "cfg") {
        if (!b.cfg || typeof b.cfg !== "object") return res.status(400).json({ error: "datos no válidos" });
        await put("vexor/config.json", JSON.stringify({ v: Date.now(), cfg: b.cfg }), {
          access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json",
        });
        return res.status(200).json({ ok: true });
      }
      return res.status(400).json({ error: "acción no válida" });
    }
    res.status(405).json({ error: "método no permitido" });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
