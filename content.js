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

function payload(credentials) {
  return JSON.stringify(
    {
      espn_s2: credentials.espn_s2,
      swid: credentials.swid,
    },
    null,
    2
  );
}

function field(label, value) {
  const wrap = document.createElement("label");
  wrap.className = "field";

  const heading = document.createElement("span");
  heading.textContent = label;
  wrap.append(heading);

  const box = document.createElement("textarea");
  box.readOnly = true;
  box.value = value || "Not found yet. Finish signing in, then reopen this.";
  box.rows = value ? 3 : 2;
  wrap.append(box);
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
      background: rgba(15, 18, 22, 0.62);
      font: 14px/1.45 "Segoe UI", system-ui, sans-serif;
      color: #17202a;
    }
    .dialog {
      width: min(520px, 100%);
      max-height: min(640px, 100%);
      overflow: auto;
      background: #fff;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
    }
    h1 {
      margin: 0 0 8px;
      font-size: 18px;
      line-height: 1.3;
    }
    p {
      margin: 0 0 16px;
      color: #4d5966;
    }
    .field {
      display: block;
      margin-bottom: 12px;
    }
    .field span {
      display: block;
      margin-bottom: 6px;
      font-size: 12px;
      font-weight: 650;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    textarea {
      width: 100%;
      box-sizing: border-box;
      resize: vertical;
      border: 1px solid #d5dbe3;
      border-radius: 10px;
      padding: 10px;
      font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
      color: #17202a;
      background: #f7f8fa;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 4px;
    }
    button {
      border: 0;
      border-radius: 999px;
      padding: 9px 14px;
      font: 600 13px/1 "Segoe UI", system-ui, sans-serif;
      cursor: pointer;
    }
    .primary { background: #17202a; color: #fff; }
    .secondary { background: #eef1f4; color: #17202a; }
    .ghost { background: transparent; color: #4d5966; }
    .pill {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 2147483647;
      border: 0;
      border-radius: 999px;
      padding: 10px 14px;
      background: #17202a;
      color: #fff;
      font: 600 13px/1 "Segoe UI", system-ui, sans-serif;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    }
  `;
  shadow.append(style);

  const overlay = document.createElement("div");
  overlay.className = "overlay";

  const dialog = document.createElement("div");
  dialog.className = "dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "ESPN fantasy cookies");

  const title = document.createElement("h1");
  title.textContent = "Copy your ESPN fantasy login";

  const note = document.createElement("p");
  note.textContent =
    "These are the espn_s2 and SWID cookies for the account you just signed into. Copy them and paste them into Grok bot yourself. This window does not send them anywhere. Close it when you are done — anyone who can see this screen can read them too.";

  const status = document.createElement("p");
  status.hidden = true;

  const both = document.createElement("button");
  both.className = "primary";
  both.type = "button";
  both.textContent = "Copy both";

  const copyS2 = document.createElement("button");
  copyS2.className = "secondary";
  copyS2.type = "button";
  copyS2.textContent = "Copy espn_s2";

  const copySwid = document.createElement("button");
  copySwid.className = "secondary";
  copySwid.type = "button";
  copySwid.textContent = "Copy SWID";

  const close = document.createElement("button");
  close.className = "ghost";
  close.type = "button";
  close.textContent = "Close";

  const actions = document.createElement("div");
  actions.className = "actions";
  actions.append(both, copyS2, copySwid, close);

  dialog.append(
    title,
    note,
    field("espn_s2", credentials.espn_s2),
    field("SWID", credentials.swid),
    status,
    actions
  );
  overlay.append(dialog);
  shadow.append(overlay);
  document.documentElement.append(host);

  function flash(message) {
    status.hidden = false;
    status.textContent = message;
  }

  async function onCopy(text, label) {
    if (!text) {
      flash(`${label} is not in this browser yet.`);
      return;
    }
    const copied = await copyText(text);
    flash(copied ? `${label} copied.` : "Copy failed. Select the text and copy it manually.");
  }

  both.addEventListener("click", () => {
    if (!credentials.espn_s2 || !credentials.swid) {
      flash("Both cookies are not here yet. Finish signing in, then reopen this.");
      return;
    }
    onCopy(payload(credentials), "Both cookies");
  });
  copyS2.addEventListener("click", () => onCopy(credentials.espn_s2, "espn_s2"));
  copySwid.addEventListener("click", () => onCopy(credentials.swid, "SWID"));

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
      border: 0;
      border-radius: 999px;
      padding: 10px 14px;
      background: #17202a;
      color: #fff;
      font: 600 13px/1 "Segoe UI", system-ui, sans-serif;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
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
