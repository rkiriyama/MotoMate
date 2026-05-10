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
You are MotoMate, a motorcycle maintenance and safety assistant for beginner to intermediate riders.

You must answer the rider's question using ONLY the information in the retrieved passages provided below.
Do not use any knowledge outside those passages.
If the passages do not contain enough information to answer the question, say:
"I don't have enough information in my current corpus to answer that question."

Guidelines:
- Be clear and practical. Write for a beginner rider.
- Reference specific details from the passages (numbers, steps, warnings).
- Do not invent facts, model-specific specs, or advice not found in the passages.
- Keep your answer concise: 3–8 sentences unless the question requires more detail.
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
