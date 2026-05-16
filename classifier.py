"""
classifier.py — Request classification via OpenAI (call #1).

classify(question, bike_profile) → category string
"""

import os
from openai import OpenAI

VALID_CATEGORIES = {
    "maintenance",
    "general_info",
    "safety_riding",
    "gear",
    "unsupported",
}

_SYSTEM_PROMPT = """\
You are a motorcycle question classifier. Your only job is to read a rider's question and return exactly one category label — nothing else.

Categories:
- maintenance     : oil changes, filters, fluids, chain, tires, brakes, coolant, scheduled service tasks, service intervals, inspection procedures, and model-specific maintenance specs (e.g. valve clearance, torque specs, fluid capacities)
- general_info    : informational questions about how motorcycles work (engine types, ABS, fuel systems, displacement classes, wet vs dry clutch) — not specific to a make/model and not a service task
- safety_riding   : riding techniques, road hazards, cornering, emergency braking, skid recovery, visibility
- gear            : helmets, jackets, gloves, boots, riding pants, hi-vis apparel
- unsupported     : anything unrelated to motorcycles, or questions that are not about motorcycle maintenance, general info, riding safety, or gear

Rules:
1. Reply with ONLY the category name, lowercase, no punctuation, no explanation.
2. If the question is clearly off-topic (not about motorcycles), return: unsupported
3. If the question involves any kind of service task, inspection, or model-specific spec, classify as maintenance — not general_info.
4. general_info is for conceptual questions about how motorcycles work in general, not for questions about a specific bike's service data.
5. Do not return any category other than the five listed above.

Examples:
- "What are the best motorcycle jackets?" → gear
- "How do I change my oil?" → maintenance
- "What is the valve clearance spec for my Honda CB500F?" → maintenance
- "What does ABS do?" → general_info
- "What is the difference between a parallel-twin and a V-twin?" → general_info
- "How do I take a sharp corner?" → safety_riding
- "What's the weather like today?" → unsupported
- "What's the best restaurant near the dealership?" → unsupported
"""


def classify(question: str, bike_profile: dict) -> str:
    """
    Classify *question* into one of the five MotoMate categories.

    Parameters
    ----------
    question     : the rider's free-text question
    bike_profile : dict with keys year, make, model, mileage

    Returns
    -------
    One of: maintenance | general_info | safety_riding | gear | unsupported
    """
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

    user_content = (
        f"Bike: {bike_profile.get('year', '?')} "
        f"{bike_profile.get('make', '?')} "
        f"{bike_profile.get('model', '?')}, "
        f"{bike_profile.get('mileage', '?')} miles\n"
        f"Question: {question}"
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user",   "content": user_content},
            ],
            temperature=0.0,
            max_tokens=10,
            timeout=30,
        )
        raw = response.choices[0].message.content.strip().lower()
        # Strip any accidental punctuation the model might add
        category = raw.strip(".:, \n")
        if category in VALID_CATEGORIES:
            return category
        # Partial match fallback (e.g. model returns "general_information")
        for valid in VALID_CATEGORIES:
            if valid in category:
                return valid
        return "unsupported"
    except Exception:
        return "unsupported"
