/**
 * In-memory labs. Every function is pure aside from reading constants.
 * Nothing here opens a socket.
 */

export type HarborAccount = {
  id: string;
  owner: string;
  holder: string;
  balance: number;
  last4: string;
};

export const HARBOR_ACCOUNTS: HarborAccount[] = [
  { id: "acct_1001", owner: "user_avery", holder: "Avery Chen", balance: 4280.5, last4: "4412" },
  { id: "acct_1002", owner: "user_blake", holder: "Blake Okonkwo", balance: 880.12, last4: "0091" },
];

export function harborGetAccount(sessionUser: string | null, id: string) {
  if (!sessionUser) {
    return { status: 401 as const, body: null, leaked: false };
  }
  const account = HARBOR_ACCOUNTS.find((row) => row.id === id) ?? null;
  if (!account) return { status: 404 as const, body: null, leaked: false };
  return {
    status: 200 as const,
    body: account,
    leaked: account.owner !== sessionUser,
  };
}

export function harborSearch(sessionUser: string, q: string) {
  const owned = HARBOR_ACCOUNTS.filter(
    (row) => row.owner === sessionUser && row.holder.toLowerCase().includes(q.toLowerCase()),
  );
  return { status: 200 as const, count: owned.length, ids: owned.map((row) => row.id) };
}

export function harborPatchMe(
  patch: Record<string, string>,
  current: { name: string; kycTier: string } = { name: "Avery Chen", kycTier: "basic" },
) {
  const next: Record<string, string> = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    next[key] = value;
  }
  return {
    status: 200 as const,
    body: next,
    escalated: next.kycTier !== current.kycTier,
  };
}

const EXECUTABLE = /<\s*script\b|onerror\s*=|onload\s*=|javascript\s*:|<\s*iframe\b|<\s*svg\b/i;

export function northlineRender(body: string) {
  return {
    sink: "innerHTML" as const,
    executable: EXECUTABLE.test(body),
    body,
  };
}

export function northlineNext(next: string) {
  const value = next.trim();
  let offsite = false;
  if (!value.startsWith("/") || value.startsWith("//")) offsite = true;
  try {
    const url = new URL(value || "/inbox", "https://northline.lab");
    if (url.origin !== "https://northline.lab") offsite = true;
  } catch {
    offsite = true;
  }
  return { location: value || "/inbox", offsite };
}

const PYLON_FILES: Record<string, string> = {
  "docs/readme.txt": "Welcome to Pylon. Customer documents live under docs/.",
  "docs/q3-brief.txt": "Q3 revenue is ahead of plan. Figures stay inside the company.",
  "secrets/env": "AWS_SECRET=wJalrDEMOONLY-not-a-real-key\nDB_PASSWORD=lab-only",
};

export function pylonRead(file: string) {
  const parts = ["docs"];
  for (const part of file.split("/")) {
    if (part === "..") {
      if (parts.length) parts.pop();
    } else if (part && part !== ".") {
      parts.push(part);
    }
  }
  const key = parts.join("/");
  const escaped = key.length > 0 && !key.startsWith("docs/");
  const body = PYLON_FILES[key];
  if (!body) return { status: 404 as const, key, body: "not found", escaped };
  return { status: 200 as const, key, body, escaped };
}

export function pylonImport(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return {
      status: 400 as const,
      host: "",
      body: "bad url",
      metadata: false,
      allowed: false,
    };
  }
  const metadata =
    url.hostname === "169.254.169.254" || url.hostname === "metadata.google.internal";
  const allowed = url.hostname === "cdn.pylon.lab";
  if (metadata) {
    return {
      status: 200 as const,
      host: url.hostname,
      body: "AccessKeyId=ASIAKESTRELLABONLY\nToken=lab-only-not-real",
      metadata: true,
      allowed: false,
    };
  }
  if (allowed) {
    return {
      status: 200 as const,
      host: url.hostname,
      body: "PNG logo (the only host that should answer)",
      metadata: false,
      allowed: true,
    };
  }
  return {
    status: 200 as const,
    host: url.hostname,
    body: `upstream body from ${url.hostname}`,
    metadata: false,
    allowed: false,
  };
}

export const KILN_PRICES = { "wool-blanket": 8400 } as const;

export function kilnCheckout(sku: string, priceCents: number) {
  const catalog = KILN_PRICES[sku as keyof typeof KILN_PRICES];
  if (catalog === undefined) {
    return { status: 404 as const, charged: 0, catalog: 0, tampered: false, orderId: "" };
  }
  return {
    status: 200 as const,
    charged: priceCents,
    catalog,
    tampered: priceCents !== catalog,
    orderId: "ord_9001",
  };
}

export type KilnOrder = { id: string; owner: string; item: string; address: string };

export const KILN_ORDERS: KilnOrder[] = [
  { id: "1001", owner: "user_avery", item: "Wool blanket", address: "14 King St, Avery" },
  { id: "1002", owner: "user_blake", item: "Brass lamp", address: "88 Pike St, Blake" },
];

export function kilnGetOrder(sessionUser: string | null, id: string) {
  if (!sessionUser) return { status: 401 as const, body: null, leaked: false };
  const order = KILN_ORDERS.find((row) => row.id === id) ?? null;
  if (!order) return { status: 404 as const, body: null, leaked: false };
  return { status: 200 as const, body: order, leaked: order.owner !== sessionUser };
}

export function glassConsole(role: string) {
  if (role === "admin") {
    return { status: 200 as const, panel: "staff", users: 1284, bypass: true };
  }
  return { status: 403 as const, panel: "", users: 0, bypass: false };
}

export function glassIssueReset(email: string) {
  const user =
    email === "blake@glass.lab" ? "user_blake" : email === "avery@glass.lab" ? "user_avery" : null;
  if (!user) return { status: 404 as const, token: "", user: "", predictable: false };
  return { status: 200 as const, token: btoa(user), user, predictable: true };
}

export function glassRedeem(token: string) {
  let user = "";
  try {
    user = atob(token);
  } catch {
    return { status: 400 as const, user: "", takeover: false };
  }
  if (!user.startsWith("user_")) return { status: 400 as const, user: "", takeover: false };
  return { status: 200 as const, user, takeover: true };
}

export const GLASS_BUNDLE_SOURCE = `window.GLASS_CONFIG = { stripe: "sk_live_51KESTREL_LAB_ONLY_NOT_REAL" };`;

export function glassScanBundle() {
  const match = GLASS_BUNDLE_SOURCE.match(/sk_live_[A-Za-z0-9_]+/);
  return { secret: match?.[0] ?? null };
}
