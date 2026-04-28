import express from "express"
import { connect } from "framer-api"

const app = express()
app.use(express.json({ limit: "10mb" }))

const PROJECT_URL = "https://framer.com/projects/saas-corner-2--SfNhuYE6jNspJbZUWDwA-1H3nT"
const API_KEY = "fr_5h0sp0wxkr9fct26kjzzpbj20s"
const SECRET = "saascorner2026"

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

function asString(v) {
  if (v == null) return ""
  if (typeof v === "string") return v
  if (typeof v === "object") {
    if (typeof v.value === "string") return v.value
    if (typeof v.name === "string") return v.name
    if (typeof v.id === "string") return v.id
    return ""
  }
  return String(v)
}

app.get("/", (req, res) => res.json({ status: "ok" }))

// Enum case'lerini DERİN incele
app.get("/inspect-deep", async (req, res) => {
  if (req.query.secret !== SECRET) return res.status(401).json({ error: "Unauthorized" })
  let framer
  try {
    framer = await connect(PROJECT_URL, API_KEY)
    const collections = await framer.getCollections()
    const articles = collections.find(c => c.name === "Articles")
    const fields = await articles.getFields()

    const result = []
    for (const f of fields) {
      const info = {
        id: f.id,
        name: f.name,
        type: f.type,
        ownKeys: Object.getOwnPropertyNames(f),
        keys: Object.keys(f),
      }
      if (f.cases) {
        info.cases = f.cases.map(c => ({
          ownKeys: Object.getOwnPropertyNames(c),
          keys: Object.keys(c),
          // Tüm property'leri tek tek dene
          id: c.id,
          name: c.name,
          value: c.value,
          label: c.label,
          // toString
          str: String(c),
          // tüm own + enumerable property'leri ortaya çıkar
          dump: JSON.parse(JSON.stringify(c, Object.getOwnPropertyNames(c))),
        }))
      }
      result.push(info)
    }

    await framer.disconnect()
    res.json({ fields: result })
  } catch (e) {
    try { if (framer) await framer.disconnect() } catch(_) {}
    res.status(500).json({ error: e.message, stack: e.stack })
  }
})

// Test: VAR olan bir item'ın category'sini başka bir geçerli değere çevirebilir miyiz?
app.get("/test-update", async (req, res) => {
  if (req.query.secret !== SECRET) return res.status(401).json({ error: "Unauthorized" })
  let framer
  try {
    framer = await connect(PROJECT_URL, API_KEY)
    const collections = await framer.getCollections()
    const articles = collections.find(c => c.name === "Articles")
    const items = await articles.getItems()
    const sample = items[0]

    // Mevcut fieldData'yı aynen geri yaz - hangi metod var?
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(articles))
      .concat(Object.getOwnPropertyNames(articles))
    
    await framer.disconnect()
    res.json({
      sampleItemId: sample.id,
      sampleSlug: sample.slug,
      sampleCategory: sample.fieldData[FIELDS.category],
      collectionMethods: methods,
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
      const title      = asString(req.body.title)
      const slug       = asString(req.body.slug)
      const content    = asString(req.body.content)
      const category   = asString(req.body.category)
      const dateRaw    = asString(req.body.date)
      const image_url  = asString(req.body.image_url)
      const short_text = asString(req.body.short_text)
      const author     = asString(req.body.author)

      console.log("===== YENİ BLOG =====")
      console.log("category typeof:", typeof category, "value:", JSON.stringify(category))
      console.log("author typeof:", typeof author, "value:", JSON.stringify(author))

      if (!title || !slug || !content) throw new Error("Eksik alan")

      framer = await connect(PROJECT_URL, API_KEY)
      const collections = await framer.getCollections()
      const articles = collections.find(c => c.name === "Articles")

      const existingItems = await articles.getItems()
      const validCategories = [...new Set(existingItems.map(i => i.fieldData?.[FIELDS.category]?.value).filter(Boolean))]
      const validAuthors    = [...new Set(existingItems.map(i => i.fieldData?.[FIELDS.author]?.value).filter(Boolean))]

      if (existingItems.find(item => item.slug === slug)) {
        console.log("⚠ Aynı slug zaten var")
        return
      }

      // Category enum case'ini bul (mevcut item'lardan)
      const sampleWithCategory = existingItems.find(i =>
        i.fieldData?.[FIELDS.category]?.value === category ||
        i.fieldData?.[FIELDS.category]?.value?.toLowerCase() === category.toLowerCase()
      )
      let categoryFieldValue
      if (sampleWithCategory) {
        // Mevcut bir item'ın category fieldData'sını AYNEN kopyala
        categoryFieldValue = sampleWithCategory.fieldData[FIELDS.category]
        console.log("Category mevcut item'dan kopyalandı:", JSON.stringify(categoryFieldValue))
      } else {
        // Fallback - ilk item'ın category'sini al
        categoryFieldValue = existingItems[0].fieldData[FIELDS.category]
        console.log("⚠ Category bulunamadı, fallback:", JSON.stringify(categoryFieldValue))
      }

      const sampleWithAuthor = existingItems.find(i =>
        i.fieldData?.[FIELDS.author]?.value === author
      )
      const authorFieldValue = sampleWithAuthor
        ? sampleWithAuthor.fieldData[FIELDS.author]
        : existingItems[0].fieldData[FIELDS.author]
      console.log("Author kopyalandı:", JSON.stringify(authorFieldValue))

      let isoDate
      try { isoDate = new Date(dateRaw || Date.now()).toISOString() }
      catch { isoDate = new Date().toISOString() }

      const fieldData = {
        [FIELDS.title]:     { type: "string",        value: title },
        [FIELDS.shortText]: { type: "string",        value: short_text || title.substring(0, 150) },
        [FIELDS.date]:      { type: "date",          value: isoDate },
        [FIELDS.category]:  categoryFieldValue,           // mevcut item'dan kopyalandı
        [FIELDS.author]:    authorFieldValue,             // mevcut item'dan kopyalandı
        [FIELDS.content]:   { type: "formattedText", value: content },
        [FIELDS.featured]:  { type: "boolean",       value: false },
      }

      if (image_url && image_url.startsWith("http")) {
        fieldData[FIELDS.image] = { type: "image", value: image_url }
      }

      console.log("→ addItems çağrılıyor, fieldData:", JSON.stringify(fieldData).substring(0, 500))
      await articles.addItems([{ slug, fieldData }])
      console.log("✓ Item eklendi")

      const result = await framer.publish()
      console.log("✓ Publish OK")
      await framer.deploy(result.deployment.id)
      console.log("✓ Deploy tamamlandı")

      await framer.disconnect()
      console.log("===== TAMAM =====")
    } catch (error) {
      console.error("===== HATA =====")
      console.error("Message:", error.message)
      console.error("Full:", JSON.stringify(error, Object.getOwnPropertyNames(error)))
      try { if (framer) await framer.disconnect() } catch(e) {}
    }
  })()
})

app.listen(process.env.PORT || 3000, () => {
  console.log("Server çalışıyor: port", process.env.PORT || 3000)
})
