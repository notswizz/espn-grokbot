function uniqByName(cookies) {
  const best = new Map();
  for (const cookie of cookies) {
    if (!cookie?.name || !cookie?.value) continue;
    const prev = best.get(cookie.name);
    const score =
      (cookie.domain === ".espn.com" || cookie.domain === "espn.com" ? 4 : 0) +
      ((cookie.domain || "").includes("fantasy.espn.com") ? 3 : 0) +
      (cookie.path === "/" ? 1 : 0) +
      String(cookie.value || "").length / 1000;
    if (!prev || score > prev.score) best.set(cookie.name, { cookie, score });
  }
  return best;
}

async function collectEspnCookies() {
  const buckets = [];
  const urls = [
    "https://fantasy.espn.com/",
    "https://www.espn.com/",
    "https://espn.com/",
    "https://cdn.espn.com/",
    "https://fan.api.espn.com/",
  ];
  for (const url of urls) {
    try {
      buckets.push(...(await chrome.cookies.getAll({ url })));
    } catch (_) {}
  }
  try {
    buckets.push(...(await chrome.cookies.getAll({ domain: "espn.com" })));
  } catch (_) {}
  try {
    buckets.push(...(await chrome.cookies.getAll({ domain: ".espn.com" })));
  } catch (_) {}

  // Named lookups as a last resort
  for (const url of urls) {
    for (const name of ["espn_s2", "SWID"]) {
      try {
        const one = await chrome.cookies.get({ url, name });
        if (one) buckets.push(one);
      } catch (_) {}
    }
  }
  return buckets;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

function setValueDisplay(el, value) {
  el.dataset.full = value || "";
  if (!value) {
    el.textContent = "Not found yet. Sign into ESPN, then reopen.";
    el.classList.add("empty");
    el.classList.add("truncated");
    el.classList.remove("expanded");
    return;
  }
  el.classList.remove("empty");
  el.textContent = value;
  el.classList.add("truncated");
  el.classList.remove("expanded");
}

function flashCopied(button, label) {
  const original = button.textContent;
  button.classList.add("copied");
  button.textContent = `✓ Copied ${label}`;
  clearTimeout(button._copiedTimer);
  button._copiedTimer = setTimeout(() => {
    button.classList.remove("copied");
    button.textContent = original;
  }, 1500);
}

function setStatus(kind, text) {
  const status = document.getElementById("status");
  const label = document.getElementById("status-text");
  status.className = `status ${kind || ""}`.trim();
  label.textContent = text;
}

async function load() {
  const s2El = document.getElementById("espn_s2");
  const swidEl = document.getElementById("swid");
  const copyS2 = document.getElementById("copy_s2");
  const copySwid = document.getElementById("copy_swid");
  const debug = document.getElementById("debug");

  document.querySelectorAll("[data-reveal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-reveal");
      const el = document.getElementById(id);
      const expanded = el.classList.toggle("expanded");
      el.classList.toggle("truncated", !expanded);
      btn.textContent = expanded ? "Hide" : "Show";
    });
  });

  try {
    const all = await collectEspnCookies();
    const byName = uniqByName(all);
    const espnS2 = byName.get("espn_s2")?.cookie?.value || "";
    const swid = byName.get("SWID")?.cookie?.value || "";
    setValueDisplay(s2El, espnS2);
    setValueDisplay(swidEl, swid);
    copyS2.disabled = !espnS2;
    copySwid.disabled = !swid;

    const names = [...new Set(all.map((c) => `${c.name} @ ${c.domain}${c.path || "/"}`))].sort();
    debug.textContent = names.length
      ? `Saw ${names.length} ESPN cookie(s): ${names.join(", ")}`
      : "Saw 0 ESPN cookies in this Chrome profile.";

    if (!espnS2 && !swid) {
      setStatus(
        "warn",
        "Not signed in. Open fantasy.espn.com in this browser, then reopen."
      );
      return;
    }
    if (!espnS2 || !swid) {
      setStatus("warn", "Only one cookie found. Finish ESPN sign-in, then reopen.");
      return;
    }
    setStatus("ready", "Ready. Copy each value into the secure fields in chat.");
  } catch (error) {
    setStatus("warn", error?.message || "Could not read cookies.");
  }

  copyS2.onclick = async () => {
    const ok = await copyText(s2El.dataset.full || s2El.textContent);
    if (ok) flashCopied(copyS2, "espn_s2");
    else setStatus("warn", "Copy failed.");
  };
  copySwid.onclick = async () => {
    const ok = await copyText(swidEl.dataset.full || swidEl.textContent);
    if (ok) flashCopied(copySwid, "SWID");
    else setStatus("warn", "Copy failed.");
  };
}

load();
