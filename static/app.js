// app.js — MotoMate frontend logic
// Phase 5 (full implementation) is pending.
// This stub wires up form validation and the /api/ask + /api/corpus fetches
// so the backend can be tested end-to-end from a browser today.

(function () {
  "use strict";

  const fields   = ["year", "make", "model", "mileage", "question"];
  const askBtn   = document.getElementById("ask-btn");
  const spinner  = document.getElementById("spinner");
  const panel    = document.getElementById("response-panel");

  // ── Form validation: enable Ask button only when all fields are filled ──
  function validate() {
    const allFilled = fields.every(id => document.getElementById(id).value.trim() !== "");
    askBtn.disabled = !allFilled;
  }
  fields.forEach(id => document.getElementById(id).addEventListener("input", validate));

  // ── Helper: show/hide elements ──
  function show(el) { el.style.display = ""; }
  function hide(el) { el.style.display = "none"; }
  function setText(el, text) { el.textContent = text; }

  // ── Category badge ──
  const BADGE_CLASSES = {
    maintenance:   "badge-maintenance",
    general_info:  "badge-general_info",
    safety_riding: "badge-safety_riding",
    gear:          "badge-gear",
    unsupported:   "badge-unsupported",
  };
  function renderBadge(category) {
    const badge = document.getElementById("category-badge");
    badge.className = "badge " + (BADGE_CLASSES[category] || "badge-unsupported");
    badge.textContent = category.replace("_", " ");
  }

  // ── Render a successful /api/ask response ──
  function renderResponse(data) {
    hide(document.getElementById("error-box"));

    renderBadge(data.category);
    setText(document.getElementById("answer-text"), data.answer);

    const safetyBox = document.getElementById("safety-warning");
    if (data.safety_warning) {
      setText(safetyBox, data.safety_warning);
      show(safetyBox);
    } else {
      hide(safetyBox);
    }

    const sourcesDiv = document.getElementById("sources");
    if (data.sources && data.sources.length > 0) {
      const lines = data.sources.map(s =>
        `📄 ${s.file} (chunk ${s.chunk_index}, score ${s.score})`
      );
      setText(sourcesDiv, "Sources: " + lines.join(" · "));
    } else {
      setText(sourcesDiv, "");
    }

    show(panel);
  }

  // ── Render an error ──
  function renderError(message) {
    const errorBox = document.getElementById("error-box");
    setText(errorBox, "⚠️ " + message);
    show(errorBox);
    show(panel);
  }

  // ── /api/ask submission ──
  askBtn.addEventListener("click", async () => {
    const payload = {};
    fields.forEach(id => { payload[id] = document.getElementById(id).value.trim(); });

    askBtn.disabled = true;
    show(spinner);
    hide(panel);

    try {
      const res = await fetch("/api/ask", {
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
      renderError("Network error — is the server running? " + err.message);
    } finally {
      hide(spinner);
      validate(); // re-enable button if fields still filled
    }
  });

  // ── /api/corpus submission ──
  const corpusBtn    = document.getElementById("corpus-btn");
  const corpusStatus = document.getElementById("corpus-status");

  corpusBtn.addEventListener("click", async () => {
    const text = document.getElementById("corpus-text").value.trim();
    if (!text) {
      corpusStatus.textContent = "Please paste some content first.";
      return;
    }
    corpusBtn.disabled = true;
    corpusStatus.textContent = "Uploading…";
    try {
      const res = await fetch("/api/corpus", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        corpusStatus.textContent = "Error: " + (data.error || res.status);
      } else {
        corpusStatus.textContent = "✅ " + data.message;
        document.getElementById("corpus-text").value = "";
      }
    } catch (err) {
      corpusStatus.textContent = "Network error: " + err.message;
    } finally {
      corpusBtn.disabled = false;
    }
  });
})();
