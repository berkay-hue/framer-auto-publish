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

  // Hemen response dön (n8n beklemesin)
  res.json({ success: true, message: "Blog kuyruğa alındı" })

  // Background'da işle
  ;(async () => {
    let framer
    try {
      console.log("Gelen:", req.body)
      console.log("→ Framer'a baglanılıyor...")
      framer = await connect(PROJECT_URL, API_KEY)
      console.log("✓ Baglandı")

      console.log("→ Collections alınıyor...")
      const collections = await framer.getCollections()
      console.log("✓ Collections:", collections.length, collections.map(c => c.name))

      console.log("→ Publish çağrılıyor...")
      const result = await framer.publish()
      console.log("✓ Publish sonucu:", JSON.stringify(result))

      console.log("→ Deploy çağrılıyor, deployment id:", result.deployment.id)
      await framer.deploy(result.deployment.id)
      console.log("✓ Deploy tamamlandı")

      await framer.disconnect()
      console.log("✓ Tüm islem tamam")
    } catch (error) {
      console.error("===== BACKGROUND HATA DETAY =====")
      console.error("Message:", error.message)
      console.error("Name:", error.name)
      console.error("Stack:", error.stack)
      if (error.response) {
        console.error("Response status:", error.response.status)
        console.error("Response data:", JSON.stringify(error.response.data))
      }
      if (error.cause) {
        console.error("Cause:", error.cause)
      }
      console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)))
      console.error("==================================")
      try { if (framer) await framer.disconnect() } catch(e) {}
    }
  })()
})

app.listen(process.env.PORT || 3000, () => {
  console.log("Server çalışıyor: port", process.env.PORT || 3000)
})
