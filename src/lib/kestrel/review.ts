import type { Severity } from "./types";

export type ReviewHit = {
  ruleId: string;
  line: number;
  snippet: string;
  severity: Severity;
  cwe: string;
  cvss: string;
  title: string;
  summary: string;
  impact: string;
  remediation: string;
  bountyLow: number;
  bountyHigh: number;
};

type Rule = {
  id: string;
  severity: Severity;
  cwe: string;
  cvss: string;
  title: string;
  summary: string;
  impact: string;
  remediation: string;
  bountyLow: number;
  bountyHigh: number;
  test: (line: string) => boolean;
};

const RULES: Rule[] = [
  {
    id: "sqli",
    severity: "critical",
    cwe: "CWE-89",
    cvss: "9.1",
    title: "Query is built by concatenating request data",
    summary:
      "A SQL statement on this line is assembled with request data. The database will treat that data as syntax, not as a value.",
    impact: "Read or change rows the caller should not see, and sometimes run further statements.",
    remediation: "Use a parameterized query. Keep the SQL text constant and bind values separately.",
    bountyLow: 3000,
    bountyHigh: 10000,
    test: (line) =>
      /\b(SELECT|INSERT|UPDATE|DELETE|UNION)\b/i.test(line) &&
      /(\$\{|\+\s*(req\.|request\.|params|query|input|user|args|form)|\b(req\.|request\.)\w*)/i.test(line),
  },
  {
    id: "xss",
    severity: "high",
    cwe: "CWE-79",
    cvss: "8.2",
    title: "Markup from data is written into an HTML sink",
    summary:
      "This line assigns data to an HTML sink. If that data can include tags or handlers, it runs as the victim.",
    impact: "Script execution in the reader's session.",
    remediation: "Render text, or sanitize with a strict allow-list. Do not use innerHTML for content you did not create.",
    bountyLow: 1500,
    bountyHigh: 6000,
    test: (line) =>
      /dangerouslySetInnerHTML|\.innerHTML\s*=|document\.write\s*\(|\bv-html\b/.test(line),
  },
  {
    id: "redirect",
    severity: "medium",
    cwe: "CWE-601",
    cvss: "6.1",
    title: "Redirect target comes from the request",
    summary: "The redirect location is taken from the request with no host allow-list visible on this line.",
    impact: "A trusted host can be used as a springboard onto a phishing site.",
    remediation: "Allow only relative paths that start with a single slash.",
    bountyLow: 400,
    bountyHigh: 1500,
    test: (line) =>
      /\bredirect\s*\([^)]*(req\.|request\.|params|query)/i.test(line) ||
      /location\s*=\s*(req\.|request\.)/i.test(line),
  },
  {
    id: "mass",
    severity: "high",
    cwe: "CWE-915",
    cvss: "8.1",
    title: "Request body is copied onto a stored object",
    summary:
      "The request body is assigned onto a model. Fields the UI never shows — roles, tiers, prices — still get written.",
    impact: "A caller can set server-owned fields.",
    remediation: "Copy an allow-list of fields. Never assign the body object itself.",
    bountyLow: 1500,
    bountyHigh: 6000,
    test: (line) =>
      /Object\.assign\s*\([^)]*req\.body/.test(line) ||
      /\.\.\.req\.body/.test(line) ||
      /\.update\s*\(\s*req\.body/.test(line),
  },
  {
    id: "secret",
    severity: "high",
    cwe: "CWE-798",
    cvss: "7.5",
    title: "Secret-shaped value is in the source",
    summary:
      "This line contains a hardcoded credential or a live-key prefix. If the value is real, rotate it before you file, and do not paste the raw secret into a public report.",
    impact: "Anyone with the source or the bundle can use the credential.",
    remediation: "Load secrets from a server-side store. Rotate anything that already shipped.",
    bountyLow: 500,
    bountyHigh: 4000,
    test: (line) =>
      /sk_live_[0-9A-Za-z]{8,}/.test(line) ||
      /AKIA[0-9A-Z]{16}/.test(line) ||
      /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(line) ||
      /ghp_[A-Za-z0-9]{20,}/.test(line),
  },
  {
    id: "ssrf",
    severity: "high",
    cwe: "CWE-918",
    cvss: "8.6",
    title: "Outbound request uses a caller-supplied URL",
    summary: "The server fetches a URL that comes from the request. Nothing on this line restricts the host.",
    impact: "The server can be turned toward metadata addresses, internal admin ports, or other tenants.",
    remediation: "Allow-list HTTPS hosts. Block link-local, loopback, and private ranges after resolution.",
    bountyLow: 2000,
    bountyHigh: 8000,
    test: (line) =>
      /requests\.(get|post|put|delete)\s*\(\s*(request|url|user|target)/i.test(line) ||
      /fetch\s*\(\s*(req\.|request\.|params|user|input|body|url)/.test(line) ||
      /axios\.(get|post)\s*\(\s*(req|url|user|target)/.test(line),
  },
  {
    id: "deserialize",
    severity: "critical",
    cwe: "CWE-502",
    cvss: "9.8",
    title: "Untrusted bytes are deserialized",
    summary:
      "pickle.loads, yaml.load, or eval runs on data. Those parsers can construct objects, not just values.",
    impact: "Code execution on the server if an attacker can choose the bytes.",
    remediation: "Refuse pickle from the network. Use yaml.safe_load. Do not eval request data.",
    bountyLow: 4000,
    bountyHigh: 12000,
    test: (line) =>
      /pickle\.loads\s*\(/.test(line) ||
      (/yaml\.load\s*\(/.test(line) && !/safe_load|SafeLoader/.test(line)) ||
      /\beval\s*\(/.test(line) ||
      /new\s+Function\s*\(/.test(line),
  },
  {
    id: "path",
    severity: "high",
    cwe: "CWE-22",
    cvss: "7.5",
    title: "File path includes request data",
    summary: "A filesystem read is built from request data. .. segments can leave the intended directory.",
    impact: "Read of secrets, source, or other users' files.",
    remediation: "Resolve the path and require it to stay under a fixed prefix, or use an allow-list of keys.",
    bountyLow: 1500,
    bountyHigh: 5000,
    test: (line) =>
      /(os\.ReadFile|ioutil\.ReadFile|readFile|createReadStream|sendFile|path\.join)\s*\(/.test(line) &&
      /(\+|\$\{|r\.URL|req\.|request\.|params|query|user)/.test(line),
  },
  {
    id: "cmd",
    severity: "critical",
    cwe: "CWE-78",
    cvss: "9.8",
    title: "A shell command includes request data",
    summary: "Command text is built with request data and handed to a shell or exec.",
    impact: "Whoever can call this route can run commands as the server.",
    remediation: "Do not pass user data to a shell. Use an argument array, and allow-list the values.",
    bountyLow: 4000,
    bountyHigh: 15000,
    test: (line) =>
      (/exec\.Command\s*\(/.test(line) && /(\+|\$\{|r\.URL|req\.|Query\()/.test(line)) ||
      (/child_process|\bexec(?:Sync)?\s*\(/.test(line) && /(\+|\$\{)/.test(line)) ||
      (/os\.system\s*\(|subprocess\.(call|run|Popen|getoutput)\s*\(/.test(line) &&
        /(\+|f["']|%|format\s*\()/.test(line)),
  },
  {
    id: "jwt",
    severity: "critical",
    cwe: "CWE-347",
    cvss: "9.1",
    title: "Token verification allows the none algorithm or skips verify",
    summary: "The verifier accepts alg=none, or verification is turned off. A caller can mint their own token.",
    impact: "Authentication bypass.",
    remediation: "Allow only the algorithms you sign with. Always verify the signature.",
    bountyLow: 3000,
    bountyHigh: 10000,
    test: (line) => /algorithms\s*:\s*\[[^\]]*none/i.test(line) || /verify\s*:\s*false/.test(line),
  },
  {
    id: "random",
    severity: "medium",
    cwe: "CWE-330",
    cvss: "6.5",
    title: "A security token uses Math.random",
    summary: "Math.random is not a cryptographic generator. Tokens built from it can be predicted.",
    impact: "Guessable reset links, sessions, or nonces.",
    remediation: "Use crypto.randomBytes or crypto.getRandomValues.",
    bountyLow: 400,
    bountyHigh: 1500,
    test: (line) =>
      /Math\.random\s*\(/.test(line) && /token|secret|reset|session|nonce/i.test(line),
  },
];

function isComment(line: string) {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("--")
  );
}

export function reviewSource(code: string): ReviewHit[] {
  const hits: ReviewHit[] = [];
  const lines = code.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (!line.trim() || isComment(line)) return;
    for (const rule of RULES) {
      if (!rule.test(line)) continue;
      hits.push({
        ruleId: rule.id,
        line: index + 1,
        snippet: line.trim().slice(0, 240),
        severity: rule.severity,
        cwe: rule.cwe,
        cvss: rule.cvss,
        title: rule.title,
        summary: rule.summary,
        impact: rule.impact,
        remediation: rule.remediation,
        bountyLow: rule.bountyLow,
        bountyHigh: rule.bountyHigh,
      });
    }
  });
  return hits;
}

export type Sample = { id: string; label: string; code: string };

export const SAMPLES: Sample[] = [
  {
    id: "express",
    label: "Express API",
    code: `const stripe = "sk_live_labonly1";

app.get("/accounts/:id", async (req, res) => {
  const account = await db.query("SELECT * FROM accounts WHERE id = '" + req.params.id + "'");
  res.json(account.rows[0]);
});

app.patch("/me", (req, res) => {
  const profile = Object.assign(db.users[req.user.id], req.body);
  res.json(profile);
});

app.get("/go", (req, res) => {
  res.redirect(req.query.next);
});`,
  },
  {
    id: "react",
    label: "React sink",
    code: `export function Comment({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}`,
  },
  {
    id: "python",
    label: "Python service",
    code: `import pickle, requests, yaml

@app.route("/session")
def restore():
    return pickle.loads(request.data)

@app.route("/import")
def pull():
    return requests.get(request.args.get("url"), timeout=3).text

@app.route("/cfg")
def cfg():
    return yaml.load(request.files["f"])
`,
  },
  {
    id: "go",
    label: "Go handler",
    code: `func readDoc(w http.ResponseWriter, r *http.Request) {
    data, _ := os.ReadFile("/var/docs/" + r.URL.Query().Get("file"))
    w.Write(data)
}

func ping(w http.ResponseWriter, r *http.Request) {
    out, _ := exec.Command("sh", "-c", "ping -c 1 " + r.URL.Query().Get("host")).Output()
    w.Write(out)
}
`,
  },
];
