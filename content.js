const ROOT_ID = "espn-fantasy-connect-root";
const DISMISS_KEY = "espn-fantasy-connect-dismissed";

function wasDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function setDismissed(dismissed) {
  try {
    if (dismissed) sessionStorage.setItem(DISMISS_KEY, "1");
    else sessionStorage.removeItem(DISMISS_KEY);
  } catch {
    // Private-mode storage can throw. The dialog still works for this page view.
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.documentElement.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    return copied;
  }
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

function field(label, value) {
  const wrap = document.createElement("div");
  wrap.className = "card";

  const headingRow = document.createElement("div");
  headingRow.className = "field-label";

  const heading = document.createElement("span");
  heading.textContent = label;

  const reveal = document.createElement("button");
  reveal.type = "button";
  reveal.className = "reveal";
  reveal.textContent = "Show";

  headingRow.append(heading, reveal);

  const valueWrap = document.createElement("div");
  valueWrap.className = "value-wrap";

  const box = document.createElement("pre");
  box.className = value ? "value truncated" : "value empty truncated";
  box.dataset.full = value || "";
  box.textContent = value || "Not found yet. Finish signing in, then reopen this.";

  reveal.addEventListener("click", () => {
    const expanded = box.classList.toggle("expanded");
    box.classList.toggle("truncated", !expanded);
    reveal.textContent = expanded ? "Hide" : "Show";
  });

  valueWrap.append(box);
  wrap.append(headingRow, valueWrap);
  return wrap;
}

function createPanel(credentials) {
  const existing = document.getElementById(ROOT_ID);
  if (existing) existing.remove();

  const host = document.createElement("div");
  host.id = ROOT_ID;
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(0, 0, 0, 0.35);
      font: 13px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif;
      color: #111;
    }
    .dialog {
      width: min(400px, 100%);
      max-height: min(640px, 100%);
      overflow: auto;
      border-radius: 8px;
      background: #fff;
      border: 1px solid #e5e5e5;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }
    .inner { padding: 16px; }
    h1 {
      margin: 0 0 4px;
      font-size: 16px;
      font-weight: 650;
      color: #111;
    }
    .sub {
      margin: 0 0 12px;
      color: #666;
      font-size: 12px;
      line-height: 1.35;
    }
    .status {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 0 0 12px;
      font-size: 12px;
      color: #666;
    }
    .status .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #bbb;
      flex: 0 0 auto;
    }
    .status.ready { color: #0d7a3e; }
    .status.ready .dot { background: #1a9d55; }
    .status.warn { color: #9a6700; }
    .status.warn .dot { background: #d4a017; }
    .note {
      margin: 0 0 12px;
      color: #666;
      font-size: 12px;
    }
    .card {
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 10px;
      background: #fff;
    }
    .field-label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .field-label span {
      font-size: 11px;
      font-weight: 650;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: #666;
    }
    .reveal {
      border: 0;
      background: transparent;
      color: #1a73e8;
      font: 600 11px/1 system-ui, -apple-system, "Segoe UI", sans-serif;
      cursor: pointer;
      padding: 2px 0;
    }
    .value-wrap {
      position: relative;
      background: #fafafa;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      min-height: 38px;
      overflow: hidden;
    }
    .value {
      margin: 0;
      padding: 9px 10px;
      font: 11.5px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      color: #111;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      word-break: break-all;
    }
    .value.expanded {
      white-space: pre-wrap;
      text-overflow: clip;
      max-height: 120px;
      overflow: auto;
    }
    .value.empty { color: #999; font-style: italic; }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 4px;
    }
    button.primary, button.secondary, button.ghost {
      border: 0;
      border-radius: 8px;
      padding: 9px 12px;
      font: 600 12.5px/1 system-ui, -apple-system, "Segoe UI", sans-serif;
      cursor: pointer;
    }
    button.primary, button.secondary {
      color: #fff;
      background: #1a73e8;
    }
    button.primary.copied, button.secondary.copied {
      background: #0d7a3e;
    }
    button.ghost {
      background: #fff;
      color: #666;
      border: 1px solid #e5e5e5;
    }
    button.primary:disabled, button.secondary:disabled {
      opacity: 0.45;
      cursor: default;
    }
    .flash {
      margin: 0 0 8px;
      min-height: 16px;
      font-size: 12px;
      color: #666;
    }
    .pill {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 2147483647;
      border: 1px solid #e5e5e5;
      border-radius: 999px;
      padding: 10px 14px;
      background: #fff;
      color: #111;
      font: 600 13px/1 system-ui, -apple-system, "Segoe UI", sans-serif;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  `;
  shadow.append(style);

  const overlay = document.createElement("div");
  overlay.className = "overlay";

  const dialog = document.createElement("div");
  dialog.className = "dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "ESPN Fantasy Connect");

  const inner = document.createElement("div");
  inner.className = "inner";

  const title = document.createElement("h1");
  title.textContent = "ESPN Fantasy Connect";

  const sub = document.createElement("p");
  sub.className = "sub";
  sub.textContent = "Copy each value into Fantasy Football GM's secure fields.";

  const status = document.createElement("p");
  const ready = !!(credentials.espn_s2 && credentials.swid);
  status.className = ready ? "status ready" : "status warn";
  status.innerHTML = ready
    ? '<span class="dot" aria-hidden="true"></span><span>Ready</span>'
    : '<span class="dot" aria-hidden="true"></span><span>Not signed in</span>';

  const note = document.createElement("p");
  note.className = "note";
  note.textContent =
    "These are the espn_s2 and SWID cookies for the account you signed into. Copy them yourself into chat. This window does not send them anywhere.";

  const flash = document.createElement("p");
  flash.className = "flash";

  const s2Card = field("espn_s2", credentials.espn_s2);
  const swidCard = field("SWID", credentials.swid);

  const copyS2 = document.createElement("button");
  copyS2.className = "primary";
  copyS2.type = "button";
  copyS2.textContent = "Copy espn_s2";
  copyS2.disabled = !credentials.espn_s2;

  const copySwid = document.createElement("button");
  copySwid.className = "secondary";
  copySwid.type = "button";
  copySwid.textContent = "Copy SWID";
  copySwid.disabled = !credentials.swid;

  const close = document.createElement("button");
  close.className = "ghost";
  close.type = "button";
  close.textContent = "Close";

  const actions = document.createElement("div");
  actions.className = "actions";
  actions.append(copyS2, copySwid, close);

  inner.append(title, sub, status, note, s2Card, swidCard, flash, actions);
  dialog.append(inner);
  overlay.append(dialog);
  shadow.append(overlay);
  document.documentElement.append(host);

  function setFlash(message) {
    flash.textContent = message;
  }

  async function onCopy(text, label, button) {
    if (!text) {
      setFlash(`${label} is not in this browser yet.`);
      return;
    }
    const copied = await copyText(text);
    if (copied) flashCopied(button, label);
    else setFlash("Copy failed. Select the text and copy it manually.");
  }

  copyS2.addEventListener("click", () => onCopy(credentials.espn_s2, "espn_s2", copyS2));
  copySwid.addEventListener("click", () => onCopy(credentials.swid, "SWID", copySwid));

  function dismiss() {
    setDismissed(true);
    host.remove();
    showReopenPill();
  }

  close.addEventListener("click", dismiss);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) dismiss();
  });
  document.addEventListener("keydown", function onKey(event) {
    if (event.key !== "Escape") return;
    document.removeEventListener("keydown", onKey);
    dismiss();
  });

  close.focus();
}

function showReopenPill() {
  if (document.getElementById(ROOT_ID)) return;
  const host = document.createElement("div");
  host.id = ROOT_ID;
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    .pill {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 2147483647;
      border: 1px solid #e5e5e5;
      border-radius: 999px;
      padding: 10px 14px;
      background: #fff;
      color: #111;
      font: 600 13px/1 system-ui, -apple-system, "Segoe UI", sans-serif;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  `;
  const button = document.createElement("button");
  button.className = "pill";
  button.type = "button";
  button.textContent = "ESPN cookies";
  button.addEventListener("click", () => {
    setDismissed(false);
    host.remove();
    showIfReady();
  });
  shadow.append(style, button);
  document.documentElement.append(host);
}

let reading = false;

async function showIfReady() {
  if (reading || document.getElementById(ROOT_ID)) return;
  reading = true;
  try {
    let response;
    try {
      response = await chrome.runtime.sendMessage({ type: "get-espn-credentials" });
    } catch {
      return;
    }
    if (!response?.ok || !response.credentials) return;
    const { espn_s2: espnS2, swid } = response.credentials;
    if (!espnS2 && !swid) return;
    if (document.getElementById(ROOT_ID)) return;
    if (wasDismissed()) {
      showReopenPill();
      return;
    }
    createPanel(response.credentials);
  } finally {
    reading = false;
  }
}

showIfReady();

let tries = 0;
const timer = setInterval(() => {
  tries += 1;
  if (tries > 30 || document.getElementById(ROOT_ID)) {
    clearInterval(timer);
    return;
  }
  showIfReady();
}, 2000);

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "espn-cookies-changed") showIfReady();
});
