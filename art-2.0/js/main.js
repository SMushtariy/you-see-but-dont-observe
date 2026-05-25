// You see, but don't observe — home page
(function () {
  "use strict";

  const STORAGE_PREFIX = "mushy:session:";

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const grid = document.getElementById("sessions-grid");
  const countEl = document.getElementById("session-count");
  if (!grid) return;

  fetch("data/index.json", { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error("Catalog HTTP " + r.status);
      return r.json();
    })
    .then((catalog) => {
      const items = catalog.sessions || [];
      if (countEl) countEl.textContent = items.length;
      grid.innerHTML = "";
      items.forEach((s) => grid.appendChild(renderCard(s)));
      injectContinueCallout(items);
    })
    .catch((err) => {
      console.error(err);
      grid.innerHTML =
        '<p class="loading">Could not load the session list. Open this site through a local server (e.g. <code>python -m http.server</code>).</p>';
    });

  function renderCard(s) {
    const available = s.available !== false;
    const progress = available ? readProgress(s.id) : null;
    const a = document.createElement("a");
    a.className = "session-card" + (available ? "" : " coming-soon");
    a.href = available ? `session.html?id=${encodeURIComponent(s.id)}` : "#";
    a.setAttribute("aria-disabled", available ? "false" : "true");

    const num = String(s.number).padStart(2, "0");
    let badge = "";
    if (progress && progress.completed) {
      badge = `<span class="card-badge done">✓ ${progress.score}/${progress.total}</span>`;
    }
    let pill;
    if (!available) pill = "Coming soon";
    else if (progress && progress.completed) pill = "Read again →";
    else pill = "Start reading →";

    a.innerHTML = `
      <div class="thumb">
        ${badge}
        <img src="${s.hero_image}" alt="${escapeHtml(s.hero_alt || s.title)}" loading="lazy" />
      </div>
      <div class="body">
        <span class="num">Session ${num}</span>
        <h3>${escapeHtml(s.title)}</h3>
        <span class="era">${escapeHtml(s.era_en || "")}</span>
        <p class="blurb">${escapeHtml(s.blurb || "")}</p>
        <span class="pill">${pill}</span>
      </div>
    `;
    return a;
  }

  function injectContinueCallout(items) {
    let lastId = null;
    try { lastId = localStorage.getItem("mushy:lastSessionId"); } catch (_) {}
    if (!lastId) return;
    const last = items.find((x) => x.id === lastId && x.available !== false);
    if (!last) return;
    const prog = readProgress(last.id);
    if (prog && prog.completed) return;

    const sessionsSection = document.getElementById("sessions");
    if (!sessionsSection) return;
    const heading = sessionsSection.querySelector("h2");
    if (!heading) return;

    const callout = document.createElement("div");
    callout.className = "continue-callout";
    callout.innerHTML = `
      <div>
        <div class="cc-label">Pick up where you left off</div>
        <div class="cc-title">${escapeHtml(last.title)}</div>
      </div>
      <a class="btn btn-primary" href="session.html?id=${encodeURIComponent(last.id)}">Continue →</a>
    `;
    heading.parentNode.insertBefore(callout, heading.nextSibling);
  }

  function readProgress(id) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + id);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
