import express from "express";
import cors from "cors";
import multer from "multer";
import fetch from "node-fetch";
import FormData from "form-data";

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer();

const REV_ENDPOINT = "https://dev.my.api.revspire.io/local-upload-chunked";
const AI_SUMMARY_ENDPOINT = "https://dev.my.api.revspire.io/get-content-ai-summary";
const N8N_WEBHOOK = "https://your-n8n-instance.com/webhook/ai-summary";

const API_KEY = "AIzaSyCVPno_o9cQ1V0t_Bm-ZUlbwEGlFZkofrc";

// Hardcoded meta
const META = {
  created_by: "IGH141585754362",
  description: "Content",
  folder: "WRS698268771821",
  viewer_id: "IGH141585754362",
  organisation_id: "PDX436422222699"
};

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    // 1️⃣ Send to REV endpoint
    const form = new FormData();
    Object.entries(META).forEach(([k, v]) => form.append(k, v));
    form.append("files", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    const revResponse = await fetch(REV_ENDPOINT, {
      method: "POST",
      headers: { "x-api-key": API_KEY },
      body: form
    });

    const revData = await revResponse.json();

    console.log("✅ Upload Response:", revData);

    const contentId = revData?.uploadedFiles?.[0]?.contentId;
    if (!contentId) return res.status(500).json({ error: "No contentId returned" });

    // 2️⃣ Respond to frontend immediately
    res.json({ status: "uploaded", contentId, revResponse: revData });

    // 3️⃣ Wait 60 seconds then fetch AI summary
    setTimeout(async () => {
      try {
        const body = {
          content_id: contentId,
          viewer_id: META.viewer_id,
          organisation_id: META.organisation_id
        };

        console.log("⏳ Fetching AI summary for", contentId);

        const summaryResp = await fetch(AI_SUMMARY_ENDPOINT, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-api-key": API_KEY 
          },
          body: JSON.stringify(body)
        });

        const summaryData = await summaryResp.json();
        console.log("📝 AI Summary:", summaryData);

        // 4️⃣ Send to n8n webhook
        const n8nResp = await fetch(N8N_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId, summaryData })
        });
        console.log("🚀 Sent to n8n, status:", n8nResp.status);

      } catch (err) {
        console.error("⚠ Error fetching AI summary or sending to n8n:", err);
      }
    }, 60000); // 60 seconds

  } catch (err) {
    console.error("🔥 Upload failed:", err);
    res.status(500).json({ error: err.message });
  }
});
