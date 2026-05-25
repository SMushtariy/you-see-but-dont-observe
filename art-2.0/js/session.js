// Mushy the Artist 2.0 — session page renderer, glossary, lightbox, hotspots, quiz
(function () {
  "use strict";

  const STORAGE_PREFIX = "mushy:session:";

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const root = document.getElementById("session-root");
  if (!root) return;

  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  if (!id) {
    root.innerHTML = `<div class="container"><p class="loading">No session ID. <a href="index.html">Back to home</a>.</p></div>`;
    return;
  }

  Promise.all([
    fetch(`data/sessions/${encodeURIComponent(id)}.json`, { cache: "no-cache" }).then((r) => {
      if (!r.ok) throw new Error("Session not found: HTTP " + r.status);
      return r.json();
    }),
    fetch("data/index.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : { sessions: [] })),
  ])
    .then(([session, catalog]) => {
      document.title = `${session.title} — You see, but don't observe`;
      saveLastVisited(session.id);
      renderSession(session, catalog);
      initLightbox();
      initQuizGate();
      initGlossaryAnchors();
      initShare();
      initReadingProgress();
      initHotspots(session);
      initGlossaryToggle();
    })
    .catch((err) => {
      console.error(err);
      root.innerHTML = `<div class="container"><p class="loading">Failed to load session. Open the site through a local server (e.g. <code>python -m http.server</code>).<br/><small>${escapeHtml(err.message)}</small></p></div>`;
    });

  function renderSession(s, catalog) {
    const num = String(s.number).padStart(2, "0");
    const eraSub = s.era && s.era.label_en ? s.era.label_en : "";

    const progressHTML = `<div class="read-progress" id="read-progress"></div>`;

    const heroHTML = `
      <section class="session-hero">
        <div class="container">
          <p class="session-eyebrow">Session ${num}${eraSub ? " · " + escapeHtml(eraSub) : ""}</p>
          <h1>${escapeHtml(s.title)}</h1>
          <div class="session-meta">
            <span>${escapeHtml(s.reading_time || "~10 min read")}</span>
            <span>4 parts and a 10-question test</span>
          </div>
        </div>
      </section>
    `;

    const eraHTML = renderPart(1, s.era.heading || "Era", eraSub, `
      <div class="prose">${paragraphs(s.era.body)}</div>
      ${s.era.pull_quote ? `<blockquote class="pull">${inline(s.era.pull_quote)}</blockquote>` : ""}
      ${s.era.figure ? renderFigure(s.era.figure) : ""}
    `);

    const genreHTML = renderPart(2, s.genre.heading || "Genre", s.genre.name_en || "", `
      <div class="prose">${paragraphs(s.genre.body)}</div>
      ${(s.genre.gallery && s.genre.gallery.length)
        ? `<div class="gallery">${s.genre.gallery.map(renderFigure).join("")}</div>`
        : ""}
      ${s.genre.outro ? `<div class="prose">${paragraphs(s.genre.outro)}</div>` : ""}
    `);

    const elemsHTML = renderPart(3, s.elements.heading || "Five micro-elements", s.elements.label_en || "Visual alphabet", `
      <div class="prose"><p>${inline(s.elements.intro || "")}</p></div>
      <div class="elements">
        ${s.elements.items.map((el, i) => `
          <article class="element">
            <span class="elem-num">${i + 1}</span>
            <h3>${escapeHtml(el.name)} ${el.name_en && el.name_en !== el.name ? `<em>(${escapeHtml(el.name_en)})</em>` : ""}</h3>
            <p class="elem-meaning">${inline(el.meaning)}</p>
            <div class="prose">${paragraphs(el.body)}</div>
            ${el.figure ? renderFigure(el.figure) : ""}
          </article>
        `).join("")}
      </div>
    `);

    const m = s.masterpiece;
    const hasHotspots = Array.isArray(m.hotspots) && m.hotspots.length > 0;
    const masterFigure = renderMasterpieceFigure(m.figure, m.hotspots);
    const masterHTML = renderPart(4, m.heading || "Masterpiece deep dive", m.artist + " · " + m.year, `
      <div class="masterpiece">
        ${masterFigure}
        ${hasHotspots ? `<p class="hotspot-hint">Tap the numbered marks on the painting to read short notes about each detail.</p>` : ""}
        <div class="prose">${paragraphs(m.intro)}</div>
        <div class="masterpiece-section">
          <h3>${escapeHtml(m.label_first_impression || "First impression")}</h3>
          <p>${inline(m.first_impression)}</p>
        </div>
        <div class="masterpiece-section">
          <h3>${escapeHtml(m.label_hidden_narrative || "The hidden story")}</h3>
          <p>${inline(m.hidden_narrative)}</p>
        </div>
        <div class="masterpiece-section">
          <h3>${escapeHtml(m.label_technical_magic || "Technical magic")}</h3>
          <p>${inline(m.technical_magic)}</p>
        </div>
        <div class="masterpiece-section">
          <h3>${escapeHtml(m.label_so_what || "Why it still matters")}</h3>
          <p>${inline(m.so_what)}</p>
        </div>
      </div>
    `);

    const glossaryHTML = renderGlossary(s.glossary);

    const quizGateHTML = `
      <section class="quiz-gate" id="quiz-gate">
        <h2>${escapeHtml(s.quiz_gate_title || "How well did today's journey land?")}</h2>
        <p>${escapeHtml(s.quiz_gate_text || "Ten quick questions to lock it in. No grading — just a way to see what stuck.")}</p>
        <button type="button" class="btn btn-primary" id="start-quiz-btn">${escapeHtml(s.quiz_gate_button || "Start the test")}</button>
      </section>
    `;

    const quizHTML = `
      <section class="quiz" id="quiz" hidden>
        <h2>Mini-test (${s.quiz.length} questions)</h2>
        <p class="quiz-lede">After each answer you'll see a short explanation.</p>
        <div id="quiz-questions"></div>
        <div class="quiz-result" id="quiz-result">
          <p class="score"><span id="score-num">0</span> / ${s.quiz.length}</p>
          <p id="score-msg"></p>
          <a href="#" class="btn btn-ghost" id="retry-btn">Try again</a>
        </div>
      </section>
    `;

    const shareHTML = `
      <section class="share-block" id="share-block">
        <div class="share-text">Enjoyed this? Share the link with someone who needs a museum companion.</div>
        <div class="share-buttons">
          <button type="button" class="share-btn" data-share="copy">Copy link</button>
          <a class="share-btn" data-share="twitter" target="_blank" rel="noopener">Share on X</a>
          <a class="share-btn" data-share="telegram" target="_blank" rel="noopener">Telegram</a>
        </div>
      </section>
    `;

    const nextHTML = renderNextUp(s, catalog);

    root.innerHTML = `
      ${progressHTML}
      ${heroHTML}
      <div class="container">
        ${eraHTML}
        ${genreHTML}
        ${elemsHTML}
        ${masterHTML}
        ${glossaryHTML}
        ${quizGateHTML}
        ${quizHTML}
        ${shareHTML}
        ${nextHTML}
      </div>
    `;

    initQuiz(s);
  }

  function renderPart(num, title, sub, innerHTML) {
    return `
      <section class="part">
        <header class="part-header">
          <span class="part-num">${String(num).padStart(2, "0")}</span>
          <h2>${escapeHtml(title)}</h2>
          ${sub ? `<span class="part-sub">${escapeHtml(sub)}</span>` : ""}
        </header>
        ${innerHTML}
      </section>
    `;
  }

  function renderFigure(f) {
    if (!f || !f.src) return "";
    const cap = [
      f.artist ? `<strong>${escapeHtml(f.artist)}</strong>` : "",
      f.title ? `<em>${escapeHtml(f.title)}</em>` : "",
      f.year ? escapeHtml(f.year) : "",
      f.location ? escapeHtml(f.location) : "",
    ].filter(Boolean).join(", ");
    const note = f.note ? `<br/>${inline(f.note)}` : "";
    const alt = escapeHtml(f.alt || f.title || "");
    const captionData = encodeURIComponent(`${f.artist || ""} — ${f.title || ""} (${f.year || ""})`);
    return `
      <figure class="art">
        <img src="${f.src}" alt="${alt}" loading="lazy" data-caption="${captionData}" />
        <figcaption>${cap}${note}</figcaption>
      </figure>
    `;
  }

  function renderMasterpieceFigure(f, hotspots) {
    if (!f || !f.src) return "";
    const cap = [
      f.artist ? `<strong>${escapeHtml(f.artist)}</strong>` : "",
      f.title ? `<em>${escapeHtml(f.title)}</em>` : "",
      f.year ? escapeHtml(f.year) : "",
      f.location ? escapeHtml(f.location) : "",
    ].filter(Boolean).join(", ");
    const note = f.note ? `<br/>${inline(f.note)}` : "";
    const alt = escapeHtml(f.alt || f.title || "");
    const captionData = encodeURIComponent(`${f.artist || ""} — ${f.title || ""} (${f.year || ""})`);
    const pins = (hotspots || []).map((h, i) => `
      <button type="button" class="hotspot" data-hs-idx="${i}" style="left:${(h.x * 100).toFixed(2)}%;top:${(h.y * 100).toFixed(2)}%" aria-label="${escapeHtml(h.label || ('Hotspot ' + (i+1)))}">${i + 1}</button>
    `).join("");
    return `
      <figure class="art">
        <div class="has-hotspots" id="masterpiece-canvas">
          <img src="${f.src}" alt="${alt}" loading="lazy" data-caption="${captionData}" />
          ${pins}
        </div>
        <figcaption>${cap}${note}</figcaption>
      </figure>
    `;
  }

  function renderGlossary(items) {
    if (!Array.isArray(items) || !items.length) return "";
    const entries = items.map((it) => {
      const slug = slugify(it.term);
      return `
        <dt id="g-${slug}">${escapeHtml(it.term)}${it.term_en && it.term_en !== it.term ? ` <em style="color:var(--muted);font-weight:400;font-size:0.85em">(${escapeHtml(it.term_en)})</em>` : ""}</dt>
        <dd>
          ${inline(it.definition)}
          <br/>
          <button type="button" class="glossary-back" data-back="1">↑ Back to where you were</button>
        </dd>
      `;
    }).join("");
    const startCollapsed = items.length > 4 ? "collapsed" : "";
    return `
      <section class="glossary ${startCollapsed}" id="glossary">
        <h2>Glossary</h2>
        <p class="glossary-lede">Definitions of the key terms used above. Tap any underlined term in the text to jump straight here.</p>
        <dl>${entries}</dl>
        ${items.length > 4 ? `<button type="button" class="glossary-toggle" id="glossary-toggle">Show all ${items.length} terms</button>` : ""}
      </section>
    `;
  }

  function renderNextUp(s, catalog) {
    const items = (catalog && catalog.sessions) || [];
    const idx = items.findIndex((x) => x.id === s.id);
    const next = idx >= 0 ? items.slice(idx + 1).find((x) => x.available !== false) : null;
    if (!next) {
      return `
        <div class="next-up">
          <div>
            <div class="label">Congratulations</div>
            <div class="next-title">You've finished every available session.</div>
          </div>
          <a class="btn btn-ghost" href="index.html#sessiyalar">All sessions</a>
        </div>
      `;
    }
    return `
      <div class="next-up">
        <div>
          <div class="label">Next session</div>
          <div class="next-title">${escapeHtml(next.title)}</div>
        </div>
        <a class="btn btn-primary" href="session.html?id=${encodeURIComponent(next.id)}">Continue →</a>
      </div>
    `;
  }

  // ---------- Hotspots ----------
  function initHotspots(session) {
    const canvas = document.getElementById("masterpiece-canvas");
    if (!canvas) return;
    const hotspots = (session.masterpiece && session.masterpiece.hotspots) || [];
    let popover = null;
    let activePin = null;

    function closePopover() {
      if (popover) { popover.remove(); popover = null; }
      if (activePin) { activePin.classList.remove("active"); activePin = null; }
    }

    canvas.addEventListener("click", (e) => {
      // ignore clicks on the image itself (lightbox will catch those)
      const pin = e.target.closest(".hotspot");
      if (!pin) return;
      e.stopPropagation();
      const idx = Number(pin.dataset.hsIdx);
      const data = hotspots[idx];
      if (!data) return;

      closePopover();
      activePin = pin;
      pin.classList.add("active");

      popover = document.createElement("div");
      popover.className = "hotspot-popover show";
      popover.innerHTML = `
        <button type="button" class="hp-close" aria-label="Close">×</button>
        <span class="hp-label">${escapeHtml(data.label || "")}</span>
        <div class="hp-body">${inline(data.note || "")}</div>
      `;
      canvas.appendChild(popover);

      // position: try to the right of the pin, fall back to left if it overflows
      const cw = canvas.clientWidth;
      const pinLeft = parseFloat(pin.style.left);
      const pinTop = parseFloat(pin.style.top);
      const pw = 280;
      const goLeft = pinLeft > 55; // right pins -> popover to the left
      const xPct = goLeft ? Math.max(2, (pinLeft - 3 - (pw / cw) * 100)) : Math.min(98 - (pw / cw) * 100, pinLeft + 3);
      const yPct = Math.min(95, Math.max(2, pinTop - 8));
      popover.style.left = xPct + "%";
      popover.style.top = yPct + "%";

      popover.querySelector(".hp-close").addEventListener("click", closePopover);
    });
    document.addEventListener("click", (e) => {
      if (!popover) return;
      if (canvas.contains(e.target) || popover.contains(e.target)) return;
      closePopover();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closePopover();
    });
  }

  // ---------- Lightbox ----------
  function initLightbox() {
    const lb = document.getElementById("lightbox");
    if (!lb) return;
    const lbImg = lb.querySelector(".lightbox-img");
    const lbCap = lb.querySelector(".lightbox-caption");
    const closeBtn = lb.querySelector(".lightbox-close");

    function open(src, alt, caption) {
      lbImg.src = src;
      lbImg.alt = alt || "";
      lbCap.textContent = caption || "";
      lb.hidden = false;
      requestAnimationFrame(() => lb.classList.add("open"));
      document.body.style.overflow = "hidden";
    }
    function close() {
      lb.classList.remove("open");
      setTimeout(() => {
        lb.hidden = true;
        lbImg.src = "";
        document.body.style.overflow = "";
      }, 180);
    }

    document.addEventListener("click", (e) => {
      // hotspot clicks should NOT open lightbox
      if (e.target.closest(".hotspot") || e.target.closest(".hotspot-popover")) return;
      const img = e.target.closest("figure.art img");
      if (img) {
        e.preventDefault();
        const cap = decodeURIComponent(img.dataset.caption || "");
        open(img.src, img.alt, cap);
      }
    });
    closeBtn.addEventListener("click", close);
    lb.addEventListener("click", (e) => {
      if (e.target === lb || e.target === lbCap) close();
    });
    document.addEventListener("keydown", (e) => {
      if (!lb.hidden && e.key === "Escape") close();
    });
  }

  // ---------- Glossary "Back" buttons + auto-expand on inline click ----------
  function initGlossaryAnchors() {
    let lastScrollY = null;
    document.addEventListener("click", (e) => {
      const link = e.target.closest("a.glossary-link");
      if (link) {
        // Auto-expand the glossary so the target term is actually visible
        const glossary = document.getElementById("glossary");
        if (glossary) glossary.classList.remove("collapsed");
        lastScrollY = window.scrollY;
        try { sessionStorage.setItem("mushy:lastScroll", String(lastScrollY)); } catch (_) {}
        return;
      }
      const back = e.target.closest("button.glossary-back");
      if (back) {
        e.preventDefault();
        let y = lastScrollY;
        if (y == null) {
          try { y = Number(sessionStorage.getItem("mushy:lastScroll")) || 0; } catch (_) { y = 0; }
        }
        window.scrollTo({ top: y, behavior: "smooth" });
        lastScrollY = null;
      }
    });
  }

  // ---------- Glossary "Show all" toggle ----------
  function initGlossaryToggle() {
    document.addEventListener("click", (e) => {
      if (e.target.id !== "glossary-toggle") return;
      const glossary = document.getElementById("glossary");
      if (glossary) glossary.classList.remove("collapsed");
    });
  }

  // ---------- Quiz gate ----------
  function initQuizGate() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("#start-quiz-btn");
      if (!btn) return;
      const quiz = document.getElementById("quiz");
      const gate = document.getElementById("quiz-gate");
      if (!quiz) return;
      quiz.hidden = false;
      if (gate) gate.style.display = "none";
      quiz.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // ---------- Quiz ----------
  function initQuiz(session) {
    const questions = session.quiz;
    const container = document.getElementById("quiz-questions");
    const resultBox = document.getElementById("quiz-result");
    const scoreNum = document.getElementById("score-num");
    const scoreMsg = document.getElementById("score-msg");
    const retry = document.getElementById("retry-btn");

    let answered = 0;
    let correct = 0;

    function render() {
      container.innerHTML = "";
      answered = 0; correct = 0;
      resultBox.classList.remove("show");

      questions.forEach((q, qi) => {
        const qEl = document.createElement("div");
        qEl.className = "q";
        qEl.innerHTML = `
          <div class="q-num">Question ${qi + 1}</div>
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
          btn.addEventListener("click", () => handleAnswer(qEl, opts, btn, oi, q.correct));
          opts.appendChild(btn);
        });
        container.appendChild(qEl);
      });
    }

    function handleAnswer(qEl, opts, btn, chosen, correctIdx) {
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
      if (answered === questions.length) showResult();
    }

    function showResult() {
      scoreNum.textContent = correct;
      scoreMsg.textContent = praise(correct, questions.length);
      resultBox.classList.add("show");
      resultBox.scrollIntoView({ behavior: "smooth", block: "center" });
      // save progress
      saveProgress(session.id, correct, questions.length);
    }

    function praise(c, total) {
      const pct = c / total;
      if (pct === 1) return "Flawless. You've internalised the visual alphabet of this period.";
      if (pct >= 0.8) return "Strong work. Skim the few you missed and move on.";
      if (pct >= 0.6) return "Solid first pass. Re-read the explanations of your wrong answers.";
      if (pct >= 0.4) return "Not bad for a first read. Go back to the micro-elements, then retry.";
      return "Art rewards patience. Re-read the session and try the test again.";
    }

    retry.addEventListener("click", (e) => {
      e.preventDefault();
      render();
      document.getElementById("quiz").scrollIntoView({ behavior: "smooth" });
    });

    render();
  }

  // ---------- Share ----------
  function initShare() {
    const block = document.getElementById("share-block");
    if (!block) return;
    const url = location.href;
    const title = document.title;
    const twitterLink = block.querySelector('[data-share="twitter"]');
    const telegramLink = block.querySelector('[data-share="telegram"]');
    if (twitterLink) twitterLink.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
    if (telegramLink) telegramLink.href = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;

    const copyBtn = block.querySelector('[data-share="copy"]');
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(url);
          const original = copyBtn.textContent;
          copyBtn.textContent = "✓ Link copied";
          copyBtn.classList.add("copied");
          setTimeout(() => {
            copyBtn.textContent = original;
            copyBtn.classList.remove("copied");
          }, 2200);
        } catch (e) {
          copyBtn.textContent = "Press Ctrl+C to copy";
          setTimeout(() => { copyBtn.textContent = "Copy link"; }, 2500);
        }
      });
    }
  }

  // ---------- Reading progress bar ----------
  function initReadingProgress() {
    const bar = document.getElementById("read-progress");
    if (!bar) return;
    function update() {
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const max = h.scrollHeight - h.clientHeight;
      const pct = max > 0 ? (scrolled / max) * 100 : 0;
      bar.style.width = pct + "%";
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }

  // ---------- Progress / localStorage ----------
  function saveProgress(sessionId, score, total) {
    try {
      const key = STORAGE_PREFIX + sessionId;
      const prev = JSON.parse(localStorage.getItem(key) || "{}");
      const best = Math.max(prev.score || 0, score);
      localStorage.setItem(key, JSON.stringify({
        completed: true,
        score: best,
        total: total,
        lastScore: score,
        lastAt: Date.now()
      }));
    } catch (e) { /* ignore */ }
  }
  function saveLastVisited(id) {
    try { localStorage.setItem("mushy:lastSessionId", id); } catch (_) {}
  }

  // ---------- helpers ----------
  function paragraphs(textOrArray) {
    if (!textOrArray) return "";
    const arr = Array.isArray(textOrArray) ? textOrArray : String(textOrArray).split(/\n\n+/);
    return arr.map((p) => `<p>${inline(p)}</p>`).join("");
  }

  function slugify(s) {
    return String(s || "").toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  // Inline syntax: **bold**, *italic*, `code`, [[glossary term]]
  function inline(text) {
    if (text == null) return "";
    let t = escapeHtml(text);

    // glossary links FIRST
    t = t.replace(/\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]/g, (_, display, key) => {
      const slug = slugify(key || display);
      return `<a class="glossary-link" href="#g-${slug}">${display}</a>`;
    });

    // bold (tokenised first)
    const boldStore = [];
    t = t.replace(/\*\*([\s\S]+?)\*\*/g, (_, inner) => {
      const i = boldStore.push(inner) - 1;
      return "@@BOLD" + i + "@@";
    });

    // italic
    t = t.replace(/(^|[^*])\*([^*\s](?:[\s\S]*?[^*\s])?)\*(?!\*)/g, "$1<em>$2</em>");

    // restore bold
    t = t.replace(/@@BOLD(\d+)@@/g, (_, i) => "<strong>" + boldStore[Number(i)] + "</strong>");

    // code
    t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
    return t;
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
