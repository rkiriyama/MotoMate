"""
answerer.py — Grounded answer generation via OpenAI (call #2).

answer(question, bike_profile, chunks, max_score) → dict
"""

import os
from openai import OpenAI

RETRIEVAL_THRESHOLD = 0.10

REFUSAL_MESSAGE = (
    "I don't have enough information in my current corpus to answer that "
    "question. Try adding relevant content using the 'Add to Corpus' feature."
)

_SYSTEM_PROMPT = """\
You are MotoMate, a motorcycle maintenance and safety assistant for beginner-to-intermediate riders.

Your job is to answer the rider's question using ONLY the retrieved passages provided by the app.
Do not use outside knowledge, even if you think you know the answer.

Important distinction:
There are two types of questions:

1. General motorcycle questions
   These include riding technique, safety advice, gear advice, general maintenance best practices, and general motorcycle concepts.
   For these questions, you may answer from the retrieved passages even if the passages do not mention the rider's exact year, make, or model.
   The user's bike profile is helpful context, but an exact bike match is NOT required for general riding, safety, gear, or maintenance-best-practice questions.

2. Exact motorcycle-specific questions
   These include exact torque specs, valve clearances, tire pressures, fluid capacities, part numbers, service intervals, model-specific procedures, or anything that depends on the exact year/make/model.
   For these questions, you must refuse unless the retrieved passages directly contain the exact requested model-specific information.

Grounding rules:
- Use only facts, steps, warnings, definitions, or recommendations that appear in the retrieved passages.
- If the retrieved passages contain relevant general safety/riding/gear/maintenance information, answer using that information even if the user's exact motorcycle is not named.
- Do not invent model-specific specifications, exact service intervals, torque specs, tire pressures, fluid capacities, valve clearances, part numbers, or repair procedures unless they appear directly in the retrieved passages.
- If the retrieved passages are unrelated, too vague, or missing the needed information, say:
  "I don't have enough information in my current corpus to answer that question."
- Do not add extra guesses after refusing.

Examples:
- If the rider asks, "What is the correct technique for emergency braking?" and the passages discuss emergency braking, answer from those passages even if the rider's exact motorcycle model is not mentioned.
- If the rider asks, "How should I approach cornering as a beginner?" and the passages discuss cornering technique, answer from those passages even if the exact bike is missing.
- If the rider asks, "What type of helmet gives the most protection?" and the passages discuss helmet types, answer from those passages even if the motorcycle profile is unrelated.
- If the rider asks, "What is the exact valve clearance for my 2024 Ducati Panigale V4?" and the passages do not include that exact specification, refuse instead of guessing.
- If the rider asks, "What tire pressure should I use for my specific bike?" and the passages do not include that exact model-specific pressure, refuse or say the corpus does not contain the exact pressure.
- If the rider asks about a car, restaurant, unrelated product, medical issue, legal issue, or anything outside motorcycle maintenance/safety/general motorcycle knowledge, refuse.

Answer style:
- Be clear, practical, and beginner-friendly.
- Keep the answer concise: usually 3–8 sentences.
- Mention source-based details when useful, such as steps, warning signs, or maintenance checks from the passages.
- Avoid sounding overconfident when the corpus only provides general guidance.
- Do not say “according to my training” or reference outside knowledge.
"""


def _build_context(bike_profile: dict, question: str, chunks: list[dict]) -> str:
    """Format the user message sent to the answer model."""
    bike_str = (
        f"{bike_profile.get('year', '?')} "
        f"{bike_profile.get('make', '?')} "
        f"{bike_profile.get('model', '?')}, "
        f"{bike_profile.get('mileage', '?')} miles"
    )

    passages = []
    for i, chunk in enumerate(chunks, 1):
        passages.append(
            f"[Passage {i} — {chunk['file']}, chunk {chunk['chunk_index']}]\n"
            f"{chunk['text']}"
        )
    passages_block = "\n\n".join(passages)

    return (
        f"Rider's bike: {bike_str}\n"
        f"Rider's question: {question}\n\n"
        f"Retrieved passages:\n{passages_block}"
    )


def answer(
    question: str,
    bike_profile: dict,
    chunks: list[dict],
    max_score: float,
) -> dict:
    """
    Generate a grounded answer or return a refusal.

    Parameters
    ----------
    question     : the rider's question
    bike_profile : dict with year, make, model, mileage
    chunks       : top-k retrieved corpus chunks (may be empty)
    max_score    : highest cosine similarity score from retrieval

    Returns
    -------
    {
        answer    : str   — answer text or refusal message
        sources   : list  — [{file, chunk_index, score}, ...]
        has_answer: bool  — False when the system refuses
    }
    """
    # --- Refusal path: insufficient corpus evidence ---
    if max_score < RETRIEVAL_THRESHOLD or not chunks:
        return {
            "answer": REFUSAL_MESSAGE,
            "sources": [],
            "has_answer": False,
        }

    # --- Answer path: call OpenAI with retrieved context ---
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    user_content = _build_context(bike_profile, question, chunks)

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user",   "content": user_content},
            ],
            temperature=0.3,
            max_tokens=400,
            timeout=30,
        )
        answer_text = response.choices[0].message.content.strip()

        # If the model admits it cannot answer despite having passages, treat
        # it as a refusal so the caller knows no real answer was produced.
        lower = answer_text.lower()
        if (
            "don't have enough information" in lower
            or "cannot answer" in lower
            or "i do not have" in lower
        ):
            return {
                "answer": REFUSAL_MESSAGE,
                "sources": [],
                "has_answer": False,
            }

        sources = [
            {"file": c["file"], "chunk_index": c["chunk_index"], "score": c.get("score", 0)}
            for c in chunks
        ]
        return {
            "answer": answer_text,
            "sources": sources,
            "has_answer": True,
        }

    except Exception as exc:
        return {
            "answer": f"An error occurred while generating the answer: {exc}",
            "sources": [],
            "has_answer": False,
        }
