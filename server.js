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
const API_KEY = "AIzaSyCVPno_o9cQ1V0t_Bm-ZUlbwEGlFZkofrc";

// Hardcoded values
const META = {
  created_by: "IGH141585754362",
  description: "Content",
  folder: "WRS698268771821",
  viewer_id: "IGH141585754362",
  organisation_id: "PDX436422222699"
};

app.post("/upload", upload.single("file"), async (req, res) => {
  console.log("📩 Incoming upload request");

  if (!req.file) {
    console.error("❌ No file received");
    return res.status(400).json({ error: "No file uploaded" });
  }

  console.log("📦 Received file:", req.file.originalname);
  console.log("📦 File size:", req.file.size);

  try {
    const form = new FormData();

    Object.entries(META).forEach(([k, v]) => form.append(k, v));

    form.append("files", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    console.log("🚀 Sending to REV API…");

    const response = await fetch(REV_ENDPOINT, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY
      },
      body: form
    });

    const data = await response.json();

    console.log("✅ REV API Response:", data);

    // Return the content ID to the frontend
    res.json({
      status: "uploaded",
      contentId: data?.uploadedFiles?.[0]?.contentId || null,
      revResponse: data
    });

  } catch (err) {
    console.error("🔥 Upload failed:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("Backend is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🔥 Server running on ${PORT}`));
