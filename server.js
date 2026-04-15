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
  console.log("Gelen data:", { title, slug, category, date, image_url })

  try {
    const framer = await connect(PROJECT_URL, API_KEY)
    const collections = await framer.getCollections()
    const articles = collections.find(c => c.name === "Articles")

    await articles.addItems([{
      slug: slug,
      fieldData: {
        "t3TCWJPLf": title,
        "DGA71kQjj": title.substring(0, 150),
        "o5sEszVRE": date || new Date().toISOString(),
        "H4Nl31AH4": category || "Satış",
        "bIQm9YpTZ": "Berkay YALÇIN",
        "LRl4pxAhv": content,
        "OpICLiqiX": false,
        "iCkErdp4p": image_url ? { url: image_url } : null
      }
    }])

    console.log("Item eklendi:", title)

    // Publish + Deploy
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
