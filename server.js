import express from "express"
import { connect } from "framer-api"

const app = express()
app.use(express.json())

const PROJECT_URL = "https://framer.com/projects/saas-corner-2--SfNhuYE6jNspJbZUWDwA-1H3nT"
const API_KEY = "fr_5h0sp0wxkr9fct26kjzzpbj20s"
const SECRET = "saascorner2026"

app.get("/", (req, res) => res.json({ status: "ok" }))

app.post("/sync-and-publish", async (req, res) => {
  if (req.headers["x-secret"] !== SECRET) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  try {
    const framer = await connect(PROJECT_URL, API_KEY)

    const collections = await framer.getCollections()
    
    // Articles collection'ını bul
    const articles = collections.find(c => c.name === "Articles")
    console.log("Articles ID:", articles.id)
    
    // Field'ları çek
    const fields = await articles.getFields()
    console.log("=== FIELDS ===")
    for (const f of fields) {
      console.log(`Field: ${f.name} | ID: ${f.id} | Type: ${f.type}`)
    }

    await framer.disconnect()
    res.json({ success: true, fields: fields.map(f => ({ name: f.name, id: f.id, type: f.type })) })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
})

app.listen(process.env.PORT || 3000, () => {
  console.log("Server çalışıyor: port", process.env.PORT || 3000)
})
