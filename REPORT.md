# MotoMate — Project Report

---

## 1. What & Why

<!-- 200–250 words -->
<!-- Explain:
     - What MotoMate does (what problem it solves, who it is for)
     - Why you built it this way (key design choices and their motivation)
     - What is hard about getting the AI behavior right for this use case -->

MotoMate is ...

---

## 2. Iterations

<!-- At least 3 labeled versions evaluated against the same eval/test_cases.json set.
     Each version must include: Change, Motivating example, Delta, Conclusion.
     Show the motomate_score before and after each change. -->

### v1 — Initial build

**Change:** ...

**Motivating example:** ...

**Delta:** motomate_score = ? / 13

**Conclusion:** ...

---

### v2 — ...

**Change:** ...

**Motivating example:** ...

**Delta:** motomate_score = ? / 13 (up/down from v1)

**Conclusion:** ...

---

### v3 — ...

**Change:** ...

**Motivating example:** ...

**Delta:** motomate_score = ? / 13 (up/down from v2)

**Conclusion:** ...

---

## 3. Code Walkthrough

<!-- 200–300 words.
     Trace one complete user action through the code using file:line references.
     Explain one design decision and one alternative that was considered and rejected. -->

### Request trace

When a user submits a question, the following happens:

1. **`app.py:??`** — ...
2. **`classifier.py:??`** — ...
3. **`retriever.py:??`** — ...
4. **`answerer.py:??`** — ...
5. **`safety.py:??`** — ...
6. **`app.py:??`** — ...

### Design decision

...

### Alternative considered and rejected

...

---

## 4. AI Disclosure & Safety

<!-- 150–250 words. -->

### How Kiro was used

...

### AI-assistant failures and fixes

1. **Failure:** ... **Fix:** ...
2. **Failure:** ... **Fix:** ...
3. **Failure:** ... **Fix:** ...

### App-specific safety risk

...
