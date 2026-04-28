import express from "express"
import { connect } from "framer-api"

const app = express()
app.use(express.json({ limit: "10mb" }))

const PROJECT_URL = "https://framer.com/projects/saas-corner-2--SfNhuYE6jNspJbZUWDwA-1H3nT"
const API_KEY = "fr_5h0sp0wxkr9fct26kjzzpbj20s"
const SECRET = "saascorner2026"

// Articles collection field ID'leri (Category ve Author kaldırıldı)
const FIELDS = {
  title:     "t3TCWJPLf",
  shortText: "DGA71kQjj",
  date:      "o5sEszVRE",
  content:   "LRl4pxAhv",
  featured:  "OpICLiqiX",
  image:     "iCkErdp4p",
}

function asString(v) {
  if (v == null) return ""
  if (typeof v === "string") return v
  if (typeof v === "object") {
    if (typeof v.value === "string") return v.value
    if (typeof v.name === "string") return v.name
    return ""
  }
  return String(v)
}

app.get("/", (req, res) => res.json({ status: "ok" }))

// Field tiplerini görmek için (debug)
app.get("/inspect", async (req, res) => {
  if (req.query.secret !== SECRET) return res.status(401).json({ error: "Unauthorized" })
  let framer
  try {
    framer = await connect(PROJECT_URL, API_KEY)
    const collections = await framer.getCollections()
    const articles = collections.find(c => c.name === "Articles")
    const fields = await articles.getFields()
    const items = await articles.getItems()
    await framer.disconnect()
    res.json({
      collectionId: articles.id,
      itemCount: items.length,
      fields: fields.map(f => ({ id: f.id, name: f.name, type: f.type })),
      sampleItem: items[0],
    })
  } catch (e) {
    try { if (framer) await framer.disconnect() } catch(_) {}
    res.status(500).json({ error: e.message })
  }
})

app.post("/sync-and-publish", async (req, res) => {
  if (req.headers["x-secret"] !== SECRET) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  res.json({ success: true, message: "Blog kuyruğa alındı" })

  ;(async () => {
    let framer
    try {
      const title      = asString(req.body.title)
      const slug       = asString(req.body.slug)
      const content    = asString(req.body.content)
      const dateRaw    = asString(req.body.date)
      const image_url  = asString(req.body.image_url)
      const short_text = asString(req.body.short_text)

      console.log("===== YENİ BLOG =====")
      console.log("Title:", title)
      console.log("Slug:", slug)
      console.log("Date:", dateRaw)
      console.log("Image:", image_url)
      console.log("Content length:", content.length)

      if (!title || !slug || !content) {
        throw new Error("Eksik alan: title, slug veya content yok")
      }

      console.log("→ Framer'a baglanılıyor...")
      framer = await connect(PROJECT_URL, API_KEY)
      console.log("✓ Baglandı")

      const collections = await framer.getCollections()
      const articles = collections.find(c => c.name === "Articles")
      if (!articles) throw new Error("Articles collection bulunamadı")

      // Aynı slug var mı?
      const existingItems = await articles.getItems()
      if (existingItems.find(item => item.slug === slug)) {
        console.log("⚠ Aynı slug zaten var, atlanıyor:", slug)
        return
      }

      // Tarih
      let isoDate
      try { isoDate = new Date(dateRaw || Date.now()).toISOString() }
      catch { isoDate = new Date().toISOString() }

      const fieldData = {
        [FIELDS.title]:     { type: "string",        value: title },
        [FIELDS.shortText]: { type: "string",        value: short_text || title.substring(0, 150) },
        [FIELDS.date]:      { type: "date",          value: isoDate },
        [FIELDS.content]:   { type: "formattedText", value: content },
        [FIELDS.featured]:  { type: "boolean",       value: false },
      }

      if (image_url && image_url.startsWith("http")) {
        fieldData[FIELDS.image] = { type: "image", value: image_url }
      }

      console.log("→ addItems çağrılıyor...")
      await articles.addItems([{ slug, fieldData }])
      console.log("✓ Item eklendi")

      console.log("→ Publish çağrılıyor...")
      const result = await framer.publish()
      console.log("✓ Publish OK, deployment id:", result.deployment.id)

      console.log("→ Deploy çağrılıyor...")
      await framer.deploy(result.deployment.id)
      console.log("✓ Deploy tamamlandı")

      await framer.disconnect()
      console.log("===== TÜM İŞLEM TAMAM =====")
    } catch (error) {
      console.error("===== HATA DETAYI =====")
      console.error("Message:", error.message)
      console.error("Full:", JSON.stringify(error, Object.getOwnPropertyNames(error)))
      console.error("=======================")
      try { if (framer) await framer.disconnect() } catch(e) {}
    }
  })()
})

app.listen(process.env.PORT || 3000, () => {
  console.log("Server çalışıyor: port", process.env.PORT || 3000)
})
