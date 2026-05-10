// app.js — MotoMate frontend logic

(function () {
  "use strict";

  // ── Grab every element app.js needs. ────────────────────────────────────
  // If any are null the page structure is wrong; log clearly and stop.
  var ids = [
    "year", "make", "model", "mileage", "question",
    "char-count", "ask-btn",
    "response-panel", "error-box", "answer-section",
    "category-badge", "answer-text", "safety-warning",
    "sources-section", "sources-list",
    "corpus-text", "corpus-btn", "corpus-status"
  ];

  var el = {};
  var broken = false;
  ids.forEach(function (id) {
    el[id] = document.getElementById(id);
    if (!el[id]) {
      console.error("MotoMate: missing element #" + id);
      broken = true;
    }
  });
  if (broken) {
    console.error("MotoMate: page is missing required elements. JS will not run.");
    return;
  }

  var askBtn    = el["ask-btn"];
  var allFields = ["year", "make", "model", "mileage", "question"];

  // ── Utility ──────────────────────────────────────────────────────────────
  function show(e) { e.style.display = ""; }
  function hide(e) { e.style.display = "none"; }

  function escHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── Form validation ───────────────────────────────────────────────────────
  // Runs on every keystroke or change; enables the button only when all
  // five fields are non-empty AND no request is in flight.
  function validate() {
    if (askBtn.dataset.loading === "1") return;
    var allFilled = allFields.every(function (id) {
      return el[id].value.trim() !== "";
    });
    askBtn.disabled = !allFilled;
  }

  // Listen on both input (typing) and change (autofill / paste)
  allFields.forEach(function (id) {
    el[id].addEventListener("input",  validate);
    el[id].addEventListener("change", validate);
  });

  // ── Character counter ─────────────────────────────────────────────────────
  el["question"].addEventListener("input", function () {
    var len = el["question"].value.length;
    el["char-count"].textContent = len;
    el["char-count"].parentElement.classList.toggle("warn", len >= 450);
  });

  // ── Loading state ─────────────────────────────────────────────────────────
  function setLoading(active) {
    askBtn.dataset.loading = active ? "1" : "0";
    askBtn.disabled        = active;

    var spinner = askBtn.querySelector(".btn-spinner");
    var label   = askBtn.querySelector(".btn-label");

    if (spinner) spinner.style.display = active ? "block" : "";
    if (label)   label.textContent     = active ? "Thinking\u2026" : "Ask MotoMate";
  }

  // ── Badge ─────────────────────────────────────────────────────────────────
  var BADGE_CLASS = {
    maintenance:   "badge-maintenance",
    general_info:  "badge-general_info",
    safety_riding: "badge-safety_riding",
    gear:          "badge-gear",
    unsupported:   "badge-unsupported"
  };
  var BADGE_LABEL = {
    maintenance:   "Maintenance",
    general_info:  "General Info",
    safety_riding: "Safety & Riding",
    gear:          "Gear",
    unsupported:   "Unsupported"
  };

  function renderBadge(category) {
    el["category-badge"].className =
      "badge " + (BADGE_CLASS[category] || "badge-unsupported");
    el["category-badge"].textContent =
      BADGE_LABEL[category] || category;
  }

  // ── Sources ───────────────────────────────────────────────────────────────
  function renderSources(sources) {
    el["sources-list"].innerHTML = "";
    if (!sources || sources.length === 0) {
      hide(el["sources-section"]);
      return;
    }
    sources.forEach(function (s) {
      var li   = document.createElement("li");
      var name = s.file.replace(/\.txt$/i, "").replace(/_/g, " ");
      li.innerHTML =
        '<span class="source-file">' + escHtml(name) + "</span>" +
        '<span class="source-meta"> chunk&nbsp;' + s.chunk_index +
        (s.score ? " &middot; score&nbsp;" + s.score : "") +
        "</span>";
      el["sources-list"].appendChild(li);
    });
    show(el["sources-section"]);
  }

  // ── Clear panel ───────────────────────────────────────────────────────────
  function clearPanel() {
    hide(el["response-panel"]);
    hide(el["error-box"]);
    hide(el["safety-warning"]);
    hide(el["sources-section"]);
    el["answer-text"].textContent       = "";
    el["sources-list"].innerHTML        = "";
    el["category-badge"].textContent    = "";
    el["category-badge"].className      = "badge";
    el["error-box"].textContent         = "";
    el["safety-warning"].textContent    = "";
  }

  // ── Render success ────────────────────────────────────────────────────────
  function renderResponse(data) {
    hide(el["error-box"]);
    show(el["answer-section"]);
    renderBadge(data.category);
    el["answer-text"].textContent = data.answer;

    if (data.safety_warning) {
      el["safety-warning"].textContent = data.safety_warning;
      show(el["safety-warning"]);
    } else {
      hide(el["safety-warning"]);
    }

    renderSources(data.sources);
    show(el["response-panel"]);
  }

  // ── Render error ──────────────────────────────────────────────────────────
  function renderError(msg) {
    hide(el["answer-section"]);
    el["error-box"].textContent = "\u26A0\uFE0F " + msg;
    show(el["error-box"]);
    show(el["response-panel"]);
  }

  // ── Ask button ────────────────────────────────────────────────────────────
  askBtn.addEventListener("click", function () {
    var payload = {};
    allFields.forEach(function (id) {
      payload[id] = el[id].value.trim();
    });

    clearPanel();
    setLoading(true);

    fetch("/api/ask", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload)
    })
    .then(function (res) {
      return res.json().then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      });
    })
    .then(function (r) {
      if (!r.ok) {
        renderError(r.data.error || ("Server error (" + r.status + ")"));
      } else {
        renderResponse(r.data);
      }
    })
    .catch(function (err) {
      renderError(
        "Could not reach the server. Is it running? (" + err.message + ")"
      );
    })
    .finally(function () {
      setLoading(false);
      validate();
    });
  });

  // ── Corpus button ─────────────────────────────────────────────────────────
  el["corpus-btn"].addEventListener("click", function () {
    var text = el["corpus-text"].value.trim();
    if (!text) {
      el["corpus-status"].textContent = "Please paste some content first.";
      el["corpus-status"].className   = "corpus-status error";
      return;
    }

    el["corpus-btn"].disabled        = true;
    el["corpus-status"].textContent  = "Uploading\u2026";
    el["corpus-status"].className    = "corpus-status";

    fetch("/api/corpus", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text: text })
    })
    .then(function (res) {
      return res.json().then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      });
    })
    .then(function (r) {
      if (!r.ok) {
        el["corpus-status"].textContent = "Error: " + (r.data.error || r.status);
        el["corpus-status"].className   = "corpus-status error";
      } else {
        el["corpus-status"].textContent = "\u2705 " + r.data.message;
        el["corpus-status"].className   = "corpus-status success";
        el["corpus-text"].value         = "";
      }
    })
    .catch(function (err) {
      el["corpus-status"].textContent = "Network error: " + err.message;
      el["corpus-status"].className   = "corpus-status error";
    })
    .finally(function () {
      el["corpus-btn"].disabled = false;
    });
  });

  // ── Run validate once on load so state is correct ─────────────────────────
  validate();

})();
