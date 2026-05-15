"""
run_eval.py — MotoMate evaluation runner

Usage (with the Flask app already running on port 5000):
    python eval/run_eval.py

Scores four dimensions per test case:
  category_ok   — returned category matches expected_category
  answer_ok     — has_answer matches expect_answer
  safety_ok     — safety_warning present iff expect_safety_warning is true
  grounding_ok  — if expect_answer is true: sources list is non-empty AND
                   (if expected_source_keyword present) keyword appears
                   case-insensitively in answer text or any source filename;
                   if expect_answer is false: passes automatically when
                   answer_ok passes

A case is CORRECT only when all four dimensions pass.

Prints a per-case table and the final motomate_score.
"""

import json
import sys
import urllib.request
import urllib.error

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BASE_URL    = "http://localhost:5000"
CASES_FILE  = "eval/test_cases.json"
COL_WIDTH   = 10


# ---------------------------------------------------------------------------
# HTTP helper (no third-party libraries)
# ---------------------------------------------------------------------------
def post_json(url, payload):
    """POST *payload* dict as JSON, return (status_code, response_dict)."""
    body = json.dumps(payload).encode("utf-8")
    req  = urllib.request.Request(
        url,
        data    = body,
        headers = {"Content-Type": "application/json"},
        method  = "POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=40) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode("utf-8"))
        except Exception:
            body = {"error": str(e)}
        return e.code, body
    except Exception as e:
        return 0, {"error": str(e)}


# ---------------------------------------------------------------------------
# Scoring helpers
# ---------------------------------------------------------------------------
def score_case(tc, resp):
    """
    Returns a dict with keys: category_ok, answer_ok, safety_ok,
    grounding_ok, all_ok, note.
    """
    result = {
        "category_ok":  False,
        "answer_ok":    False,
        "safety_ok":    False,
        "grounding_ok": False,
        "all_ok":       False,
        "note":         "",
    }

    # --- category_ok ---
    got_category = (resp.get("category") or "").strip().lower()
    result["category_ok"] = (got_category == tc["expected_category"])

    # --- answer_ok ---
    got_has_answer  = bool(resp.get("has_answer"))
    expect_answer   = bool(tc["expect_answer"])
    result["answer_ok"] = (got_has_answer == expect_answer)

    # --- safety_ok ---
    got_warning     = bool(resp.get("safety_warning"))
    expect_warning  = bool(tc["expect_safety_warning"])
    result["safety_ok"] = (got_warning == expect_warning)

    # --- grounding_ok ---
    if not expect_answer:
        # Refusal case: grounding passes automatically if answer_ok passes
        result["grounding_ok"] = result["answer_ok"]
    else:
        sources = resp.get("sources") or []
        has_sources = len(sources) > 0

        keyword = tc.get("expected_source_keyword", "").strip().lower()
        if not keyword:
            # No keyword to check — just need non-empty sources
            result["grounding_ok"] = has_sources
        else:
            answer_text = (resp.get("answer") or "").lower()
            source_files = " ".join(
                (s.get("file") or "").lower() for s in sources
            )
            keyword_found = keyword in answer_text or keyword in source_files
            result["grounding_ok"] = has_sources and keyword_found

    result["all_ok"] = (
        result["category_ok"]
        and result["answer_ok"]
        and result["safety_ok"]
        and result["grounding_ok"]
    )
    return result


def tick(val):
    return "PASS" if val else "FAIL"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    # Load test cases
    try:
        with open(CASES_FILE, encoding="utf-8") as f:
            cases = json.load(f)
    except FileNotFoundError:
        print(f"ERROR: {CASES_FILE} not found.")
        print("Run this script from the MotoMate project root:")
        print("    python eval/run_eval.py")
        sys.exit(1)

    # Check server is reachable
    try:
        urllib.request.urlopen(BASE_URL, timeout=5)
    except Exception:
        print(f"ERROR: Cannot reach {BASE_URL}")
        print("Make sure the app is running:  python app.py")
        sys.exit(1)

    print()
    print("=" * 78)
    print("  MotoMate Evaluation")
    print("=" * 78)

    # Header row
    header = (
        f"{'ID':<8}"
        f"{'CATEGORY':<{COL_WIDTH}}"
        f"{'ANSWER':<{COL_WIDTH}}"
        f"{'SAFETY':<{COL_WIDTH}}"
        f"{'GROUNDING':<{COL_WIDTH}}"
        f"{'RESULT':<8}"
        f"  NOTE"
    )
    print(header)
    print("-" * 78)

    correct = 0
    total   = len(cases)

    for tc in cases:
        tc_id = tc["id"]

        payload = {
            "year":     tc["year"],
            "make":     tc["make"],
            "model":    tc["model"],
            "mileage":  tc["mileage"],
            "question": tc["question"],
        }

        status, resp = post_json(f"{BASE_URL}/api/ask", payload)

        if status == 0 or "error" in resp and status != 200:
            note = resp.get("error", "request failed")[:40]
            row = (
                f"{tc_id:<8}"
                f"{'ERR':<{COL_WIDTH}}"
                f"{'ERR':<{COL_WIDTH}}"
                f"{'ERR':<{COL_WIDTH}}"
                f"{'ERR':<{COL_WIDTH}}"
                f"{'FAIL':<8}"
                f"  {note}"
            )
            print(row)
            continue

        scores = score_case(tc, resp)
        if scores["all_ok"]:
            correct += 1

        # Build note for failures
        note_parts = []
        if not scores["category_ok"]:
            note_parts.append(
                f"category got={resp.get('category','?')} "
                f"want={tc['expected_category']}"
            )
        if not scores["grounding_ok"] and tc["expect_answer"]:
            kw = tc.get("expected_source_keyword", "")
            note_parts.append(f"keyword '{kw}' not found" if kw else "no sources")
        note = "; ".join(note_parts)[:50]

        row = (
            f"{tc_id:<8}"
            f"{tick(scores['category_ok']):<{COL_WIDTH}}"
            f"{tick(scores['answer_ok']):<{COL_WIDTH}}"
            f"{tick(scores['safety_ok']):<{COL_WIDTH}}"
            f"{tick(scores['grounding_ok']):<{COL_WIDTH}}"
            f"{'YES' if scores['all_ok'] else 'NO':<8}"
            f"  {note}"
        )
        print(row)

    print("-" * 78)
    score = correct / total if total else 0.0
    print(f"\n  motomate_score = {correct}/{total} = {score:.3f}\n")
    print("=" * 78)
    print()


if __name__ == "__main__":
    main()
