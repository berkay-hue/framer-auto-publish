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

app.post("/sync-and-publish", async (req, res) => {
  if (req.headers["x-secret"] !== SECRET) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  // n8n hemen devam etsin
  res.json({ success: true, message: "Blog kuyruğa alındı" })

  // Background işlem
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

      console.log("→ Collections alınıyor...")
      const collections = await framer.getCollections()
      const articles = collections.find(c => c.name === "Articles")
      if (!articles) {
        throw new Error("Articles collection bulunamadı")
      }
      console.log("✓ Articles bulundu, id:", articles.id)

      // Aynı slug var mı kontrol et
      console.log("→ Mevcut item'lar kontrol ediliyor...")
      const existingItems = await articles.getItems()
      const duplicate = existingItems.find(item => item.slug === slug)
      if (duplicate) {
        console.log("⚠ Aynı slug zaten var, atlanıyor:", slug)
        return
      }
      console.log("✓ Slug temiz, devam")

      console.log("→ addItems çağrılıyor...")
      const newItem = {
        slug: slug,
        fieldData: {
          [FIELDS.title]:     title,
          [FIELDS.shortText]: short_text || title.substring(0, 150),
          [FIELDS.date]:      date || new Date().toISOString(),
          [FIELDS.category]:  category || "Satış",
          [FIELDS.author]:    author || "Berkay YALÇIN",
          [FIELDS.content]:   content,
          [FIELDS.featured]:  false,
          [FIELDS.image]:     image_url || "",
        }
      }
      await articles.addItems([newItem])
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
      if (error.response) {
        console.error("Response status:", error.response.status)
        console.error("Response data:", JSON.stringify(error.response.data))
      }
      console.error("Full:", JSON.stringify(error, Object.getOwnPropertyNames(error)))
      console.error("=======================")
      try { if (framer) await framer.disconnect() } catch(e) {}
    }
  })()
})

app.listen(process.env.PORT || 3000, () => {
  console.log("Server çalışıyor: port", process.env.PORT || 3000)
})
