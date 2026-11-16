const { put, list } = require("@vercel/blob");
const crypto = require("crypto");

const claveOk = (k) => {
  const a = Buffer.from(String(k || ""));
  const b = Buffer.from(String(process.env.ADMIN_KEY || ""));
  return b.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
};

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") {
      const l = await list({ prefix: "vexor/config.json", limit: 1 });
      if (!l.blobs.length) return res.status(200).json({ cfg: null });
      const r = await fetch(l.blobs[0].url + "?t=" + Date.now());
      return res.status(200).json(await r.json());
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
        const r = await put("vexor/img/" + b.name, buf, {
          access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "image/jpeg", cacheControlMaxAge: 60,
        });
        return res.status(200).json({ url: r.url });
      }
      if (b.action === "cfg") {
        if (!b.cfg || typeof b.cfg !== "object") return res.status(400).json({ error: "datos no válidos" });
        await put("vexor/config.json", JSON.stringify({ v: Date.now(), cfg: b.cfg }), {
          access: "public", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 60,
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
