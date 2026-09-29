const BANNED =
  /\b(fetch|XMLHttpRequest|WebSocket|Worker|import|eval|Function|document|window|globalThis|process|require|navigator|localStorage|indexedDB)\b/;

type Loaded = { ok: true; fn: (...args: unknown[]) => unknown } | { ok: false; log: string };

function load(source: string, name: string): Loaded {
  if (source.trim().length < 8) return { ok: false, log: "Write the function first." };
  if (source.length > 4000) return { ok: false, log: "Keep the function under 4000 characters." };
  if (BANNED.test(source)) {
    return { ok: false, log: "Network, DOM, and eval are refused on this desk." };
  }
  try {
    const factory = new Function(
      `"use strict";
      const fetch = undefined, window = undefined, globalThis = undefined, document = undefined, Function = undefined, WebSocket = undefined, XMLHttpRequest = undefined, Worker = undefined, navigator = undefined, process = undefined, require = undefined, localStorage = undefined, indexedDB = undefined;
      ${source}
      return typeof ${name} === "function" ? ${name} : undefined;`,
    ) as () => unknown;
    const fn = factory();
    if (typeof fn !== "function") return { ok: false, log: `Define a function named ${name}.` };
    return { ok: true, fn: fn as (...args: unknown[]) => unknown };
  } catch (error) {
    return { ok: false, log: error instanceof Error ? error.message : "That function did not parse." };
  }
}

function loadMany(source: string, names: string[]): { ok: true; fns: Record<string, (...args: unknown[]) => unknown> } | { ok: false; log: string } {
  if (source.trim().length < 8) return { ok: false, log: "Write the function first." };
  if (source.length > 4000) return { ok: false, log: "Keep the function under 4000 characters." };
  if (BANNED.test(source)) return { ok: false, log: "Network, DOM, and eval are refused on this desk." };
  try {
    const factory = new Function(
      `"use strict";
      const fetch = undefined, window = undefined, globalThis = undefined, document = undefined, Function = undefined, WebSocket = undefined, XMLHttpRequest = undefined, Worker = undefined, navigator = undefined, process = undefined, require = undefined, localStorage = undefined, indexedDB = undefined;
      ${source}
      return { ${names.join(", ")} };`,
    ) as () => Record<string, unknown>;
    const exported = factory();
    const fns: Record<string, (...args: unknown[]) => unknown> = {};
    for (const name of names) {
      if (typeof exported[name] !== "function") return { ok: false, log: `Define a function named ${name}.` };
      fns[name] = exported[name] as (...args: unknown[]) => unknown;
    }
    return { ok: true, fns };
  } catch (error) {
    return { ok: false, log: error instanceof Error ? error.message : "That function did not parse." };
  }
}

function record(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  return value as Record<string, unknown>;
}

const ACCOUNTS = [
  { id: "acct_1001", owner: "user_avery", holder: "Avery Chen", balance: 10, last4: "1111" },
  { id: "acct_1002", owner: "user_blake", holder: "Blake Okonkwo", balance: 99, last4: "2222" },
];

const ORDERS = [
  { id: "1001", owner: "user_avery", item: "Wool blanket", address: "14 King St" },
  { id: "1002", owner: "user_blake", item: "Brass lamp", address: "88 Pike St" },
];

export type FixChallenge = {
  id: string;
  title: string;
  hint: string;
  starter: string;
};

const HARBOR: FixChallenge[] = [
  {
    id: "idor",
    title: "Account read",
    hint: "Return Avery's own account. Do not return a body whose owner is someone else.",
    starter: `function harborGetAccount(sessionUser, id, accounts) {
  if (!sessionUser) return { status: 401, body: null };
  const account = accounts.find((row) => row.id === id) ?? null;
  if (!account) return { status: 404, body: null };
  return { status: 200, body: account };
}`,
  },
  {
    id: "mass",
    title: "Profile patch",
    hint: "Name may change. kycTier must stay at the value the server already stored.",
    starter: `function harborPatchMe(patch, current) {
  const next = { ...current };
  for (const [key, value] of Object.entries(patch)) next[key] = value;
  return next;
}`,
  },
];

const NORTHLINE: FixChallenge[] = [
  {
    id: "xss",
    title: "Message render",
    hint: "A body with an onerror handler must not come back as HTML. Plain text should still come back.",
    starter: `function northlineRender(body) {
  return { sink: "innerHTML", body };
}`,
  },
  {
    id: "redirect",
    title: "Login next",
    hint: "Allow a path that starts with one slash. Refuse absolute URLs and //. ",
    starter: `function northlineNext(next) {
  const value = String(next || "").trim();
  return { location: value || "/inbox" };
}`,
  },
];

const PYLON: FixChallenge[] = [
  {
    id: "traversal",
    title: "File key",
    hint: "readme.txt must still resolve under docs/. ../secrets/env must not return the secret.",
    starter: `function pylonRead(file, files) {
  const parts = ["docs"];
  for (const part of String(file).split("/")) {
    if (part === "..") { if (parts.length) parts.pop(); }
    else if (part && part !== ".") parts.push(part);
  }
  const key = parts.join("/");
  const body = files[key];
  if (!body) return { status: 404, key, body: "not found" };
  return { status: 200, key, body };
}`,
  },
  {
    id: "ssrf",
    title: "Import URL",
    hint: "cdn.pylon.lab may answer. 169.254.169.254 must not.",
    starter: `function pylonImport(raw) {
  let url;
  try { url = new URL(raw); } catch { return { status: 400, host: "", body: "bad url" }; }
  return { status: 200, host: url.hostname, body: "fetched " + url.hostname };
}`,
  },
];

const KILN: FixChallenge[] = [
  {
    id: "price",
    title: "Checkout price",
    hint: "Charge the catalog price for the SKU. Ignore the cents the browser sent.",
    starter: `function kilnCheckout(sku, priceCents, catalogPrice) {
  if (sku !== "wool-blanket") return { status: 404, charged: 0 };
  return { status: 200, charged: priceCents, catalog: catalogPrice };
}`,
  },
  {
    id: "order-idor",
    title: "Order read",
    hint: "Avery can read order 1001. She must not receive order 1002.",
    starter: `function kilnGetOrder(sessionUser, id, orders) {
  if (!sessionUser) return { status: 401, body: null };
  const order = orders.find((row) => row.id === id) ?? null;
  if (!order) return { status: 404, body: null };
  return { status: 200, body: order };
}`,
  },
];

const GLASS: FixChallenge[] = [
  {
    id: "admin",
    title: "Staff console",
    hint: "The second argument is the role stored on the server. Ignore the first.",
    starter: `function glassConsole(clientRole, serverRole) {
  if (clientRole === "admin") return { status: 200, panel: "staff" };
  return { status: 403, panel: "" };
}`,
  },
  {
    id: "reset",
    title: "Reset token",
    hint: "The issued token must not be base64 of the user id, and redeeming that encoding must fail. Redeeming the token you issued must still succeed.",
    starter: `function glassIssueReset(email, users) {
  const user = users[email];
  if (!user) return { token: "" };
  return { token: btoa(user) };
}
function glassRedeem(token, users) {
  let user = "";
  try { user = atob(token); } catch { return { ok: false, user: "" }; }
  const known = Object.values(users).includes(user);
  return { ok: known, user: known ? user : "" };
}`,
  },
];

const BY_PROGRAM: Record<string, FixChallenge[]> = {
  harbor: HARBOR,
  northline: NORTHLINE,
  pylon: PYLON,
  kiln: KILN,
  glass: GLASS,
};

export function challengesFor(programId: string) {
  return BY_PROGRAM[programId] ?? [];
}

const FILES: Record<string, string> = {
  "docs/readme.txt": "Welcome to Pylon.",
  "secrets/env": "AWS_SECRET=lab-only",
};

function pass(log: string) {
  return { pass: true, log };
}
function fail(log: string) {
  return { pass: false, log };
}

export function checkFix(programId: string, probeId: string, source: string): { pass: boolean; log: string } {
  try {
    if (programId === "harbor" && probeId === "idor") {
      const loaded = load(source, "harborGetAccount");
      if (!loaded.ok) return fail(loaded.log);
      const own = record(loaded.fn("user_avery", "acct_1001", ACCOUNTS));
      const foreign = record(loaded.fn("user_avery", "acct_1002", ACCOUNTS));
      const ownBody = record(own?.body);
      const foreignBody = record(foreign?.body);
      if (ownBody?.id !== "acct_1001") return fail("Avery can no longer read her own account.");
      if (foreignBody?.owner === "user_blake" || foreignBody?.id === "acct_1002") {
        return fail("Avery still receives Blake's account.");
      }
      return pass("Foreign read is closed. Avery's own account still returns.");
    }
    if (programId === "harbor" && probeId === "mass") {
      const loaded = load(source, "harborPatchMe");
      if (!loaded.ok) return fail(loaded.log);
      const next = record(loaded.fn({ name: "A. Chen", kycTier: "verified" }, { name: "Avery Chen", kycTier: "basic" }));
      if (!next) return fail("Return the stored profile.");
      if (next.kycTier !== "basic") return fail("kycTier still follows the client.");
      if (next.name !== "A. Chen") return fail("The name field should still update.");
      return pass("The name changed. The tier stayed on the server.");
    }
    if (programId === "northline" && probeId === "xss") {
      const loaded = load(source, "northlineRender");
      if (!loaded.ok) return fail(loaded.log);
      const nasty = `<img src=x onerror=alert(1)>`;
      const bad = record(loaded.fn(nasty));
      const plain = record(loaded.fn("See you Thursday."));
      const badBody = String(bad?.body ?? "");
      const plainBody = String(plain?.body ?? "");
      if (!plainBody.includes("Thursday")) return fail("Plain text was dropped.");
      if (/<\s*script\b|onerror\s*=|onload\s*=|javascript\s*:/i.test(badBody)) {
        return fail("The handler is still in the rendered body.");
      }
      if (bad?.sink === "innerHTML") return fail("The sink is still innerHTML.");
      return pass("The handler no longer comes back as HTML.");
    }
    if (programId === "northline" && probeId === "redirect") {
      const loaded = load(source, "northlineNext");
      if (!loaded.ok) return fail(loaded.log);
      const stay = record(loaded.fn("/inbox"));
      const leave = record(loaded.fn("https://phish.example/northline"));
      const scheme = record(loaded.fn("//phish.example"));
      if (stay?.location !== "/inbox") return fail("A relative /inbox should still be allowed.");
      const bad = (value: unknown) =>
        typeof value === "string" && (value.startsWith("http") || value.startsWith("//"));
      if (bad(leave?.location) || bad(scheme?.location)) return fail("An off-site next is still the location.");
      return pass("Relative paths stay. Absolute and scheme-relative URLs do not.");
    }
    if (programId === "pylon" && probeId === "traversal") {
      const loaded = load(source, "pylonRead");
      if (!loaded.ok) return fail(loaded.log);
      const readme = record(loaded.fn("readme.txt", FILES));
      const secret = record(loaded.fn("../secrets/env", FILES));
      if (readme?.status !== 200 || !String(readme.body).includes("Pylon")) {
        return fail("readme.txt should still open.");
      }
      if (String(secret?.body).includes("AWS_SECRET") || secret?.key === "secrets/env") {
        return fail("The secret file is still reachable.");
      }
      return pass("The docs prefix holds. The secret file stays put.");
    }
    if (programId === "pylon" && probeId === "ssrf") {
      const loaded = load(source, "pylonImport");
      if (!loaded.ok) return fail(loaded.log);
      const cdn = record(loaded.fn("https://cdn.pylon.lab/logo.png"));
      const meta = record(loaded.fn("http://169.254.169.254/latest/meta-data/"));
      if (cdn?.host !== "cdn.pylon.lab" || cdn.status === 400) return fail("The CDN host should still be allowed.");
      if (meta?.status === 200 && meta.host === "169.254.169.254") return fail("The metadata address still answers.");
      return pass("The CDN answers. The link-local address does not.");
    }
    if (programId === "kiln" && probeId === "price") {
      const loaded = load(source, "kilnCheckout");
      if (!loaded.ok) return fail(loaded.log);
      const result = record(loaded.fn("wool-blanket", 100, 8400));
      if (result?.charged !== 8400) return fail(`Charged ${String(result?.charged)}, catalog is 8400.`);
      return pass("The browser sent 100 cents. The charge is the catalog price.");
    }
    if (programId === "kiln" && probeId === "order-idor") {
      const loaded = load(source, "kilnGetOrder");
      if (!loaded.ok) return fail(loaded.log);
      const own = record(loaded.fn("user_avery", "1001", ORDERS));
      const foreign = record(loaded.fn("user_avery", "1002", ORDERS));
      if (record(own?.body)?.id !== "1001") return fail("Avery should still see her order.");
      if (record(foreign?.body)?.owner === "user_blake") return fail("Blake's address still comes back.");
      return pass("Order 1002 stays with Blake.");
    }
    if (programId === "glass" && probeId === "admin") {
      const loaded = load(source, "glassConsole");
      if (!loaded.ok) return fail(loaded.log);
      const spoof = record(loaded.fn("admin", "customer"));
      const staff = record(loaded.fn("customer", "admin"));
      if (spoof?.status === 200 || spoof?.panel === "staff") return fail("A client role of admin still opens the panel.");
      if (staff?.status !== 200) return fail("A server role of admin should still open the panel.");
      return pass("The client role is ignored. The server role is what counts.");
    }
    if (programId === "glass" && probeId === "reset") {
      const loaded = loadMany(source, ["glassIssueReset", "glassRedeem"]);
      if (!loaded.ok) return fail(loaded.log);
      const users = { "blake@glass.lab": "user_blake" };
      const issued = record(loaded.fns.glassIssueReset("blake@glass.lab", users));
      const token = typeof issued?.token === "string" ? issued.token : "";
      if (!token) return fail("A known mailbox should still receive a token.");
      if (token === btoa("user_blake")) return fail("The token is still base64 of the user id.");
      const forged = record(loaded.fns.glassRedeem(btoa("user_blake"), users));
      if (forged?.ok === true) return fail("The forged token still redeems.");
      const real = record(loaded.fns.glassRedeem(token, users));
      if (real?.ok !== true) return fail("The token you issued no longer redeems.");
      return pass("The token is not a function of the user id, and the forged one fails.");
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : "The function threw.");
  }
  return fail("This probe has no fix desk.");
}
