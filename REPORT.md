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

### Code Walkthrough

One important user action is when a rider fills out the MotoMate form and clicks **“Ask MotoMate.”** In `static/app.js:129-165`, the click handler collects the year, make, model, mileage, and question fields, converts them into a JSON payload, and sends a `POST` request to `/api/ask`. The frontend also clears the old response, turns on the loading state, and waits for the backend response before calling `renderResponse(data)`.

On the backend, the request is handled by the `/api/ask` route in `app.py:89-139`. First, the route reads the JSON body and validates that all five required fields are present. It then builds a `bike_profile` dictionary and limits the question to 500 characters. After that, the route runs the main pipeline: `classify(question, bike_profile)`, `retrieve(question)`, `answer(question, bike_profile, top_chunks, max_score)`, and finally `check_safety(...)` only if an actual answer was produced.

The retrieval step is handled in `retriever.py:99-135`. The user’s question is converted into a TF-IDF vector, compared against the stored corpus chunks with cosine similarity, sorted by score, and filtered so only chunks above the threshold are returned. Then, in `answerer.py:81-124`, the answerer refuses immediately if the retrieval score is too low or no chunks were found. Otherwise, it builds a prompt containing the bike profile, question, and retrieved passages, then asks the model to answer only from that context.

A key design decision was using retrieval-grounded answering instead of letting the model answer freely. I chose this because motorcycle advice can be safety-sensitive, especially for brakes, tires, oil, and model-specific specs. An alternative I rejected was sending the user’s question directly to the LLM, because that could produce confident but unsupported maintenance advice.

---

## 4. AI Disclosure & Safety

### How Kiro was used

I used Kiro as an AI development assistant to plan, scaffold, debug, and improve MotoMate. My goal was to build a motorcycle-focused AI assistant that answers maintenance and safety questions using a local corpus instead of relying only on general LLM knowledge. Kiro helped me break the project into phases, including the Flask backend, frontend form, classifier, retriever, answerer, safety checker, evaluation tests, README, and REPORT. It then generated code for all of the phases.

One issue was that the response panel stayed hidden even when the backend returned a successful answer. The problem was that CSS had the panel set to `display: none`, but JavaScript was only clearing the display value instead of forcing it to show. I fixed this by telling Kiro to change the JavaScript to set the panel to `display: block` and removing the CSS rule that kept it hidden.

Another issue was that the safety warning appeared even when MotoMate refused to answer a question. For example, a valve clearance question was correctly refused, but the word “valve” still triggered the safety warning. I fixed this by telling Kiro to only run the safety warning check when MotoMate actually gives an answer. If the app refuses to answer, no safety warning is added.

Overall, Kiro helped speed up development, but I still reviewed the code, tested the app locally, identified incorrect behavior, and decided which fixes matched the project requirements. I also completed the REPORT file and asked for help understanding the code and overall structure with help from ChatGPT/Kiro.
...

### App-specific safety risk

One safety risk specific to MotoMate is hallucination harm, because incorrect motorcycle maintenance advice about brakes, tires, oil, chains, or model-specific specs could lead to mechanical damage or rider injury. To reduce this risk, I designed MotoMate to answer only from retrieved corpus passages and refuse when the retrieved information is missing or too weak. I accepted the limit that the app may refuse some valid questions rather than risk giving unsupported advice. I recall Professor saying "It is better to give false postives on safety matters than false negatives."

...
