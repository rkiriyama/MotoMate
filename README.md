# MotoMate

**CPSC 254 Final Project**

MotoMate is an AI-powered motorcycle maintenance and safety assistant for beginner to intermediate riders. You enter your bike's year, make, model, and mileage, then ask a question. The app retrieves the most relevant passages from a local corpus of motorcycle guides using TF-IDF similarity, then calls the OpenAI API to generate a grounded answer. If the corpus does not contain enough information, the app refuses to guess rather than hallucinate. Safety-sensitive topics automatically display a warning.

### What the app does

- **Classifies** your question into one of five categories: maintenance, general info, safety & riding, gear, or unsupported
- **Retrieves** the most relevant passages from local `.txt` corpus files using TF-IDF cosine similarity — no external database
- **Generates a grounded answer** using OpenAI (`gpt-4o-mini`), constrained to the retrieved passages only
- **Refuses** to answer when evidence is missing, rather than guessing
- **Flags safety-sensitive topics** (brakes, tires, chain, oil, emergency maneuvers, gear, etc.) with a rule-based warning — no extra API call
- **Add-to-Corpus** — paste additional motorcycle content in the UI and the app rebuilds its index immediately in the same session

---

## Requirements

- Python 3.11 or higher
- An OpenAI API key (provided as a `.env` file containing only `OPENAI_API_KEY`)
- Internet connection (for OpenAI API calls)

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/rkiriyama/MotoMate.git
cd MotoMate
```

### 2. Create and activate a virtual environment

```bash
python3 -m venv venv
source venv/bin/activate
```

Your terminal prompt should now show `(venv)`.

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Add your API key

The grader provides a `.env` file containing their `OPENAI_API_KEY`. Place that file in the `MotoMate/` project root (the same folder as `app.py`):

```
MotoMate/
├── .env          ← place it here
├── app.py
├── ...
```

The `.env` file should contain exactly:

```
OPENAI_API_KEY=your_openai_api_key_here
```

If the key is missing or empty, the app will print a clear error and exit.

### 5. Run the app

```bash
python app.py
```

You should see:

```
 * Running on http://0.0.0.0:5000
```

### 6. Open the app in your browser

```
http://localhost:5000
```

Fill in all four bike fields (year, make, model, mileage), type a question, and click **Ask MotoMate**.

---

## Running the Evaluation

With the app already running in one terminal, open a second terminal, activate the same virtual environment, and run:

```bash
source venv/bin/activate
python eval/run_eval.py
```

This sends all 13 labeled test cases to the running app and prints a per-case results table plus the final `motomate_score`.

Example output:

```
======================================================================
  MotoMate Evaluation
======================================================================
ID      CATEGORY  ANSWER    SAFETY    GROUNDING RESULT    NOTE
----------------------------------------------------------------------
tc01    PASS      PASS      PASS      PASS      YES
tc02    PASS      PASS      PASS      PASS      YES
...
----------------------------------------------------------------------

  motomate_score = 12/13 = 0.923

======================================================================
```

---

## Project Structure

```
MotoMate/
├── app.py                  # Flask entry point — routes and pipeline orchestration
├── classifier.py           # OpenAI call #1 — classifies question into category
├── retriever.py            # TF-IDF chunking and cosine similarity retrieval
├── answerer.py             # OpenAI call #2 — grounded answer generation or refusal
├── safety.py               # Rule-based safety warning detection (no API call)
├── corpus/                 # Local plain-text knowledge base
│   ├── maintenance_basics.txt
│   ├── safety_riding.txt
│   ├── gear_guide.txt
│   └── general_info.txt
├── static/
│   ├── app.js              # Frontend logic
│   └── style.css           # Styles
├── templates/
│   └── index.html          # Single-page UI
├── eval/
│   ├── test_cases.json     # 13 labeled test cases
│   └── run_eval.py         # Evaluation runner — prints motomate_score
├── .env.example            # Template for the required .env file
├── requirements.txt        # Python dependencies
└── REPORT.md               # Project report
```

---

## Stopping the Server

Press `Ctrl + C` in the terminal where `python app.py` is running.
