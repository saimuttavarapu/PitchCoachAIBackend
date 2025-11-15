import express from "express";
import cors from "cors";
import multer from "multer";
import fetch from "node-fetch";
import FormData from "form-data";

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer();

// ---------------------------
// Config
// ---------------------------
const REV_ENDPOINT = "https://dev.my.api.revspire.io/local-upload-chunked";
const AI_SUMMARY_ENDPOINT = "https://dev.my.api.revspire.io/get-content-ai-summary";
const N8N_WEBHOOK = "https://appgcp15nov.app.n8n.cloud/webhook-test/video-analysis"; // replace with your webhook
const API_KEY = "AIzaSyCVPno_o9cQ1V0t_Bm-ZUlbwEGlFZkofrc";

const META = {
  created_by: "IGH141585754362",
  description: "Content",
  folder: "WRS698268771821",
  viewer_id: "IGH141585754362",
  organisation_id: "PDX436422222699"
};

// ---------------------------
// Upload route
// ---------------------------
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const form = new FormData();
    Object.entries(META).forEach(([k, v]) => form.append(k, v));
    form.append("files", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    console.log("📩 Sending file to REV API...");
    const revResponse = await fetch(REV_ENDPOINT, {
      method: "POST",
      headers: { "x-api-key": API_KEY },
      body: form
    });

    const revData = await revResponse.json();
    console.log("✅ Upload Response:", revData);

    const contentId = revData?.uploadedFiles?.[0]?.contentId;
    if (!contentId) return res.status(500).json({ error: "No contentId returned" });

    res.json({ status: "uploaded", contentId, revResponse: revData });

  } catch (err) {
    console.error("🔥 Upload failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------
// AI Summary route
// ---------------------------
app.post("/summary", async (req, res) => {
  const { content_id, viewer_id, organisation_id } = req.body;

  if (!content_id || !viewer_id || !organisation_id) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    const body = { content_id, viewer_id, organisation_id };
    console.log("⏳ Fetching AI summary for content:", content_id);

    const summaryResp = await fetch(AI_SUMMARY_ENDPOINT, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": API_KEY
  },
  body: JSON.stringify({ content_id, viewer_id, organisation_id })
});

const text = await summaryResp.text();   // get raw response
console.log("RAW AI SUMMARY RESPONSE:", text);


let summaryData;
try {
  summaryData = JSON.parse(text);
} catch(err){
  console.error("⚠ Failed to parse JSON (likely HTML error):", err);
  return res.status(500).send("Error fetching AI summary. See backend logs.");
}

console.log("📝 Parsed AI summary JSON:", summaryData);
       res.json({
    status: 'ready',
    summaryText: summaryData.summary || summaryData // adjust based on your API response
        });

res.json(summaryData);
        
 


  } catch (err) {
    console.error("⚠ Error fetching AI summary:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------
// Test route
// ---------------------------
app.get("/", (req, res) => {
  res.send("🎬 Video Recorder Backend Running");
});

// ---------------------------
// Start server
// ---------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🔥 Server running on port ${PORT}`));
