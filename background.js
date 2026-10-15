function pickCookie(cookies, name) {
  const matches = cookies.filter((cookie) => cookie.name === name && cookie.value);
  matches.sort((a, b) => {
    const score = (cookie) =>
      (cookie.domain === ".espn.com" || cookie.domain === "espn.com" ? 2 : 0) +
      (cookie.path === "/" ? 1 : 0);
    return score(b) - score(a);
  });
  return matches[0]?.value ?? null;
}

async function readCredentials() {
  const cookies = await chrome.cookies.getAll({ domain: "espn.com" });
  const espnS2 = pickCookie(cookies, "espn_s2");
  const swid = pickCookie(cookies, "SWID");
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
  if (!domain.endsWith("espn.com")) return;
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
