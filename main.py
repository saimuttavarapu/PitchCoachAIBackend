from fastapi import FastAPI, UploadFile
from openai import OpenAI
import tempfile
import pypdf
import whisper

client = OpenAI(api_key="YOUR_OPENAI_API_KEY")
app = FastAPI()

# Load Whisper model for speech transcription
model = whisper.load_model("base")

@app.post("/analyze")
async def analyze(pitch_video: UploadFile, pitch_deck: UploadFile):

    # --- Save uploaded files temporarily ---
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as vid:
        vid.write(await pitch_video.read())
        video_path = vid.name

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as pdf:
        pdf.write(await pitch_deck.read())
        deck_path = pdf.name

    # --- 1️⃣ Transcribe speech using Whisper ---
    result = model.transcribe(video_path)
    transcript = result["text"]

    # --- 2️⃣ Extract text from PDF slides ---
    reader = pypdf.PdfReader(deck_path)
    slide_text = "\n".join([page.extract_text() for page in reader.pages])

    # --- 3️⃣ AI Agent Evaluation ---
    prompt = f"""
You are a VC Pitch Coach AI.

TRANSCRIPT:
{transcript}

SLIDES:
{slide_text}

Please provide:
1. Score (0–100)
2. Tone analysis
3. Filler words
4. Confidence markers
5. Clarity & structure
6. Business weaknesses
7. Suggestions for improvement
"""
    response = client.responses.create(model="gpt-5.1", input=prompt)

    return {"analysis": response.output_text}
