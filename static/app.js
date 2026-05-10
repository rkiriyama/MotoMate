// app.js — MotoMate frontend logic

document.addEventListener("DOMContentLoaded", function () {

  // --- Form fields ---
  var year     = document.getElementById("year");
  var make     = document.getElementById("make");
  var model    = document.getElementById("model");
  var mileage  = document.getElementById("mileage");
  var question = document.getElementById("question");
  var askBtn   = document.getElementById("ask-btn");

  // --- Output elements (may be null — we guard every use) ---
  var charCount    = document.getElementById("char-count");
  var debugStatus  = document.getElementById("debug-status");
  var responsePanel = document.getElementById("response-panel");
  var corpusText   = document.getElementById("corpus-text");
  var corpusBtn    = document.getElementById("corpus-btn");
  var corpusStatus = document.getElementById("corpus-status");

  // Bail if any form field or button is missing
  if (!year || !make || !model || !mileage || !question || !askBtn || !responsePanel) {
    console.error("MotoMate: required element(s) missing from page.");
    return;
  }

  // --- Validate ---
  function validate() {
    var ok = year.value.trim() && make.value.trim() &&
             model.value.trim() && mileage.value.trim() &&
             question.value.trim();
    askBtn.disabled = !ok;
    if (debugStatus) {
      debugStatus.textContent =
        "year=" + (year.value.trim()||"?") +
        " make=" + (make.value.trim()||"?") +
        " model=" + (model.value.trim()||"?") +
        " mileage=" + (mileage.value.trim()||"?") +
        " q=" + (question.value.trim() ? "filled" : "?") +
        " | btn=" + (ok ? "ENABLED" : "disabled");
    }
  }

  [year, make, model, mileage, question].forEach(function (f) {
    f.addEventListener("input",  validate);
    f.addEventListener("change", validate);
    f.addEventListener("keyup",  validate);
  });
  setInterval(validate, 500);
  validate();

  // Character counter
  question.addEventListener("input", function () {
    if (charCount) charCount.textContent = question.value.length;
  });

  // --- Loading state ---
  function setLoading(on) {
    askBtn.disabled = on;
    var spinner = askBtn.querySelector(".btn-spinner");
    var label   = askBtn.querySelector(".btn-label");
    if (spinner) spinner.style.display = on ? "inline-block" : "none";
    if (label)   label.textContent     = on ? "Thinking..." : "Ask MotoMate";
  }

  // --- Render result directly into responsePanel via innerHTML ---
  // No sub-element lookups — avoids null-reference crashes entirely.
  var BADGE_COLORS = {
    maintenance:   "#2980b9",
    general_info:  "#27ae60",
    safety_riding: "#8e44ad",
    gear:          "#d35400",
    unsupported:   "#7f8c8d"
  };
  var BADGE_LABELS = {
    maintenance:   "Maintenance",
    general_info:  "General Info",
    safety_riding: "Safety & Riding",
    gear:          "Gear",
    unsupported:   "Unsupported"
  };

  function esc(s) {
    return String(s)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function renderResponse(data) {
    var color = BADGE_COLORS[data.category] || "#7f8c8d";
    var label = BADGE_LABELS[data.category] || esc(data.category);

    var sourcesHtml = "";
    if (data.sources && data.sources.length > 0) {
      var items = data.sources.map(function (s) {
        var name = esc((s.file||"").replace(/\.txt$/i,"").replace(/_/g," "));
        return "<li>" + name + " &mdash; chunk " + s.chunk_index +
               (s.score ? ", score " + s.score : "") + "</li>";
      });
      sourcesHtml =
        '<div style="margin-top:14px;padding-top:12px;border-top:1px solid #f0f0f0">' +
        '<div style="font-size:0.78rem;font-weight:700;text-transform:uppercase;' +
        'color:#aaa;margin-bottom:6px">Sources</div>' +
        '<ul style="list-style:none;padding:0;margin:0;font-size:0.82rem;color:#666">' +
        items.join("") + "</ul></div>";
    }

    var safetyHtml = "";
    if (data.safety_warning) {
      safetyHtml =
        '<div style="margin-top:14px;padding:12px 14px;background:#fffbea;' +
        'border:1px solid #f0c040;border-left:4px solid #f0c040;border-radius:6px;' +
        'font-size:0.92rem;color:#5a4000">' +
        esc(data.safety_warning) + "</div>";
    }

    responsePanel.innerHTML =
      '<span style="display:inline-block;padding:4px 12px;border-radius:20px;' +
      'font-size:0.78rem;font-weight:700;text-transform:uppercase;color:#fff;' +
      'background:' + color + ';margin-bottom:12px">' + label + "</span>" +
      '<div style="font-size:0.97rem;line-height:1.7;white-space:pre-wrap">' +
      esc(data.answer) + "</div>" +
      safetyHtml + sourcesHtml;

    responsePanel.style.display = "";
  }

  function renderError(msg) {
    responsePanel.innerHTML =
      '<div style="padding:12px 14px;background:#fef2f2;border:1px solid #fca5a5;' +
      'border-left:4px solid #ef4444;border-radius:6px;color:#991b1b;font-size:0.92rem">' +
      esc(msg) + "</div>";
    responsePanel.style.display = "";
  }

  // --- Ask ---
  askBtn.addEventListener("click", function () {
    var payload = JSON.stringify({
      year:     year.value.trim(),
      make:     make.value.trim(),
      model:    model.value.trim(),
      mileage:  mileage.value.trim(),
      question: question.value.trim()
    });

    responsePanel.style.display = "none";
    responsePanel.innerHTML = "";
    setLoading(true);

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/ask", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.timeout = 30000;

    xhr.onload = function () {
      setLoading(false);
      validate();

      // Always show the raw server response so we can see what came back
      var rawDiv = document.getElementById("raw-output");
      if (rawDiv) {
        rawDiv.textContent = "HTTP " + xhr.status + "\n\n" + xhr.responseText;
        rawDiv.style.display = "block";
      }
      console.log("MotoMate response status:", xhr.status);
      console.log("MotoMate response body:", xhr.responseText);

      try {
        var data = JSON.parse(xhr.responseText);
        console.log("MotoMate parsed data:", data);
        if (xhr.status >= 200 && xhr.status < 300) {
          renderResponse(data);
        } else {
          renderError("Server error " + xhr.status + ": " + (data.error || "unknown"));
        }
      } catch (e) {
        console.error("MotoMate JSON parse error:", e);
        renderError("Could not parse server response. Check the terminal for Python errors.");
      }
    };

    xhr.onerror = function () {
      setLoading(false); validate();
      renderError("Network error — is python app.py running on port 5000?");
    };

    xhr.ontimeout = function () {
      setLoading(false); validate();
      renderError("Request timed out (30 s). Check your OPENAI_API_KEY and internet connection.");
    };

    xhr.send(payload);
  });

  // --- Corpus ---
  if (corpusBtn && corpusText && corpusStatus) {
    corpusBtn.addEventListener("click", function () {
      var text = corpusText.value.trim();
      if (!text) { corpusStatus.textContent = "Please paste some content first."; return; }
      corpusBtn.disabled = true;
      corpusStatus.textContent = "Uploading...";

      var xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/corpus", true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.timeout = 15000;

      xhr.onload = function () {
        corpusBtn.disabled = false;
        try {
          var data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            corpusStatus.textContent = "Done: " + data.message;
            corpusText.value = "";
          } else {
            corpusStatus.textContent = "Error: " + (data.error || xhr.status);
          }
        } catch (e) {
          corpusStatus.textContent = "Bad server response.";
        }
      };
      xhr.onerror   = function () { corpusBtn.disabled = false; corpusStatus.textContent = "Network error."; };
      xhr.ontimeout = function () { corpusBtn.disabled = false; corpusStatus.textContent = "Timed out."; };
      xhr.send(JSON.stringify({ text: text }));
    });
  }

}); // end DOMContentLoaded
