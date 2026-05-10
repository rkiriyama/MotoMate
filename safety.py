"""
safety.py — Rule-based safety warning detection for MotoMate.

No OpenAI calls are made here. Detection is purely keyword/topic matching
against a predefined set of safety-sensitive terms.

check_safety(question, answer_text, category) → str | None
"""

# ---------------------------------------------------------------------------
# Safety-sensitive keyword set
# Topics: tires, brakes, chain/sprocket, engine internals, oil, coolant,
#         fuel system, riding techniques, emergency maneuvers, gear selection
# ---------------------------------------------------------------------------
SAFETY_KEYWORDS: frozenset[str] = frozenset({
    # Tires
    "tire", "tyre", "tires", "tyres", "tread", "puncture", "blowout",
    "tire pressure", "tyre pressure",

    # Brakes
    "brake", "brakes", "braking", "brake pad", "brake fluid",
    "brake bleeding", "stopping distance", "brake fade",

    # Chain / sprocket
    "chain", "sprocket", "chain tension", "chain lube", "chain lubrication",
    "chain slack", "chain wear", "chain stretch",

    # Engine internals
    "valve", "piston", "timing", "compression", "valve clearance",
    "cylinder", "engine internals", "top end",

    # Oil
    "oil", "oil change", "oil level", "engine oil", "oil filter",

    # Coolant
    "coolant", "antifreeze", "overheating", "radiator", "cooling system",

    # Fuel system
    "carburetor", "carburettor", "fuel injector", "fuel injection",
    "fuel filter", "fuel line", "fuel system", "throttle",

    # Clutch (mechanical safety relevance)
    "clutch",

    # Riding techniques
    "cornering", "corner", "lean", "counter-steer", "countersteering",
    "body position", "braking technique", "riding technique",

    # Emergency maneuvers
    "emergency", "emergency braking", "swerve", "swerving",
    "skid", "skidding", "high-side", "highside", "low-side", "lowside",
    "crash", "fall", "slide",

    # Gear selection (safety context)
    "helmet", "helmets", "full-face", "modular helmet",
    "jacket", "jackets", "armor", "armour", "ce level",
    "glove", "gloves", "gauntlet",
    "boots", "boot", "ankle",
    "hi-vis", "high-visibility", "reflective",
})

WARNING_TEXT = (
    "⚠️ Safety Note: This topic can affect rider safety. "
    "If you are unsure, consult a certified motorcycle mechanic "
    "or a qualified riding instructor."
)


def check_safety(question: str, answer_text: str, category: str) -> str | None:
    """
    Determine whether the question + answer touch a safety-sensitive topic.

    Parameters
    ----------
    question    : the rider's original question
    answer_text : the generated answer (or refusal message)
    category    : the classified request category (unused directly, kept for
                  potential future category-based overrides)

    Returns
    -------
    WARNING_TEXT if a safety keyword is found, otherwise None.
    """
    combined = (question + " " + answer_text).lower()

    # Tokenise loosely: split on non-alphanumeric characters
    # This lets multi-word phrases like "emergency braking" match as substrings
    for keyword in SAFETY_KEYWORDS:
        if keyword in combined:
            return WARNING_TEXT

    return None
