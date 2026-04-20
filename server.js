import express from "express"
import { connect } from "framer-api"

const app = express()
app.use(express.json({ limit: "10mb" }))

const PROJECT_URL = "https://framer.com/projects/saas-corner-2--SfNhuYE6jNspJbZUWDwA-1H3nT"
const API_KEY = "fr_5h0sp0wxkr9fct26kjzzpbj20s"
const SECRET = "saascorner2026"

const CATEGORY_MAP = {
  "İş": "bp8rGNRsM",
  "Satış": "bOJnXnCqQ",
  "Yapay Zeka": "ekQdcg_G4",
  "CRM": "k4uK9ZqNf",
  "SaaS": "p1pG4Pk5e",
  "Partner": "M1Pq3h62F",
  "Firmalarımız": "rVfB4ocgT"
}

app.get("/", (req, res) => res.json({ status: "ok" }))

app.post("/sync-and-publish", async (req, res) => {
  if (req.headers["x-secret"] !== SECRET) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { title, slug, content, category, date, image_url } = req.body
  console.log("Gelen:", { title, slug, category, date })

  const processInBackground = async () => {
    let framer
    try {
      framer = await connect(PROJECT_URL, API_KEY)
      const collections = await framer.getCollections()
      const articles = collections.find(c => c.name === "Articles")
      const fields = await articles.getFields()
      const categoryField = fields.find(f => f.name === "Category")
      const authorField = fields.find(f => f.name === "Author")

      const categoryId = CATEGORY_MAP[category] || CATEGORY_MAP["Satış"]
      const categoryCase = categoryField.cases.find(c => c.id === categoryId)
      const authorCase = authorField.cases.find(c => c.name === "Berkay YALÇIN")

      await articles.addItems([{
        slug: slug,
        fieldData: {
          "t3TCWJPLf": { type: "string", value: title },
          "DGA71kQjj": { type: "string", value: title.substring(0, 150) },
          "o5sEszVRE": { type: "date", value: date || new Date().toISOString() },
          "H4Nl31AH4": { type: "enum", value: categoryCase.id },
          "bIQm9YpTZ": { type: "enum", value: authorCase.id },
          "LRl4pxAhv": { type: "formattedText", value: content },
          "OpICLiqiX": { type: "boolean", value: false },
          "iCkErdp4p": { type: "image", value: image_url || null }
        }
      }])
      console.log("Eklendi:", title)

      try {
        const result = await framer.publish()
        console.log("Publish result:", JSON.stringify(result))

        const deployId = result?.deployment?.id || result?.id || result?.deploymentId
        if (deployId) {
          await framer.deploy(deployId)
          console.log("Deploy tamamlandı:", title)
        } else {
          console.log("Deploy ID bulunamadı, atlanıyor. Full result:", JSON.stringify(result))
        }
      } catch (publishErr) {
        console.log("Publish/deploy hatası (blog eklendi):", publishErr.message)
      }

    } catch (err) {
      console.error("Background HATA:", err.message)
    } finally {
      if (framer) {
        try { await framer.disconnect() } catch (_) {}
      }
    }
  }

  res.json({ success: true, message: "Blog kuyruğa alındı" })
  processInBackground()
})

app.listen(process.env.PORT || 3000, () => {
  console.log("Server çalışıyor: port", process.env.PORT || 3000)
})
