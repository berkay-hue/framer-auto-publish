import express from "express"
import { connect } from "framer-api"

const app = express()
app.use(express.json({ limit: "10mb" }))

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
    const articles = collections.find(c => c.name === "Articles")
    const fields = await articles.getFields()
    
    const categoryField = fields.find(f => f.name === "Category")
    const authorField = fields.find(f => f.name === "Author")
    
    console.log("=== CATEGORY CASES ===")
    for (const c of categoryField.cases) {
      console.log(`id: ${c.id} | name: ${c.name}`)
    }
    
    console.log("=== AUTHOR CASES ===")
    for (const c of authorField.cases) {
      console.log(`id: ${c.id} | name: ${c.name}`)
    }

    await framer.disconnect()
    res.json({ success: true })
  } catch (error) {
    console.error("HATA:", error.message)
    res.status(500).json({ error: error.message })
  }
})

app.listen(process.env.PORT || 3000, () => {
  console.log("Server çalışıyor: port", process.env.PORT || 3000)
})
