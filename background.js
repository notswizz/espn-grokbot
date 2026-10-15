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

async function readCredentials() {
  const byName = uniqByName(await collectEspnCookies());
  const espnS2 = byName.get("espn_s2")?.cookie?.value ?? null;
  const swid = byName.get("SWID")?.cookie?.value ?? null;
  if (!espnS2 && !swid) return null;
  return { espn_s2: espnS2, swid };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "get-espn-credentials") return;
  readCredentials()
    .then((credentials) => sendResponse({ ok: true, credentials }))
    .catch((error) => sendResponse({ ok: false, error: error?.message || "Could not read cookies." }));
  return true;
});

chrome.cookies.onChanged.addListener((change) => {
  const name = change.cookie?.name;
  const domain = change.cookie?.domain || "";
  if (change.removed) return;
  if (!domain.includes("espn.com")) return;
  if (name !== "espn_s2" && name !== "SWID") return;

  chrome.tabs.query(
    {
      url: [
        "https://fantasy.espn.com/*",
        "https://www.espn.com/fantasy/*",
        "https://espn.com/fantasy/*",
      ],
    },
    (tabs) => {
      for (const tab of tabs) {
        if (!tab.id) continue;
        chrome.tabs.sendMessage(tab.id, { type: "espn-cookies-changed" }).catch(() => {});
      }
    }
  );
});
