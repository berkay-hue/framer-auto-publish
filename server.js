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

// String'i temizle - obje gelirse içinden value'yu çıkar
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

// Tüm collection field tiplerini ve enum case'lerini göster
app.get("/inspect", async (req, res) => {
  if (req.query.secret !== SECRET) return res.status(401).json({ error: "Unauthorized" })
  let framer
  try {
    framer = await connect(PROJECT_URL, API_KEY)
    const collections = await framer.getCollections()
    const articles = collections.find(c => c.name === "Articles")
    const fields = await articles.getFields()
    const items = await articles.getItems()

    // Mevcut item'lardan benzersiz category ve author değerlerini topla
    const usedCategories = [...new Set(items.map(i => i.fieldData?.[FIELDS.category]?.value).filter(Boolean))]
    const usedAuthors    = [...new Set(items.map(i => i.fieldData?.[FIELDS.author]?.value).filter(Boolean))]

    await framer.disconnect()
    res.json({
      collectionId: articles.id,
      itemCount: items.length,
      fields: fields.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        cases: f.cases || f.values || null, // enum case'leri varsa
        full: f, // tam objeyi de göster
      })),
      usedCategories,
      usedAuthors,
      sampleItem: items[0],
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
      // Body'den değerleri çek ve hepsini string'e zorla
      const title      = asString(req.body.title)
      const slug       = asString(req.body.slug)
      const content    = asString(req.body.content)
      const category   = asString(req.body.category)
      const dateRaw    = asString(req.body.date)
      const image_url  = asString(req.body.image_url)
      const short_text = asString(req.body.short_text)
      const author     = asString(req.body.author)

      console.log("===== YENİ BLOG =====")
      console.log("Title:", title)
      console.log("Slug:", slug)
      console.log("Category (raw):", JSON.stringify(req.body.category), "→ temiz:", category)
      console.log("Author (raw):", JSON.stringify(req.body.author), "→ temiz:", author)
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

      // Mevcut category ve author enum case'lerini topla
      const existingItems = await articles.getItems()
      const validCategories = [...new Set(existingItems.map(i => i.fieldData?.[FIELDS.category]?.value).filter(Boolean))]
      const validAuthors    = [...new Set(existingItems.map(i => i.fieldData?.[FIELDS.author]?.value).filter(Boolean))]
      console.log("Geçerli kategoriler:", validCategories)
      console.log("Geçerli yazarlar:", validAuthors)

      // Aynı slug var mı?
      if (existingItems.find(item => item.slug === slug)) {
        console.log("⚠ Aynı slug zaten var, atlanıyor:", slug)
        return
      }

      // Category'yi geçerli enum'a map'le
      let finalCategory = category
      if (!validCategories.includes(finalCategory)) {
        // Tam eşleşme yoksa case-insensitive ara
        const ci = validCategories.find(c => c.toLowerCase() === finalCategory.toLowerCase())
        if (ci) {
          finalCategory = ci
          console.log("Category case düzeltildi:", category, "→", ci)
        } else {
          // Fallback - ilk geçerli kategori (genelde "İş")
          finalCategory = validCategories[0] || "İş"
          console.log("⚠ Category geçersiz, fallback kullanılıyor:", category, "→", finalCategory)
        }
      }

      // Author'u geçerli enum'a map'le
      let finalAuthor = author || "Berkay YALÇIN"
      if (!validAuthors.includes(finalAuthor)) {
        const ci = validAuthors.find(a => a.toLowerCase() === finalAuthor.toLowerCase())
        finalAuthor = ci || validAuthors[0] || "Berkay YALÇIN"
      }

      // Tarih
      let isoDate
      try { isoDate = new Date(dateRaw || Date.now()).toISOString() }
      catch { isoDate = new Date().toISOString() }

      const fieldData = {
        [FIELDS.title]:     { type: "string",        value: title },
        [FIELDS.shortText]: { type: "string",        value: short_text || title.substring(0, 150) },
        [FIELDS.date]:      { type: "date",          value: isoDate },
        [FIELDS.category]:  { type: "enum",          value: finalCategory },
        [FIELDS.author]:    { type: "enum",          value: finalAuthor },
        [FIELDS.content]:   { type: "formattedText", value: content },
        [FIELDS.featured]:  { type: "boolean",       value: false },
      }

      if (image_url && image_url.startsWith("http")) {
        fieldData[FIELDS.image] = { type: "image", value: image_url }
      }

      console.log("→ addItems çağrılıyor...")
      console.log("Final category:", finalCategory, "Final author:", finalAuthor)
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
