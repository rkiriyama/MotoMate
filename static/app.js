// app.js — MotoMate frontend logic

document.addEventListener("DOMContentLoaded", function () {

  // --- Elements ---
  var year          = document.getElementById("year");
  var make          = document.getElementById("make");
  var model         = document.getElementById("model");
  var mileage       = document.getElementById("mileage");
  var question      = document.getElementById("question");
  var askBtn        = document.getElementById("ask-btn");
  var charCount     = document.getElementById("char-count");
  var responsePanel = document.getElementById("response-panel");
  var corpusText    = document.getElementById("corpus-text");
  var corpusBtn     = document.getElementById("corpus-btn");
  var corpusStatus  = document.getElementById("corpus-status");

  if (!year || !make || !model || !mileage || !question || !askBtn || !responsePanel) {
    console.error("MotoMate: a required element is missing from the page.");
    return;
  }

  // --- Form validation: enable button only when all 5 fields are filled ---
  function validate() {
    var ok = year.value.trim() && make.value.trim() &&
             model.value.trim() && mileage.value.trim() &&
             question.value.trim();
    askBtn.disabled = !ok;
  }

  [year, make, model, mileage, question].forEach(function (f) {
    f.addEventListener("input",  validate);
    f.addEventListener("change", validate);
    f.addEventListener("keyup",  validate);
  });
  validate();

  // --- Character counter ---
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

  // --- HTML escape helper ---
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // --- Badge colours and labels ---
  var BADGE_COLOR = {
    maintenance:   "#2980b9",
    general_info:  "#27ae60",
    safety_riding: "#8e44ad",
    gear:          "#d35400",
    unsupported:   "#7f8c8d"
  };
  var BADGE_LABEL = {
    maintenance:   "Maintenance",
    general_info:  "General Info",
    safety_riding: "Safety & Riding",
    gear:          "Gear",
    unsupported:   "Unsupported"
  };

  // --- Render a successful response into the panel ---
  function renderResponse(data) {
    var color = BADGE_COLOR[data.category] || "#7f8c8d";
    var label = BADGE_LABEL[data.category] || esc(data.category);

    // Sources block
    var sourcesHtml = "";
    if (data.sources && data.sources.length > 0) {
      var items = data.sources.map(function (s) {
        var name = esc((s.file || "").replace(/\.txt$/i, "").replace(/_/g, " "));
        return "<li>" + name +
               " &mdash; chunk&nbsp;" + s.chunk_index +
               (s.score ? ",&nbsp;score&nbsp;" + s.score : "") +
               "</li>";
      });
      sourcesHtml =
        "<div class='resp-sources'>" +
        "<div class='resp-sources-label'>Sources</div>" +
        "<ul>" + items.join("") + "</ul>" +
        "</div>";
    }

    // Safety warning block
    var safetyHtml = data.safety_warning
      ? "<div class='resp-safety'>" + esc(data.safety_warning) + "</div>"
      : "";

    responsePanel.innerHTML =
      "<span class='resp-badge' style='background:" + color + "'>" + label + "</span>" +
      "<div class='resp-answer'>" + esc(data.answer) + "</div>" +
      safetyHtml +
      sourcesHtml;

    responsePanel.style.display = "block";
  }

  // --- Render an error into the panel ---
  function renderError(msg) {
    responsePanel.innerHTML =
      "<div class='resp-error'>" + esc(msg) + "</div>";
    responsePanel.style.display = "block";
  }

  // --- Ask button ---
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
      try {
        var data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          renderResponse(data);
        } else {
          renderError("Server error " + xhr.status + ": " + (data.error || "unknown"));
        }
      } catch (e) {
        renderError("Could not parse server response. Check the terminal for errors.");
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

  // --- Corpus submit ---
  if (corpusBtn && corpusText && corpusStatus) {
    corpusBtn.addEventListener("click", function () {
      var text = corpusText.value.trim();
      if (!text) {
        corpusStatus.textContent = "Please paste some content first.";
        corpusStatus.className = "corpus-status error";
        return;
      }
      corpusBtn.disabled = true;
      corpusStatus.textContent = "Uploading...";
      corpusStatus.className = "corpus-status";

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
            corpusStatus.className = "corpus-status success";
            corpusText.value = "";
          } else {
            corpusStatus.textContent = "Error: " + (data.error || xhr.status);
            corpusStatus.className = "corpus-status error";
          }
        } catch (e) {
          corpusStatus.textContent = "Bad server response.";
          corpusStatus.className = "corpus-status error";
        }
      };

      xhr.onerror = function () {
        corpusBtn.disabled = false;
        corpusStatus.textContent = "Network error.";
        corpusStatus.className = "corpus-status error";
      };

      xhr.ontimeout = function () {
        corpusBtn.disabled = false;
        corpusStatus.textContent = "Timed out.";
        corpusStatus.className = "corpus-status error";
      };

      xhr.send(JSON.stringify({ text: text }));
    });
  }

}); // end DOMContentLoaded
