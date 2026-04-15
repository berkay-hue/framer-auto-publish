import express from "express"
import { connect } from "framer-api"

const app = express()
app.use(express.json())

const PROJECT_URL = "https://framer.com/projects/saas-corner-2--SfNhuYE6jNspJbZUWDwA-1H3nT"
const API_KEY = "fr_5hrwk5ana29kgacm0mqyhv5k3p"
const SECRET = "saascorner2026"

app.get("/", (req, res) => res.json({ status: "ok" }))

// Sadece publish + sync
app.post("/publish", async (req, res) => {
  if (req.headers["x-secret"] !== SECRET) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  try {
    const framer = await connect(PROJECT_URL, API_KEY)

    // Sync + Publish + Deploy
    const result = await framer.publish()
    await framer.deploy(result.deployment.id)
    await framer.disconnect()

    res.json({ success: true, deployment: result.deployment.id })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
})

app.listen(process.env.PORT || 3000, () => {
  console.log("Server çalışıyor: port", process.env.PORT || 3000)
})
