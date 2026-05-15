"""
safety.py — Rule-based safety warning detection for MotoMate.

No OpenAI calls are made here. Detection is purely keyword/topic matching
against a predefined set of safety-sensitive terms.

check_safety(question, answer_text, category) → str | None
"""

from typing import Optional

# ---------------------------------------------------------------------------
# Safety-sensitive keyword set
# Topics: tires, brakes, chain/sprocket, engine internals, oil, coolant,
#         fuel system, riding techniques, emergency maneuvers, gear selection
# ---------------------------------------------------------------------------
SAFETY_KEYWORDS: frozenset[str] = frozenset({
    # Tires
    "tire", "tyre", "tires", "tyres", "tread", "puncture", "blowout",
    "tire pressure", "tyre pressure", "flat tire", "flat tyre", "tire wear",
    "tyre wear", "tire replacement", "tyre replacement", "tire change", "tyre change",
    "tire grip", "tyre grip", "tire slip", "tyre slip", "tire traction", "tyre traction",

    # Brakes
    "brake", "brakes", "braking", "brake pad", "brake fluid", "brake line",
    "brake bleeding", "stopping distance", "brake fade", "brake lockup",
    "ABS", "antilock braking system", "brake warning light", "brake failure",
    "loose brake", "hot brake disk", 

    # Chain / sprocket
    "chain", "chain tension", "chain lube", "chain lubrication",
    "chain slack", "chain wear", "chain stretch", "chain replacement", "chain adjustment",
    "chain noise", "chain skipping", "sprocket", "sprocket wear", "sprocket replacement",
    "tight chain", "loose chain", "chain coming off", "chain derailment",

    # Engine warnings / internals
    "low compression", "compression loss", "no compression", "blown head gasket",
    "head gasket leak", "misfire", "misfiring", "backfire", "backfiring", "rough idle",
    "hard starting", "won't start", "stalling", "engine dies", "valve clearance",
    "tight valves", "burnt valve", "bent valve", "valve not sealing", "leaking valve",
    "valve stem seal", "valve cover leak", "valve cover gasket", "timing chain",
    "cam chain", "timing issue", "timing off", "camshaft", "crankshaft", "piston damage",
    "piston rings", "bad rings", "worn rings", "cylinder scoring", "scored cylinder",
    "engine knock", "knocking", "rod knock", "pinging", "detonation", "seized engine",
    "engine seized", "fuel leak", "fuel line leak", "fuel pump failure", "fuel injector clogged",
    "bad injector", "carburetor clogged", "stuck throttle", "throttle sticking", "air leak",
    "vacuum leak", "bad spark plug", "fouled spark plug", "weak spark", "no spark",
    "ignition coil failure", "loss of power", "losing power",

    # Oil
    "oil", "oil change", "oil level", "engine oil", "oil filter", "oil pressure",
    "low oil", "oil leak", "oil consumption", "oil burn", "oil smoke", "oil warning light",
    "fuel dilution", "oil sludge", "oil foaming", "oil starvation",

    # Coolant
    "coolant", "antifreeze", "overheating", "radiator", "cooling system", "cooling fan",
    "thermostat", "water pump", "coolant leak", "temperature warning", "high temp",
    "coolant flush", "coolant change", "coolant level", "coolant warning light",

    # Fuel system
    "carburetor", "carburettor", "fuel injector", "fuel injection", "fuel starvation",
    "fuel filter", "fuel line", "fuel system", "throttle", "gas leak", "fuel leak",
    "fuel warning light",

    # Clutch (mechanical safety relevance)
    "clutch", "loose clutch", "clutch slipping", "clutch adjustment", "clutch replacement",
    "clutch failure", "clutch wire", "clutch cable", "clutch fluid", "hydraulic clutch",

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


def check_safety(question: str, answer_text: str, category: str) -> Optional[str]:
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
