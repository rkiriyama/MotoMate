"""
app.py — MotoMate Flask application entry point.

Routes
------
GET  /             Serve the single-page UI (templates/index.html)
POST /api/ask      Full pipeline: classify → retrieve → answer → safety
POST /api/corpus   Save new corpus text, rebuild TF-IDF index
"""

import os
import sys
import datetime

from flask import Flask, jsonify, render_template, request
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Load environment and validate API key before anything else
# ---------------------------------------------------------------------------
load_dotenv()

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "").strip()
if not OPENAI_API_KEY:
    print(
        "\n[MotoMate] ERROR: OPENAI_API_KEY is missing or empty.\n"
        "  1. Copy .env.example to .env\n"
        "  2. Replace 'your_openai_api_key_here' with your actual key.\n",
        file=sys.stderr,
    )
    sys.exit(1)

# ---------------------------------------------------------------------------
# Import backend modules (after env is confirmed loaded)
# ---------------------------------------------------------------------------
from retriever import rebuild_index, retrieve      # noqa: E402
from classifier import classify                     # noqa: E402
from answerer import answer                         # noqa: E402
from safety import check_safety                     # noqa: E402

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = Flask(__name__)

CORPUS_DIR = os.path.join(os.path.dirname(__file__), "corpus")

# Build the TF-IDF index once at startup
rebuild_index(CORPUS_DIR)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    """Serve the single-page UI."""
    return render_template("index.html")


@app.route("/api/ask", methods=["POST"])
def api_ask():
    """
    Main query pipeline.

    Expected JSON body:
    {
        "year":     "2020",
        "make":     "Honda",
        "model":    "CB500F",
        "mileage":  "5000",
        "question": "How often should I change the oil?"
    }

    Response JSON:
    {
        "category":       "maintenance",
        "answer":         "...",
        "sources":        [{"file": "...", "chunk_index": 0, "score": 0.42}],
        "safety_warning": "⚠️ Safety Note: ...",   // or null
        "has_answer":     true
    }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON."}), 400

    # --- Validate required fields ---
    required = ["year", "make", "model", "mileage", "question"]
    missing = [f for f in required if not str(data.get(f, "")).strip()]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    bike_profile = {
        "year":    str(data["year"]).strip(),
        "make":    str(data["make"]).strip(),
        "model":   str(data["model"]).strip(),
        "mileage": str(data["mileage"]).strip(),
    }
    question = str(data["question"]).strip()[:500]  # enforce 500-char limit

    # --- Step 1: Classify ---
    category = classify(question, bike_profile)

    # --- Step 2: Retrieve ---
    top_chunks, max_score = retrieve(question)

    # --- Step 3: Answer (or refuse) ---
    result = answer(question, bike_profile, top_chunks, max_score)

    # --- Step 4: Safety warning (rule-based, no OpenAI call) ---
    safety_warning = check_safety(question, result["answer"], category)

    return jsonify({
        "category":       category,
        "answer":         result["answer"],
        "sources":        result["sources"],
        "safety_warning": safety_warning,
        "has_answer":     result["has_answer"],
    })


@app.route("/api/corpus", methods=["POST"])
def api_corpus():
    """
    Add new text to the corpus.

    Expected JSON body:
    {
        "text": "Paste motorcycle manual content here..."
    }

    Response JSON:
    {
        "success": true,
        "filename": "corpus_20260510_153045.txt",
        "message": "Corpus updated. Index rebuilt with N chunks."
    }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON."}), 400

    text = str(data.get("text", "")).strip()
    if not text:
        return jsonify({"error": "Field 'text' is required and must not be empty."}), 400

    if len(text) < 50:
        return jsonify({"error": "Text is too short. Please provide at least 50 characters."}), 400

    # Save to a timestamped file in corpus/
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"corpus_{timestamp}.txt"
    filepath = os.path.join(CORPUS_DIR, filename)

    try:
        os.makedirs(CORPUS_DIR, exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(text)
    except OSError as exc:
        return jsonify({"error": f"Could not save file: {exc}"}), 500

    # Rebuild the TF-IDF index with the new file included
    rebuild_index(CORPUS_DIR)

    # Count total chunks for confirmation message
    from retriever import _chunks as current_chunks  # noqa: F401
    chunk_count = len(current_chunks)

    return jsonify({
        "success":  True,
        "filename": filename,
        "message":  f"Corpus updated. Index rebuilt with {chunk_count} chunks.",
    })


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
