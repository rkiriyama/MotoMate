# MotoMate — Project Report

---

## 1. What & Why

MotoMate is an AI-powered motorcycle maintenance and safety assistant for beginner-to-intermediate riders. The app lets users enter their motorcycle’s year, make, model, mileage, and a question, then returns maintenance or safety guidance based on information retrieved from a local motorcycle corpus. It is designed for new to intermediate riders who may not yet know how to interpret maintenance symptoms, riding safety concerns, or gear recommendations, but still want clear and cautious guidance before deciding whether to do something themselves or contact a mechanic.

I built MotoMate around a local retrieval-based design because motorcycle advice can become risky if the model guesses. Instead of letting the LLM answer from general knowledge alone, the backend first classifies the request, retrieves relevant passages from local corpus files using TF-IDF search, and then asks the OpenAI model to answer only from those retrieved passages. If the app cannot find enough supporting information, it refuses to answer instead of inventing unsupported details. I also used rule-based safety warnings for topics like brakes, tires, chains, riding technique, and gear because those areas can directly affect rider safety.

The hardest part of getting the AI behavior right is balancing usefulness with caution. A rider may ask a question that sounds simple, but exact motorcycle-specific details like torque specs, tire pressures, or fluid capacities should not be guessed. The app must decide when the retrieved evidence is strong enough to answer and when it should refuse or warn the user. This makes grounding, refusal behavior, and safety handling the most important parts of the project.

---

## 2. Iterations

### v1 — Baseline build

**Change:** This is the first iteration where MotoMate functioned. It has a simple system prompt for the classifier and answerer. The model the baseline uses is gpt-4o-mini. 

**Motivating example:** In tc09, the check_safety function gave a false positive for the safety warning. The category was general info about engine types. The website was supposed to give no warning, since this doesn't affect rider safety.

**Delta:** N/A -> 0.692

**Conclusion:** The Baseline showed that check_safety keywords needed to be improved to correctly flag a safety issue. Some keywords are too broad and need to be specified.

---

### v2 — Improved safety check

**Change:** The safety classifiers have been expanded and general terms have been specified to reduce collision with general motorcycle facts. For example, instead of just "valve", I changed it to "valve seal", so that general questions about the engine won't trigger a safety warning.

**Motivating example:** The safety checks for off-topic questions involving the safety keywords get triggered. Both tc10 and tc11 incorrectly flag a safety warning when nothing is supposed to be given due to incomplete information from the corpus.

**Delta:** 0.692 -> 0.769 = 0.077 (up from v1)

**Conclusion:** Expanding the safety classifiers to be more specific helped increase accuracy by preventing accidental flagging of the safety warning. However, the system still flags safety keywords from off-topic messages. I will fix this in the next iteration.

---

### v3 — Fixed Safety warning logic 

**Change:** Updated app.py so that when the LLM classifies the user message as off-topic, it will not show any safety message if safety terms are present in the message. This makes it so that off-topic questions get answered with just a not-enough-information statement.

**Motivating example:** In tc13, the answer, safety, and grounding tests failed. This means that the model failed to answer the question based on the corpus. Specifically, the test asked a general question about rain riding, but the model stated it didn't have the information, even though the corpus has general riding information.

**Delta:** 0.769 -> 0.923 = 0.154 (up from v2)

**Conclusion:** Fixing the logic for the safety warning improved the safety scores tests. However, the system prompt is still vague and can lead to the AI categorizing a general motorcycle question into a not-enough info answer.

---

### v4 — Improving Answerer System Prompt

**Change:**  I changed the answer-generation model while keeping the classifier prompt, retrieval threshold, safety rules, corpus, and eval set the same.

**Motivating example:** In tc13, MotoMate still struggled with refusing exact model specific specifications when the corpus did not contain the requested information. I wanted to test whether a stronger answer model would follow the grounding instructions more reliably.

**Delta:**  0.923 -> 0.923 (No Change)

**Conclusion:** The score did not improve because the remaining failures were not mainly caused by answer-generation quality. They were caused by retrieval/refusal logic before the answer model had enough useful evidence. This showed that improving the model alone was less useful than tuning retrieval and guardrails. I kept the previous model because it was cheaper and performed the same on my eval set. This is my last iteration since I am running out of time on the assignment and my score is pretty decent.

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
