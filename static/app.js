// app.js — MotoMate frontend logic

(function () {
  "use strict";

  // ── Element references ──────────────────────────────────────────────────
  const PROFILE_FIELDS = ["year", "make", "model", "mileage"];
  const ALL_FIELDS     = [...PROFILE_FIELDS, "question"];

  const askBtn        = document.getElementById("ask-btn");
  const questionEl    = document.getElementById("question");
  const charCountEl   = document.getElementById("char-count");
  const responsePanel = document.getElementById("response-panel");

  // Response sub-elements
  const errorBox      = document.getElementById("error-box");
  const answerSection = document.getElementById("answer-section");
  const categoryBadge = document.getElementById("category-badge");
  const answerText    = document.getElementById("answer-text");
  const safetyBox     = document.getElementById("safety-warning");
  const sourcesSection= document.getElementById("sources-section");
  const sourcesList   = document.getElementById("sources-list");

  // Corpus elements
  const corpusBtn     = document.getElementById("corpus-btn");
  const corpusTextEl  = document.getElementById("corpus-text");
  const corpusStatus  = document.getElementById("corpus-status");

  // ── Utility helpers ─────────────────────────────────────────────────────
  function show(el) { el.style.display = ""; }
  function hide(el) { el.style.display = "none"; }

  // ── Character counter ───────────────────────────────────────────────────
  questionEl.addEventListener("input", () => {
    const len = questionEl.value.length;
    charCountEl.textContent = len;
    charCountEl.parentElement.classList.toggle("warn", len >= 450);
  });

  // ── Form validation: enable Ask only when all fields are non-empty ──────
  function validate() {
    const allFilled = ALL_FIELDS.every(
      id => document.getElementById(id).value.trim() !== ""
    );
    // Don't re-enable while a request is in flight
    if (!askBtn.classList.contains("loading")) {
      askBtn.disabled = !allFilled;
    }
  }
  ALL_FIELDS.forEach(id =>
    document.getElementById(id).addEventListener("input", validate)
  );

  // ── Loading state helpers ───────────────────────────────────────────────
  function setLoading(active) {
    askBtn.classList.toggle("loading", active);
    askBtn.disabled = active;
    askBtn.querySelector(".btn-label").textContent = active
      ? "Thinking…"
      : "Ask MotoMate";
  }

  // ── Badge rendering ─────────────────────────────────────────────────────
  const BADGE_CLASS = {
    maintenance:   "badge-maintenance",
    general_info:  "badge-general_info",
    safety_riding: "badge-safety_riding",
    gear:          "badge-gear",
    unsupported:   "badge-unsupported",
  };
  const BADGE_LABEL = {
    maintenance:   "Maintenance",
    general_info:  "General Info",
    safety_riding: "Safety & Riding",
    gear:          "Gear",
    unsupported:   "Unsupported",
  };

  function renderBadge(category) {
    categoryBadge.className =
      "badge " + (BADGE_CLASS[category] || "badge-unsupported");
    categoryBadge.textContent =
      BADGE_LABEL[category] || category;
  }

  // ── Source list rendering ───────────────────────────────────────────────
  function renderSources(sources) {
    sourcesList.innerHTML = "";
    if (!sources || sources.length === 0) {
      hide(sourcesSection);
      return;
    }
    sources.forEach(s => {
      const li = document.createElement("li");
      // Strip .txt for display; keep full name for transparency
      const displayFile = s.file.replace(/\.txt$/, "").replace(/_/g, " ");
      li.innerHTML =
        `<span class="source-file">${escHtml(displayFile)}</span>` +
        `<span class="source-meta">chunk&nbsp;${s.chunk_index}` +
        (s.score ? ` &middot; score&nbsp;${s.score}` : "") +
        `</span>`;
      sourcesList.appendChild(li);
    });
    show(sourcesSection);
  }

  // Minimal HTML escape to avoid injection from corpus filenames
  function escHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── Clear response panel ────────────────────────────────────────────────
  function clearPanel() {
    hide(responsePanel);
    hide(errorBox);
    hide(safetyBox);
    hide(sourcesSection);
    answerText.textContent = "";
    sourcesList.innerHTML  = "";
    categoryBadge.textContent = "";
    categoryBadge.className   = "badge";
    errorBox.textContent   = "";
    safetyBox.textContent  = "";
  }

  // ── Render a successful response ────────────────────────────────────────
  function renderResponse(data) {
    hide(errorBox);
    show(answerSection);

    renderBadge(data.category);
    answerText.textContent = data.answer;

    if (data.safety_warning) {
      safetyBox.textContent = data.safety_warning;
      show(safetyBox);
    } else {
      hide(safetyBox);
    }

    renderSources(data.sources);
    show(responsePanel);
  }

  // ── Render an error ─────────────────────────────────────────────────────
  function renderError(message) {
    hide(answerSection);
    errorBox.textContent = "⚠️ " + message;
    show(errorBox);
    show(responsePanel);
  }

  // ── /api/ask ─────────────────────────────────────────────────────────────
  askBtn.addEventListener("click", async () => {
    const payload = {};
    ALL_FIELDS.forEach(id => {
      payload[id] = document.getElementById(id).value.trim();
    });

    clearPanel();
    setLoading(true);

    try {
      const res  = await fetch("/api/ask", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        renderError(data.error || `Server error (${res.status})`);
      } else {
        renderResponse(data);
      }
    } catch (err) {
      renderError(
        "Could not reach the server. Make sure the app is running. " +
        "(" + err.message + ")"
      );
    } finally {
      setLoading(false);
      validate(); // restore button state based on field values
    }
  });

  // ── /api/corpus ──────────────────────────────────────────────────────────
  corpusBtn.addEventListener("click", async () => {
    const text = corpusTextEl.value.trim();
    if (!text) {
      corpusStatus.textContent = "Please paste some content first.";
      corpusStatus.className   = "corpus-status error";
      return;
    }

    corpusBtn.disabled       = true;
    corpusStatus.textContent = "Uploading…";
    corpusStatus.className   = "corpus-status";

    try {
      const res  = await fetch("/api/corpus", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text }),
      });
      const data = await res.json();

      if (!res.ok) {
        corpusStatus.textContent = "Error: " + (data.error || res.status);
        corpusStatus.className   = "corpus-status error";
      } else {
        corpusStatus.textContent = "✅ " + data.message;
        corpusStatus.className   = "corpus-status success";
        corpusTextEl.value       = "";
      }
    } catch (err) {
      corpusStatus.textContent = "Network error: " + err.message;
      corpusStatus.className   = "corpus-status error";
    } finally {
      corpusBtn.disabled = false;
    }
  });

})();
