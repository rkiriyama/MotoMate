// app.js — MotoMate frontend logic

document.addEventListener("DOMContentLoaded", function () {

  // --- Get every element by ID ---
  var year        = document.getElementById("year");
  var make        = document.getElementById("make");
  var model       = document.getElementById("model");
  var mileage     = document.getElementById("mileage");
  var question    = document.getElementById("question");
  var askBtn      = document.getElementById("ask-btn");
  var charCount   = document.getElementById("char-count");
  var debugStatus = document.getElementById("debug-status");

  var responsePanel  = document.getElementById("response-panel");
  var errorBox       = document.getElementById("error-box");
  var answerSection  = document.getElementById("answer-section");
  var categoryBadge  = document.getElementById("category-badge");
  var answerText     = document.getElementById("answer-text");
  var safetyWarning  = document.getElementById("safety-warning");
  var sourcesSection = document.getElementById("sources-section");
  var sourcesList    = document.getElementById("sources-list");

  var corpusText   = document.getElementById("corpus-text");
  var corpusBtn    = document.getElementById("corpus-btn");
  var corpusStatus = document.getElementById("corpus-status");

  // Bail out clearly if any critical element is missing
  var required = {year:year, make:make, model:model, mileage:mileage,
                  question:question, "ask-btn":askBtn};
  for (var k in required) {
    if (!required[k]) {
      console.error("MotoMate: missing #" + k);
      return;
    }
  }

  // --- Helpers ---
  function show(el) { el.style.display = ""; }
  function hide(el) { el.style.display = "none"; }

  // --- Validate: enable button when all 5 fields are filled ---
  function validate() {
    var y  = year.value.trim();
    var mk = make.value.trim();
    var mo = model.value.trim();
    var mi = mileage.value.trim();
    var q  = question.value.trim();
    var ok = (y !== "" && mk !== "" && mo !== "" && mi !== "" && q !== "");
    askBtn.disabled = !ok;
    if (debugStatus) {
      debugStatus.textContent =
        "Fields: year=" + (y||"empty") + " make=" + (mk||"empty") +
        " model=" + (mo||"empty") + " mileage=" + (mi||"empty") +
        " question=" + (q ? "filled" : "empty") +
        " => button " + (ok ? "ENABLED" : "disabled");
    }
  }

  // Listen on input, change, AND keyup to catch typing, paste, and autofill
  [year, make, model, mileage, question].forEach(function (field) {
    field.addEventListener("input",  validate);
    field.addEventListener("change", validate);
    field.addEventListener("keyup",  validate);
  });

  // Poll every 500ms as a final fallback for autofill that fires no events
  setInterval(validate, 500);

  // Character counter
  question.addEventListener("input", function () {
    if (charCount) charCount.textContent = question.value.length;
  });

  // --- Loading state ---
  function setLoading(on) {
    askBtn.disabled = on;
    var spinner = document.querySelector("#ask-btn .btn-spinner");
    var label   = document.querySelector("#ask-btn .btn-label");
    if (spinner) spinner.style.display = on ? "inline-block" : "none";
    if (label)   label.textContent     = on ? "Thinking..." : "Ask MotoMate";
  }

  // --- Badge ---
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

  // --- Show response ---
  function showResponse(data) {
    hide(errorBox);
    show(answerSection);

    categoryBadge.className   = "badge " + (BADGE_CLASS[data.category] || "badge-unsupported");
    categoryBadge.textContent = BADGE_LABEL[data.category]  || data.category;
    answerText.textContent    = data.answer;

    if (data.safety_warning) {
      safetyWarning.textContent = data.safety_warning;
      show(safetyWarning);
    } else {
      hide(safetyWarning);
    }

    sourcesList.innerHTML = "";
    if (data.sources && data.sources.length > 0) {
      data.sources.forEach(function (s) {
        var li   = document.createElement("li");
        var name = (s.file || "").replace(/\.txt$/i, "").replace(/_/g, " ");
        li.textContent = name + " (chunk " + s.chunk_index + ", score " + s.score + ")";
        sourcesList.appendChild(li);
      });
      show(sourcesSection);
    } else {
      hide(sourcesSection);
    }

    show(responsePanel);
  }

  // --- Show error ---
  function showError(msg) {
    hide(answerSection);
    errorBox.textContent = msg;
    show(errorBox);
    show(responsePanel);
  }

  // --- Ask button: use plain XMLHttpRequest (no fetch, no async/await) ---
  askBtn.addEventListener("click", function () {
    var payload = JSON.stringify({
      year:     year.value.trim(),
      make:     make.value.trim(),
      model:    model.value.trim(),
      mileage:  mileage.value.trim(),
      question: question.value.trim()
    });

    hide(responsePanel);
    setLoading(true);

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/ask");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.timeout = 30000;

    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      setLoading(false);
      validate();
      if (xhr.status === 0) {
        showError("Could not reach the server. Is python app.py running?");
        return;
      }
      try {
        var data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          showResponse(data);
        } else {
          showError("Error " + xhr.status + ": " + (data.error || "Unknown error"));
        }
      } catch (e) {
        showError("Bad response from server. Check the terminal for Python errors.");
      }
    };

    xhr.ontimeout = function () {
      setLoading(false);
      validate();
      showError("Request timed out (30s). Check your OPENAI_API_KEY and internet connection.");
    };

    xhr.send(payload);
  });

  // --- Corpus submit ---
  if (corpusBtn && corpusText && corpusStatus) {
    corpusBtn.addEventListener("click", function () {
      var text = corpusText.value.trim();
      if (!text) {
        corpusStatus.textContent = "Please paste some content first.";
        return;
      }
      corpusBtn.disabled       = true;
      corpusStatus.textContent = "Uploading...";

      var xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/corpus");
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.timeout = 15000;

      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
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

      xhr.send(JSON.stringify({ text: text }));
    });
  }

  // Run once on load
  validate();

}); // end DOMContentLoaded
