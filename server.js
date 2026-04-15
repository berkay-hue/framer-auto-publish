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

    // Tüm collection'ları al
    const collections = await framer.getCollections()
    console.log("Toplam collections:", collections.length)
    
    for (const col of collections) {
      console.log("Collection:", col.name, Object.keys(col))
      // Mevcut tüm metodları dene
      if (typeof col.sync === "function") {
        await col.sync()
        console.log("sync() çağrıldı:", col.name)
      }
      if (typeof col.syncManagedCollection === "function") {
        await col.syncManagedCollection()
        console.log("syncManagedCollection() çağrıldı:", col.name)
      }
    }

    // Publish + Deploy
    const result = await framer.publish()
    await framer.deploy(result.deployment.id)
    await framer.disconnect()

    res.json({ success: true, collections: collections.length })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
})

app.listen(process.env.PORT || 3000, () => {
  console.log("Server çalışıyor: port", process.env.PORT || 3000)
})
