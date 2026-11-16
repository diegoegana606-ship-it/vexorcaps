const { Readable } = require("stream");

module.exports = async (req, res) => {
  try {
    const n = String((req.query && req.query.n) || "");
    if (!/^[\w.-]{1,60}$/.test(n)) return res.status(400).send("nombre no válido");
    const { get } = await import("@vercel/blob");
    const r = await get("vexor/img/" + n, { access: "private" });
    if (!r || r.statusCode !== 200) return res.status(404).send("no encontrada");
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=86400");
    Readable.fromWeb(r.stream).pipe(res);
  } catch (e) {
    res.status(500).send("error");
  }
};
