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

  const { title, slug, content, category, date, image_url } = req.body
  console.log("Gelen:", { title, slug, category, date })

  try {
    const framer = await connect(PROJECT_URL, API_KEY)
    const collections = await framer.getCollections()
    const articles = collections.find(c => c.name === "Articles")

    await articles.addItems([{
      slug: slug,
      fieldData: {
        "t3TCWJPLf": { type: "string", value: title },
        "DGA71kQjj": { type: "string", value: title.substring(0, 150) },
        "o5sEszVRE": { type: "date", value: date || new Date().toISOString() },
        "H4Nl31AH4": { type: "enum", value: category || "Satış" },
        "bIQm9YpTZ": { type: "enum", value: "Berkay YALÇIN" },
        "LRl4pxAhv": { type: "formattedText", value: content },
        "OpICLiqiX": { type: "boolean", value: false },
        "iCkErdp4p": { type: "image", value: image_url || null }
      }
    }])

    console.log("Eklendi:", title)

    const result = await framer.publish()
    await framer.deploy(result.deployment.id)
    await framer.disconnect()

    res.json({ success: true, message: "Blog eklendi ve publish edildi" })
  } catch (error) {
    console.error("HATA:", error.message)
    res.status(500).json({ error: error.message })
  }
})

app.listen(process.env.PORT || 3000, () => {
  console.log("Server çalışıyor: port", process.env.PORT || 3000)
})
