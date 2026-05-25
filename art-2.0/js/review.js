// Mushy the Artist 2.0 — review mode (spaced repetition over completed sessions)
(function () {
  "use strict";

  const STORAGE_PREFIX = "mushy:session:";
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const root = document.getElementById("review-root");
  const quizSection = document.getElementById("quiz");
  const quizHeading = document.getElementById("quiz-heading");
  const quizContainer = document.getElementById("quiz-questions");
  const resultBox = document.getElementById("quiz-result");
  const scoreNum = document.getElementById("score-num");
  const scoreTotal = document.getElementById("score-total");
  const scoreMsg = document.getElementById("score-msg");

  if (!root || !quizSection) return;

  // Find sessions the user has completed
  const completedIds = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(STORAGE_PREFIX)) continue;
      try {
        const data = JSON.parse(localStorage.getItem(k));
        if (data && data.completed) {
          completedIds.push(k.slice(STORAGE_PREFIX.length));
        }
      } catch (_) {}
    }
  } catch (_) {}

  if (completedIds.length === 0) {
    root.innerHTML = `
      <div class="review-empty">
        <p>You haven't completed any sessions yet. Finish a session test, then come back here for a randomised refresher.</p>
        <a class="btn btn-primary" href="index.html#sessiyalar">Browse sessions</a>
      </div>
    `;
    return;
  }

  // Show stats and start button
  let avgScore = 0;
  try {
    let sum = 0, cnt = 0;
    completedIds.forEach((id) => {
      try {
        const d = JSON.parse(localStorage.getItem(STORAGE_PREFIX + id));
        if (d && d.score != null && d.total) {
          sum += (d.score / d.total) * 100;
          cnt++;
        }
      } catch (_) {}
    });
    avgScore = cnt ? Math.round(sum / cnt) : 0;
  } catch (_) {}

  root.innerHTML = `
    <div class="review-stats">
      <div class="stat">
        <span class="stat-num">${completedIds.length}</span>
        <span class="stat-label">Sessions completed</span>
      </div>
      <div class="stat">
        <span class="stat-num">${avgScore}%</span>
        <span class="stat-label">Average score</span>
      </div>
    </div>
    <button type="button" class="btn btn-primary" id="start-review">Start a 10-question review</button>
  `;

  document.getElementById("start-review").addEventListener("click", () => {
    startReview(completedIds);
  });

  function startReview(ids) {
    Promise.all(ids.map((id) =>
      fetch(`data/sessions/${encodeURIComponent(id)}.json`, { cache: "no-cache" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    ))
      .then((sessions) => {
        // collect all questions tagged with their session
        const pool = [];
        sessions.forEach((s) => {
          if (!s || !Array.isArray(s.quiz)) return;
          s.quiz.forEach((q) => pool.push({ q, session_title: s.title, session_id: s.id }));
        });
        if (pool.length === 0) {
          root.innerHTML = `<p class="review-empty">No questions available — please try again.</p>`;
          return;
        }
        // pick up to 10 random
        const picked = shuffle(pool).slice(0, Math.min(10, pool.length));
        renderReviewQuiz(picked);
      });
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function renderReviewQuiz(picked) {
    // Hide the start UI, show the quiz
    root.style.display = "none";
    quizSection.hidden = false;
    quizHeading.textContent = `Review (${picked.length} questions)`;
    scoreTotal.textContent = picked.length;

    let answered = 0, correct = 0;
    quizContainer.innerHTML = "";

    picked.forEach((item, qi) => {
      const q = item.q;
      const qEl = document.createElement("div");
      qEl.className = "q";
      qEl.innerHTML = `
        <div class="q-num">Question ${qi + 1} <span style="color:var(--muted);font-style:normal">· from “${escapeHtml(item.session_title)}”</span></div>
        <div class="q-text">${inline(q.question)}</div>
        <div class="options"></div>
        <div class="explain">${inline(q.explanation || "")}</div>
      `;
      const opts = qEl.querySelector(".options");
      q.options.forEach((opt, oi) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "opt";
        btn.textContent = opt;
        btn.addEventListener("click", () => handleAnswer(qEl, opts, oi, q.correct));
        opts.appendChild(btn);
      });
      quizContainer.appendChild(qEl);
    });

    function handleAnswer(qEl, opts, chosen, correctIdx) {
      if (qEl.classList.contains("answered")) return;
      qEl.classList.add("answered");
      answered++;
      const buttons = opts.querySelectorAll(".opt");
      buttons.forEach((b, i) => {
        b.classList.add("disabled");
        if (i === correctIdx) b.classList.add("correct");
        if (i === chosen && chosen !== correctIdx) b.classList.add("wrong");
      });
      if (chosen === correctIdx) correct++;
      if (answered === picked.length) {
        scoreNum.textContent = correct;
        scoreMsg.textContent = praise(correct, picked.length);
        resultBox.classList.add("show");
        resultBox.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    quizSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function praise(c, total) {
    const pct = c / total;
    if (pct === 1) return "Flawless. Everything from those sessions has stuck.";
    if (pct >= 0.8) return "Strong recall. Glance at the few you missed and you're set.";
    if (pct >= 0.6) return "Solid. The harder questions are still settling in.";
    if (pct >= 0.4) return "Time to revisit a session or two — start from the micro-elements.";
    return "Re-read the sessions and come back. Forgetting is part of learning.";
  }

  function inline(text) {
    if (text == null) return "";
    let t = escapeHtml(text);
    const boldStore = [];
    t = t.replace(/\*\*([\s\S]+?)\*\*/g, (_, inner) => {
      const i = boldStore.push(inner) - 1;
      return "@@BOLD" + i + "@@";
    });
    t = t.replace(/(^|[^*])\*([^*\s](?:[\s\S]*?[^*\s])?)\*(?!\*)/g, "$1<em>$2</em>");
    t = t.replace(/@@BOLD(\d+)@@/g, (_, i) => "<strong>" + boldStore[Number(i)] + "</strong>");
    return t;
  }
  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
})();
