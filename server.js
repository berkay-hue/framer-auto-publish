import express from "express"
import { connect } from "framer-api"

const app = express()
app.use(express.json({ limit: "10mb" }))

const PROJECT_URL = "https://framer.com/projects/saas-corner-2--SfNhuYE6jNspJbZUWDwA-1H3nT"
const API_KEY = "fr_5h0sp0wxkr9fct26kjzzpbj20s"
const SECRET = "saascorner2026"

// Articles collection field ID'leri
const FIELDS = {
  title:     "t3TCWJPLf",
  shortText: "DGA71kQjj",
  date:      "o5sEszVRE",
  category:  "H4Nl31AH4",
  author:    "bIQm9YpTZ",
  content:   "LRl4pxAhv",
  featured:  "OpICLiqiX",
  image:     "iCkErdp4p",
}

app.get("/", (req, res) => res.json({ status: "ok" }))

// Field ID + tip keşif endpoint'i
app.get("/inspect", async (req, res) => {
  if (req.query.secret !== SECRET) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  let framer
  try {
    framer = await connect(PROJECT_URL, API_KEY)
    const collections = await framer.getCollections()
    const articles = collections.find(c => c.name === "Articles")
    const fields = await articles.getFields()
    const items = await articles.getItems()
    const sample = items[0]
    await framer.disconnect()
    res.json({
      collectionId: articles.id,
      fields: fields.map(f => ({ id: f.id, name: f.name, type: f.type })),
      sampleItem: sample,
    })
  } catch (e) {
    try { if (framer) await framer.disconnect() } catch(_) {}
    res.status(500).json({ error: e.message, stack: e.stack })
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
      const { title, slug, content, category, date, image_url, short_text, author } = req.body

      console.log("===== YENİ BLOG =====")
      console.log("Title:", title)
      console.log("Slug:", slug)
      console.log("Category:", category)
      console.log("Date:", date)
      console.log("Image:", image_url)
      console.log("Content length:", content?.length || 0)

      if (!title || !slug || !content) {
        throw new Error("Eksik alan: title, slug veya content yok")
      }

      console.log("→ Framer'a baglanılıyor...")
      framer = await connect(PROJECT_URL, API_KEY)
      console.log("✓ Baglandı")

      const collections = await framer.getCollections()
      const articles = collections.find(c => c.name === "Articles")
      if (!articles) throw new Error("Articles collection bulunamadı")
      console.log("✓ Articles bulundu, id:", articles.id)

      // Aynı slug var mı?
      const existingItems = await articles.getItems()
      if (existingItems.find(item => item.slug === slug)) {
        console.log("⚠ Aynı slug zaten var, atlanıyor:", slug)
        return
      }
      console.log("✓ Slug temiz, devam")

      // Tarih ISO formatına
      let isoDate
      try {
        isoDate = new Date(date || Date.now()).toISOString()
      } catch {
        isoDate = new Date().toISOString()
      }

      // Field'ları TYPE'lı şekilde ver
      const fieldData = {
        [FIELDS.title]:     { type: "string",        value: title },
        [FIELDS.shortText]: { type: "string",        value: short_text || title.substring(0, 150) },
        [FIELDS.date]:      { type: "date",          value: isoDate },
        [FIELDS.category]:  { type: "enum",          value: category || "Satış" },
        [FIELDS.author]:    { type: "enum",          value: author || "Berkay YALÇIN" },
        [FIELDS.content]:   { type: "formattedText", value: content },
        [FIELDS.featured]:  { type: "boolean",       value: false },
      }

      // Image varsa ekle (value direkt string URL)
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
      console.error("Name:", error.name)
      console.error("Stack:", error.stack)
      console.error("Full:", JSON.stringify(error, Object.getOwnPropertyNames(error)))
      console.error("=======================")
      try { if (framer) await framer.disconnect() } catch(e) {}
    }
  })()
})

app.listen(process.env.PORT || 3000, () => {
  console.log("Server çalışıyor: port", process.env.PORT || 3000)
})
