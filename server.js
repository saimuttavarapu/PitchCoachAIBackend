// server.js
import express from "express";
import multer from "multer";
import FormData from "form-data";
import fetch from "node-fetch";
import cors from "cors";
import fs from "fs";

const app = express();
app.use(cors());

// Multer stores uploaded file in RAM (buffer)
const upload = multer({ storage: multer.memoryStorage() });

const REV_ENDPOINT = "https://dev.my.api.revspire.io/local-upload-chunked";
const API_KEY = "AIzaSyCVPno_o9cQ1V0t_Bm-ZUlbwEGlFZkofrc";

// Hard-coded fields
const FIXED_FIELDS = {
  created_by: "IGH141585754362",
  description: "Content",
  folder: "WRS698268771821",
  viewer_id: "IGH141585754362",
  organisation_id: "PDX436422222699",
};

app.post("/upload", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const form = new FormData();

    // append required static fields
    for (const key in FIXED_FIELDS) {
      form.append(key, FIXED_FIELDS[key]);
    }

    // append video blob as `files`
    form.append("files", req.file.buffer, {
      filename: req.file.originalname || "video.webm",
      contentType: req.file.mimetype,
    });

    // make actual request to revspire endpoint
    const response = await fetch(REV_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        ...form.getHeaders(),
      },
      body: form,
    });

    const data = await response.json();




     // 🟩 LOG CONTENT ID TO SERVER
    try {
      const uploaded = data?.uploadedFiles?.[0];
      if (uploaded?.contentId) {
        console.log("🔥 Uploaded Content ID:", uploaded.contentId);
      } else {
        console.log("⚠ No contentId returned:", data);
      }
    } catch (err) {
      console.log("⚠ Could not extract contentId:", err);
    }




    

    return res.json({
      success: true,
      revspire_response: data,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("Backend relay is online");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on " + PORT));
