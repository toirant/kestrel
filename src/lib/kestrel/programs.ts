import { pretty } from "./format.ts";
import {
  glassConsole,
  glassIssueReset,
  glassRedeem,
  glassScanBundle,
  GLASS_BUNDLE_SOURCE,
  harborGetAccount,
  harborPatchMe,
  harborSearch,
  kilnCheckout,
  kilnGetOrder,
  northlineNext,
  northlineRender,
  pylonImport,
  pylonRead,
} from "./runtime.ts";
import type { FindingDraft, Probe, Program, Severity } from "./types";

const pay = {
  critical: [6000, 15000] as [number, number],
  high: [2000, 6000] as [number, number],
  medium: [400, 1500] as [number, number],
  low: [100, 400] as [number, number],
};

function draft(
  partial: Omit<FindingDraft, "bountyLow" | "bountyHigh"> & {
    severity: Severity;
    bountyLow?: number;
    bountyHigh?: number;
  },
): FindingDraft {
  const [low, high] = pay[partial.severity];
  return {
    bountyLow: partial.bountyLow ?? low,
    bountyHigh: partial.bountyHigh ?? high,
    ...partial,
  };
}

export const PROGRAMS: Program[] = [
  {
    id: "harbor",
    index: "01",
    name: "Harbor Ledger",
    host: "api.harbor.lab",
    blurb: "A retail ledger. You are Avery Chen, a customer with one account.",
    surface: "Accounts API",
    inScope: ["api.harbor.lab", "Customer sessions and the profile object"],
    outOfScope: ["Payment rails", "Anything that is not this lab"],
    endpoints: [
      { method: "GET", path: "/v1/accounts/:id" },
      { method: "GET", path: "/v1/search" },
      { method: "PATCH", path: "/v1/me" },
    ],
    payouts: pay,
  },
  {
    id: "northline",
    index: "02",
    name: "Northline Mail",
    host: "app.northline.lab",
    blurb: "A small webmail. Messages are stored as the sender wrote them.",
    surface: "Webmail",
    inScope: ["app.northline.lab", "Message bodies and the login redirect"],
    outOfScope: ["Other customers' real inboxes", "Anything off this desk"],
    endpoints: [
      { method: "POST", path: "/messages" },
      { method: "GET", path: "/messages/:id" },
      { method: "GET", path: "/login" },
    ],
    payouts: pay,
  },
  {
    id: "pylon",
    index: "03",
    name: "Pylon Docs",
    host: "docs.pylon.lab",
    blurb: "A document portal with a file key and an import-from-URL action.",
    surface: "Files",
    inScope: ["docs.pylon.lab", "The docs prefix and the import action"],
    outOfScope: ["The cloud account behind the lab", "Third-party hosts"],
    endpoints: [
      { method: "GET", path: "/files" },
      { method: "POST", path: "/import" },
    ],
    payouts: pay,
  },
  {
    id: "kiln",
    index: "04",
    name: "Kiln Commerce",
    host: "shop.kiln.lab",
    blurb: "A shop with one blanket on the catalog and sequential order numbers.",
    surface: "Checkout",
    inScope: ["shop.kiln.lab", "Checkout and order reads"],
    outOfScope: ["Card networks", "Anything that is not this lab"],
    endpoints: [
      { method: "POST", path: "/checkout" },
      { method: "GET", path: "/orders/:id" },
    ],
    payouts: pay,
  },
  {
    id: "glass",
    index: "05",
    name: "Glass Admin",
    host: "admin.glass.lab",
    blurb: "An internal console, a password reset, and a JavaScript bundle.",
    surface: "Staff console",
    inScope: ["admin.glass.lab", "The console, reset flow, and shipped bundle"],
    outOfScope: ["Production identity providers", "Anything off this desk"],
    endpoints: [
      { method: "POST", path: "/console" },
      { method: "POST", path: "/reset" },
      { method: "GET", path: "/bundle.js" },
    ],
    payouts: pay,
  },
];

const PROBES: Record<string, Probe[]> = {
  harbor: [
    {
      id: "unauth",
      name: "Unauthenticated read",
      hypothesis: "Account reads might answer with no session at all.",
      run: () => {
        const result = harborGetAccount(null, "acct_1001");
        return {
          hit: false,
          log: `GET /v1/accounts/acct_1001 without a session → ${result.status}. Control holds.`,
        };
      },
    },
    {
      id: "idor",
      name: "Cross-account read",
      hypothesis: "The owner check on GET /v1/accounts/:id may be missing.",
      run: () => {
        const result = harborGetAccount("user_avery", "acct_1002");
        if (!result.leaked || !result.body) {
          return { hit: false, log: "Avery could not read Blake's account." };
        }
        return {
          hit: true,
          log: `200 owner=${result.body.owner} balance=${result.body.balance}. Avery's token was accepted.`,
          finding: draft({
            title: "Any customer can read another customer's account",
            severity: "high",
            cvss: "7.5",
            cwe: "CWE-639",
            asset: "api.harbor.lab GET /v1/accounts/:id",
            summary:
              "The account endpoint checks that a session exists, then returns whichever id was asked for. It never compares account.owner to the session. Avery's token retrieves Blake Okonkwo's balance and last-four.",
            steps: [
              "Sign in as Avery Chen (user_avery). The specimen does this for you.",
              "Request GET /v1/accounts/acct_1002 with Avery's session.",
              "Observe HTTP 200 and a body whose owner is user_blake.",
            ],
            impact:
              "Any customer can read every customer's balance and tax last-four. On a real ledger that is a confidentiality break, and the same missing check usually repeats on statements and transfers.",
            remediation:
              "After loading the account, reject the request unless account.owner is the authenticated user. Add a regression test that user A cannot read user B. Unguessable ids are defense in depth, not the control.",
            request: `GET /v1/accounts/acct_1002 HTTP/1.1
Host: api.harbor.lab
Authorization: Bearer sess_user_avery`,
            response: `HTTP/1.1 200\n${pretty(result.body)}`,
          }),
        };
      },
    },
    {
      id: "sqli",
      name: "Search injection",
      hypothesis: "The holder search might concatenate the query into SQL.",
      run: () => {
        const result = harborSearch("user_avery", "' OR 1=1 --");
        const leaked = result.ids.includes("acct_1002");
        return {
          hit: false,
          log: leaked
            ? "Search returned another customer's id."
            : `Search treated the quote as text. count=${result.count}. No injection.`,
        };
      },
    },
    {
      id: "mass",
      name: "Profile mass assignment",
      hypothesis: "PATCH /v1/me may copy kycTier off the client body.",
      run: () => {
        const result = harborPatchMe({ name: "Avery Chen", kycTier: "verified" });
        if (!result.escalated) {
          return { hit: false, log: "kycTier was ignored." };
        }
        return {
          hit: true,
          log: `Profile stored kycTier=${result.body.kycTier}. The client set a server flag.`,
          finding: draft({
            title: "Profile update copies kycTier from the client",
            severity: "high",
            cvss: "8.1",
            cwe: "CWE-915",
            asset: "api.harbor.lab PATCH /v1/me",
            summary:
              "PATCH /v1/me writes every string field from the body onto the profile, including kycTier. A basic customer can send kycTier=verified and the stored profile comes back verified.",
            steps: [
              "As Avery, send PATCH /v1/me with a body that includes kycTier set to verified.",
              "Read the response. kycTier is verified, not basic.",
            ],
            impact:
              "KYC state is an authorization boundary. A self-serve verified tier skips the identity checks that gate higher limits and withdrawals.",
            remediation:
              "Assign an allow-list — name, and nothing else. Never copy the request object onto a model that stores tiers, roles, or flags.",
            request: `PATCH /v1/me HTTP/1.1
Host: api.harbor.lab
Authorization: Bearer sess_user_avery

${pretty({ name: "Avery Chen", kycTier: "verified" })}`,
            response: `HTTP/1.1 200\n${pretty(result.body)}`,
          }),
        };
      },
    },
  ],
  northline: [
    {
      id: "plain",
      name: "Plain message",
      hypothesis: "A normal note should render as text, not as a script.",
      run: () => {
        const result = northlineRender("See you Thursday.");
        return {
          hit: false,
          log: result.executable
            ? "Plain text was treated as executable."
            : "Plain text is not executable. The sink is still innerHTML.",
        };
      },
    },
    {
      id: "xss",
      name: "Stored HTML sink",
      hypothesis: "Message bodies may be written into innerHTML.",
      run: () => {
        const payload = `<img src=x onerror=alert(1)>`;
        const result = northlineRender(payload);
        if (!result.executable) return { hit: false, log: "Payload was not treated as executable." };
        return {
          hit: true,
          log: "Body matches an executable HTML pattern and is scheduled for innerHTML.",
          finding: draft({
            title: "Stored message bodies render as HTML",
            severity: "high",
            cvss: "8.2",
            cwe: "CWE-79",
            asset: "app.northline.lab POST /messages",
            summary:
              "Messages are stored raw and the reader renders them with an HTML sink. A body carrying an element with an error handler would run in the recipient's session. This desk sandboxes the preview so the payload is shown, not executed.",
            steps: [
              "Compose a message whose body is an image tag with an onerror handler.",
              "Open the message. The specimen flags the body as executable and paints it through innerHTML inside a sandbox.",
            ],
            impact:
              "A sender can run script as whoever opens the mail: read the inbox, send further messages, ride the session. Stored XSS on a mail product is account takeover of the reader.",
            remediation:
              "Store and render plain text, or sanitize with a strict allow-list before display. Ship a CSP that blocks inline handlers. Do not assign message bodies to innerHTML.",
            request: `POST /messages HTTP/1.1
Host: app.northline.lab

${pretty({ from: "user_avery", body: payload })}`,
            response: `HTTP/1.1 200\n${pretty({ id: "msg_14", sink: result.sink, executable: true })}`,
          }),
        };
      },
    },
    {
      id: "relative",
      name: "Relative next",
      hypothesis: "A same-site next path should stay on the host.",
      run: () => {
        const result = northlineNext("/inbox");
        return {
          hit: false,
          log: result.offsite
            ? `Relative /inbox was treated as off-site (${result.location}).`
            : `next=/inbox stays on northline.lab. Location ${result.location}.`,
        };
      },
    },
    {
      id: "redirect",
      name: "Off-site next",
      hypothesis: "Login may redirect to whatever next contains.",
      run: () => {
        const next = "https://phish.example/northline";
        const result = northlineNext(next);
        if (!result.offsite) return { hit: false, log: "Off-site next was refused." };
        return {
          hit: true,
          log: `302 Location ${result.location}. The parameter left the host.`,
          finding: draft({
            title: "Login next parameter sends the browser off-site",
            severity: "medium",
            cvss: "6.1",
            cwe: "CWE-601",
            asset: "app.northline.lab GET /login",
            summary:
              "After login the app redirects to the next query value with no allow-list. An absolute URL leaves northline.lab entirely.",
            steps: [
              "Open login with next set to https://phish.example/northline.",
              "Read the Location the lab would send. It is the off-site URL.",
            ],
            impact:
              "Phishing that starts on a trusted host and lands on a lookalike after a genuine login. If a token is ever added to that redirect, it goes with the victim.",
            remediation:
              "Allow only relative paths that start with a single slash. Reject scheme-relative URLs and anything with a host.",
            request: `GET /login?next=${encodeURIComponent(next)} HTTP/1.1
Host: app.northline.lab`,
            response: `HTTP/1.1 302\nLocation: ${result.location}`,
          }),
        };
      },
    },
  ],
  pylon: [
    {
      id: "readme",
      name: "In-prefix read",
      hypothesis: "A normal document key should stay inside docs/.",
      run: () => {
        const result = pylonRead("readme.txt");
        return {
          hit: false,
          log: result.escaped
            ? `readme resolved outside docs (${result.key}).`
            : `200 ${result.key}. Still inside the prefix.`,
        };
      },
    },
    {
      id: "traversal",
      name: "Dot-dot file key",
      hypothesis: "Joining a user key onto docs/ may still honor .. segments.",
      run: () => {
        const result = pylonRead("../secrets/env");
        if (!result.escaped || result.status !== 200) {
          return { hit: false, log: `Traversal did not escape. key=${result.key}` };
        }
        return {
          hit: true,
          log: `Resolved key ${result.key}. Secret file returned.`,
          finding: draft({
            title: "File read resolves .. out of the docs prefix",
            severity: "high",
            cvss: "7.7",
            cwe: "CWE-22",
            asset: "docs.pylon.lab GET /files",
            summary:
              "The reader joins a caller-supplied name onto docs/ and then applies .. segments. ../secrets/env walks out of the prefix and returns the lab secret file.",
            steps: [
              "Request the file key ../secrets/env.",
              "Observe the resolved key secrets/env and a body that contains the lab secret.",
            ],
            impact:
              "Arbitrary read inside the bucket. A sibling prefix of secrets is enough to pivot. On a real host this is often the path to credentials and other tenants' documents.",
            remediation:
              "Resolve the path, then require the result to stay under docs/. Better: serve an allow-list of keys and reject any name that contains ..",
            request: `GET /files?name=../secrets/env HTTP/1.1
Host: docs.pylon.lab`,
            response: `HTTP/1.1 200\nX-Resolved-Key: ${result.key}\n\n${result.body}`,
          }),
        };
      },
    },
    {
      id: "cdn",
      name: "Allowed import host",
      hypothesis: "The CDN logo is the one import that should succeed cleanly.",
      run: () => {
        const result = pylonImport("https://cdn.pylon.lab/logo.png");
        return {
          hit: false,
          log: result.metadata
            ? "CDN import was treated as metadata."
            : `Import of ${result.host} returned the logo. Not link-local.`,
        };
      },
    },
    {
      id: "ssrf",
      name: "Metadata import",
      hypothesis: "Import may fetch a link-local metadata address.",
      run: () => {
        const target = "http://169.254.169.254/latest/meta-data/iam/security-credentials/pylon-lab-role";
        const result = pylonImport(target);
        if (!result.metadata) return { hit: false, log: "Metadata address was not fetched." };
        return {
          hit: true,
          log: `200 from ${result.host}. Role material came back in the body.`,
          finding: draft({
            title: "Import URL can reach the link-local metadata address",
            severity: "critical",
            cvss: "9.0",
            cwe: "CWE-918",
            asset: "docs.pylon.lab POST /import",
            summary:
              "Import fetches the URL the caller supplies. The link-local metadata address answers with lab role material. There is no allow-list and no block on link-local space.",
            steps: [
              "Import http://169.254.169.254/latest/meta-data/iam/security-credentials/pylon-lab-role.",
              "Compare with the CDN logo, the only host that should have worked.",
              "Read the body. It contains lab role material.",
            ],
            impact:
              "On a cloud host this request returns temporary credentials to the caller. From there the bucket, and anything that role can touch, is in play. The key in this lab is fake; the control is still missing.",
            remediation:
              "Allow only known HTTPS hosts. Block link-local, loopback, and private ranges after name resolution, and do not return the upstream body to the browser.",
            request: `POST /import HTTP/1.1
Host: docs.pylon.lab

${pretty({ url: target })}`,
            response: `HTTP/1.1 200\n\n${result.body}`,
          }),
        };
      },
    },
  ],
  kiln: [
    {
      id: "fair",
      name: "Catalog price",
      hypothesis: "An honest price should match the catalog.",
      run: () => {
        const result = kilnCheckout("wool-blanket", 8400);
        return {
          hit: false,
          log: result.tampered
            ? "Catalog price was marked tampered."
            : `Charged ${result.charged} cents, matching the catalog.`,
        };
      },
    },
    {
      id: "price",
      name: "Client price",
      hypothesis: "Checkout may trust priceCents from the browser.",
      run: () => {
        const result = kilnCheckout("wool-blanket", 100);
        if (!result.tampered) return { hit: false, log: "Server kept the catalog price." };
        return {
          hit: true,
          log: `Charged ${result.charged} cents. Catalog is ${result.catalog}.`,
          finding: draft({
            title: "Checkout charges the price sent by the browser",
            severity: "high",
            cvss: "8.2",
            cwe: "CWE-602",
            asset: "shop.kiln.lab POST /checkout",
            summary:
              "The catalog price of the wool blanket is 8400 cents. Checkout persists whatever priceCents the client posts. A request with 100 cents is accepted and charged.",
            steps: [
              "Place an order for wool-blanket with priceCents set to 100.",
              "Read charged on the order. It is 100, not 8400.",
            ],
            impact:
              "Direct loss on every order. The same trust usually extends to quantity, currency, and coupons.",
            remediation:
              "Look the price up on the server from the SKU. Ignore any price field on the request. Recompute totals from the catalog plus server-side discounts.",
            request: `POST /checkout HTTP/1.1
Host: shop.kiln.lab

${pretty({ sku: "wool-blanket", priceCents: 100 })}`,
            response: `HTTP/1.1 200\n${pretty({ orderId: result.orderId, charged: result.charged, catalog: result.catalog })}`,
          }),
        };
      },
    },
    {
      id: "own-order",
      name: "Own order",
      hypothesis: "Avery's own order should come back without a leak.",
      run: () => {
        const result = kilnGetOrder("user_avery", "1001");
        return {
          hit: false,
          log: result.leaked
            ? "Avery's own order was flagged as a leak."
            : "Order 1001 belongs to Avery. No cross-account read.",
        };
      },
    },
    {
      id: "order-idor",
      name: "Foreign order",
      hypothesis: "Sequential order ids may skip the owner check.",
      run: () => {
        const result = kilnGetOrder("user_avery", "1002");
        if (!result.leaked || !result.body) {
          return { hit: false, log: "Foreign order was not returned." };
        }
        return {
          hit: true,
          log: `200 owner=${result.body.owner}. Address included.`,
          finding: draft({
            title: "Sequential order ids return another customer's address",
            severity: "high",
            cvss: "7.1",
            cwe: "CWE-639",
            asset: "shop.kiln.lab GET /orders/:id",
            summary:
              "GET /orders/:id checks that a session exists, then returns the order. It does not check the owner. Order 1002 belongs to Blake and includes a street address.",
            steps: [
              "Sign in as Avery and request order 1002.",
              "The body owner is user_blake and the address is Blake's.",
            ],
            impact:
              "Names and shipping addresses for every order number you can count. Sequential ids make enumeration trivial.",
            remediation:
              "Scope the query by owner and id. Return 404 for both missing and not-yours so existence does not leak.",
            request: `GET /orders/1002 HTTP/1.1
Host: shop.kiln.lab
Authorization: Bearer sess_user_avery`,
            response: `HTTP/1.1 200\n${pretty(result.body)}`,
          }),
        };
      },
    },
  ],
  glass: [
    {
      id: "customer",
      name: "Customer role",
      hypothesis: "A customer role should not open the staff console.",
      run: () => {
        const result = glassConsole("customer");
        return {
          hit: false,
          log:
            result.status === 403
              ? "role=customer → 403. The check exists. Next question is what it trusts."
              : `role=customer → ${result.status}.`,
        };
      },
    },
    {
      id: "admin",
      name: "Client role",
      hypothesis: "The console may trust a role value from the browser.",
      run: () => {
        const result = glassConsole("admin");
        if (!result.bypass) return { hit: false, log: "Admin role from the client was refused." };
        return {
          hit: true,
          log: `200 panel=${result.panel} users=${result.users}. Role came from the client.`,
          finding: draft({
            title: "Admin console trusts a role value from the client",
            severity: "critical",
            cvss: "9.1",
            cwe: "CWE-269",
            asset: "admin.glass.lab POST /console",
            summary:
              "The staff console decides access from the role field supplied by the browser. Sending role=admin returns the staff panel. role=customer is refused, so a check exists — it is looking at the wrong place.",
            steps: [
              "Call the console as a customer with role set to admin.",
              "Observe HTTP 200 and the staff panel payload.",
            ],
            impact:
              "Staff access for any visitor who can set a field: user records, and whatever actions the panel proxies.",
            remediation:
              "Derive the role from the server session. Ignore role, isAdmin, and similar fields on the request. Authorize every staff route on the server, not only in the page.",
            request: `POST /console HTTP/1.1
Host: admin.glass.lab
Cookie: session=sess_user_avery

${pretty({ role: "admin" })}`,
            response: `HTTP/1.1 200\n${pretty({ panel: result.panel, users: result.users })}`,
          }),
        };
      },
    },
    {
      id: "reset",
      name: "Reset token",
      hypothesis: "Reset tokens may be derived from the user id.",
      run: () => {
        const issued = glassIssueReset("blake@glass.lab");
        const forged = btoa("user_blake");
        const redeemed = glassRedeem(forged);
        if (!issued.predictable || !redeemed.takeover || issued.token !== forged) {
          return { hit: false, log: "Reset token was not a pure function of the user id." };
        }
        return {
          hit: true,
          log: `Token ${issued.token} equals base64(user_blake) and redeems a session.`,
          finding: draft({
            title: "Password reset tokens are the base64 of the user id",
            severity: "critical",
            cvss: "9.4",
            cwe: "CWE-640",
            asset: "admin.glass.lab POST /reset",
            summary:
              "A reset for blake@glass.lab issues a token that is base64 of user_blake. Anyone can compute that token and redeem it for a session as Blake. No mailbox is required.",
            steps: [
              "Issue a reset for blake@glass.lab and note the token.",
              "Redeem it. The lab opens a session for user_blake.",
              "The same token can be produced without step 1 by encoding the user id.",
            ],
            impact:
              "Account takeover for any user whose id you know or can guess.",
            remediation:
              "Draw at least 128 bits from a CSPRNG, store only a hash, expire it in minutes, and bind it to the user on the server. Never derive the token from the user id.",
            request: `POST /reset HTTP/1.1
Host: admin.glass.lab

${pretty({ email: "blake@glass.lab" })}`,
            response: `HTTP/1.1 200\n${pretty({ token: issued.token, user: issued.user })}\n\nPOST /reset/redeem\n${pretty({ token: forged, session: "sess_user_blake" })}`,
          }),
        };
      },
    },
    {
      id: "bundle",
      name: "Bundle secret",
      hypothesis: "The shipped bundle may contain a secret-shaped value.",
      run: () => {
        const result = glassScanBundle();
        if (!result.secret) return { hit: false, log: "No secret-shaped value in the bundle." };
        return {
          hit: true,
          log: `Bundle contains ${result.secret.slice(0, 16)}… — lab-only, but it shipped to the browser.`,
          finding: draft({
            title: "Staff bundle ships a secret-shaped value",
            severity: "medium",
            cvss: "6.5",
            cwe: "CWE-798",
            asset: "admin.glass.lab GET /bundle.js",
            summary:
              "The client bundle includes a string shaped like a live secret key. In this lab the value is fake. The defect is that it lives in code every browser downloads. On a real program, confirm the key is live with the owner, and do not paste a working secret into a public report.",
            steps: [
              "Open the bundle specimen.",
              "Search for sk_live_. The lab string is there in full.",
            ],
            impact:
              "If the value were a real key, anyone who loads the page could spend it. Even a revoked-looking key in a bundle tells an attacker where else to look.",
            remediation:
              "Remove the secret from client code, rotate it, and restrict it server-side. Publish only a publishable key to the browser.",
            bountyLow: 500,
            bountyHigh: 2000,
            request: `GET /bundle.js HTTP/1.1
Host: admin.glass.lab`,
            response: GLASS_BUNDLE_SOURCE,
          }),
        };
      },
    },
  ],
};

export function getProgram(id: string) {
  return PROGRAMS.find((program) => program.id === id);
}

export function getProbes(id: string) {
  return PROBES[id] ?? [];
}

export const SOURCE_PROGRAM_ID = "source";
export const SOURCE_PROGRAM_NAME = "Pasted source";
