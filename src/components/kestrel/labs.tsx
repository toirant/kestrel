import { useState } from "react";
import { pretty } from "@/lib/kestrel/format";
import { useDesk } from "@/lib/kestrel/store";
import {
  GLASS_BUNDLE_SOURCE,
  glassConsole,
  glassIssueReset,
  glassRedeem,
  harborGetAccount,
  harborPatchMe,
  kilnCheckout,
  kilnGetOrder,
  northlineNext,
  northlineRender,
  pylonImport,
  pylonRead,
} from "@/lib/kestrel/runtime";
import { Button, Paper, TextArea, TextInput } from "./ui";

function Slip({
  label,
  value,
  bad,
}: {
  label: string;
  value: string;
  bad?: boolean;
}) {
  return (
    <div className="mt-4 space-y-2">
        <p className={bad ? "font-mono text-xs uppercase tracking-widest text-copper" : "font-mono text-xs uppercase tracking-widest text-muted"}>
        {label}
      </p>
      <Paper>{value}</Paper>
    </div>
  );
}

function Preset({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button tone="meta" onClick={onClick}>
      {label}
    </Button>
  );
}

export function HarborLab() {
  const world = useDesk((state) => state.world);
  const avery = world.harbor[0];
  const blake = world.harbor[1];
  const [accountId, setAccountId] = useState("acct_1001");
  const [accountOut, setAccountOut] = useState<string>("");
  const [leaked, setLeaked] = useState(false);
  const [tier, setTier] = useState("basic");
  const [profileOut, setProfileOut] = useState("");
  const [escalated, setEscalated] = useState(false);

  function read(id: string) {
    setAccountId(id);
    const result = harborGetAccount("user_avery", id);
    setLeaked(result.leaked);
    setAccountOut(
      result.body
        ? `HTTP ${result.status}\n${pretty(result.body)}`
        : `HTTP ${result.status}\nnot found`,
    );
  }

  function patch(kycTier: string) {
    setTier(kycTier);
    const result = harborPatchMe({ name: "Avery Chen", kycTier });
    setEscalated(result.escalated);
    setProfileOut(`HTTP ${result.status}\n${pretty(result.body)}`);
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="font-serif text-lg">Signed in as Avery Chen.</p>
        <p className="mt-1 text-muted">
          Her account is {avery.id}. Balance {avery.balance.toFixed(2)}, last four {avery.last4}. Blake is{" "}
          {blake.id}.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Preset label="Read Avery" onClick={() => read("acct_1001")} />
          <Preset label="Read Blake" onClick={() => read("acct_1002")} />
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <TextInput label="Account id" value={accountId} onChange={(event) => setAccountId(event.target.value)} />
          </div>
          <Button tone="quiet" onClick={() => read(accountId.trim())}>
            Fetch statement
          </Button>
        </div>
        {accountOut ? (
          <Slip label={leaked ? "Returned — not Avery's account" : "Returned"} value={accountOut} bad={leaked} />
        ) : null}
      </div>
      <div className="border-t border-line pt-6">
        <p className="font-serif text-lg">Profile patch</p>
        <p className="mt-1 text-muted">The request sends kycTier along with the name.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Preset label="Keep basic" onClick={() => patch("basic")} />
          <Preset label="Send verified" onClick={() => patch("verified")} />
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <TextInput label="kycTier" value={tier} onChange={(event) => setTier(event.target.value)} />
          </div>
          <Button tone="quiet" onClick={() => patch(tier.trim() || "basic")}>
            Patch profile
          </Button>
        </div>
        {profileOut ? (
          <Slip label={escalated ? "Tier changed by the client" : "Profile"} value={profileOut} bad={escalated} />
        ) : null}
      </div>
    </div>
  );
}

export function NorthlineLab() {
  const [body, setBody] = useState("See you Thursday.");
  const [rendered, setRendered] = useState<ReturnType<typeof northlineRender> | null>(null);
  const [next, setNext] = useState("/inbox");
  const [redirect, setRedirect] = useState<ReturnType<typeof northlineNext> | null>(null);

  function store(value: string) {
    setBody(value);
    setRendered(northlineRender(value));
  }

  function follow(value: string) {
    setNext(value);
    setRedirect(northlineNext(value));
  }

  const doc = rendered
    ? `<!doctype html><html><body style="margin:0;padding:12px;font:18px Georgia,serif;color:#12140f;background:#f3efe4">${rendered.body}</body></html>`
    : "";

  return (
    <div className="space-y-8">
      <div>
        <p className="font-serif text-lg">Compose a message</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Preset label="Plain note" onClick={() => store("See you Thursday.")} />
          <Preset label="Image handler" onClick={() => store("<img src=x onerror=alert(1)>")} />
        </div>
        <div className="mt-4">
          <TextArea label="Body" value={body} onChange={(event) => setBody(event.target.value)} />
        </div>
        <div className="mt-3">
          <Button tone="quiet" onClick={() => store(body)}>
            Store and render
          </Button>
        </div>
        {rendered ? (
          <>
            <p className="mt-4 font-mono text-xs uppercase tracking-widest text-muted">
              {rendered.executable ? "Executable pattern — sandboxed so it cannot run here" : "Not executable"}
              {" · sink "}
              {rendered.sink}
            </p>
            <iframe title="Rendered message" sandbox="" srcDoc={doc} className="mt-2 h-28 w-full border border-line bg-paper" />
          </>
        ) : null}
      </div>
      <div className="border-t border-line pt-6">
        <p className="font-serif text-lg">Where login sends you</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Preset label="Stay in inbox" onClick={() => follow("/inbox")} />
          <Preset label="Leave the host" onClick={() => follow("https://phish.example/northline")} />
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <TextInput label="next" value={next} onChange={(event) => setNext(event.target.value)} />
          </div>
          <Button tone="quiet" onClick={() => follow(next)}>
            Follow
          </Button>
        </div>
        {redirect ? (
          <Slip
            label={redirect.offsite ? "Off-site location" : "Stays on northline.lab"}
            value={`HTTP 302\nLocation: ${redirect.location}`}
            bad={redirect.offsite}
          />
        ) : null}
      </div>
    </div>
  );
}

export function PylonLab() {
  const [file, setFile] = useState("readme.txt");
  const [fileOut, setFileOut] = useState("");
  const [escaped, setEscaped] = useState(false);
  const [url, setUrl] = useState("https://cdn.pylon.lab/logo.png");
  const [urlOut, setUrlOut] = useState("");
  const [metadata, setMetadata] = useState(false);

  function read(name: string) {
    setFile(name);
    const result = pylonRead(name);
    setEscaped(result.escaped && result.status === 200);
    setFileOut(`HTTP ${result.status}\nresolved: ${result.key}\n\n${result.body}`);
  }

  function pull(target: string) {
    setUrl(target);
    const result = pylonImport(target);
    setMetadata(result.metadata);
    setUrlOut(`HTTP ${result.status}\nhost: ${result.host || "—"}\n\n${result.body}`);
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="font-serif text-lg">Open a document</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Preset label="Readme" onClick={() => read("readme.txt")} />
          <Preset label="Step out of docs" onClick={() => read("../secrets/env")} />
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <TextInput label="File key" value={file} onChange={(event) => setFile(event.target.value)} />
          </div>
          <Button tone="quiet" onClick={() => read(file)}>
            Open
          </Button>
        </div>
        {fileOut ? <Slip label={escaped ? "Left the docs prefix" : "File"} value={fileOut} bad={escaped} /> : null}
      </div>
      <div className="border-t border-line pt-6">
        <p className="font-serif text-lg">Import from a URL</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Preset label="CDN logo" onClick={() => pull("https://cdn.pylon.lab/logo.png")} />
          <Preset label="Metadata address" onClick={() => pull("http://169.254.169.254/latest/meta-data/iam/security-credentials/pylon-lab-role")} />
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <TextInput label="URL" value={url} onChange={(event) => setUrl(event.target.value)} />
          </div>
          <Button tone="quiet" onClick={() => pull(url)}>
            Import
          </Button>
        </div>
        {urlOut ? <Slip label={metadata ? "Link-local answered" : "Import"} value={urlOut} bad={metadata} /> : null}
      </div>
    </div>
  );
}

export function KilnLab() {
  const world = useDesk((state) => state.world);
  const catalogDollars = (world.kilnPrice / 100).toFixed(2);
  const [price, setPrice] = useState("84.00");
  const [orderOut, setOrderOut] = useState("");
  const [tampered, setTampered] = useState(false);
  const [orderId, setOrderId] = useState("1001");
  const [readOut, setReadOut] = useState("");
  const [leaked, setLeaked] = useState(false);

  function buy(dollars: string) {
    setPrice(dollars);
    const cents = Math.round(Number(dollars) * 100);
    if (!Number.isFinite(cents)) {
      setOrderOut("Enter a price in dollars.");
      setTampered(false);
      return;
    }
    const result = kilnCheckout("wool-blanket", cents);
    setTampered(result.tampered);
    setOrderOut(
      `HTTP ${result.status}\ncatalog: ${result.catalog} cents\ncharged: ${result.charged} cents\norder: ${result.orderId}`,
    );
  }

  function read(id: string) {
    setOrderId(id);
    const result = kilnGetOrder("user_avery", id);
    setLeaked(result.leaked);
    setReadOut(result.body ? `HTTP ${result.status}\n${pretty(result.body)}` : `HTTP ${result.status}`);
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="font-serif text-lg">Wool blanket, catalog ${catalogDollars}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Preset label="Pay the catalog" onClick={() => buy(catalogDollars)} />
          <Preset label="Pay $1.00" onClick={() => buy("1.00")} />
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <TextInput label="Price sent by the browser" value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" />
          </div>
          <Button tone="quiet" onClick={() => buy(price)}>
            Place order
          </Button>
        </div>
        {orderOut ? <Slip label={tampered ? "Charged the client price" : "Checkout"} value={orderOut} bad={tampered} /> : null}
      </div>
      <div className="border-t border-line pt-6">
        <p className="font-serif text-lg">Signed in as Avery. Her order is 1001.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Preset label="Order 1001" onClick={() => read("1001")} />
          <Preset label="Order 1002" onClick={() => read("1002")} />
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <TextInput label="Order id" value={orderId} onChange={(event) => setOrderId(event.target.value)} />
          </div>
          <Button tone="quiet" onClick={() => read(orderId.trim())}>
            Look up
          </Button>
        </div>
        {readOut ? <Slip label={leaked ? "Another customer's order" : "Order"} value={readOut} bad={leaked} /> : null}
      </div>
    </div>
  );
}

export function GlassLab() {
  const [role, setRole] = useState("customer");
  const [consoleOut, setConsoleOut] = useState("");
  const [bypass, setBypass] = useState(false);
  const [email, setEmail] = useState("blake@glass.lab");
  const [token, setToken] = useState("");
  const [resetOut, setResetOut] = useState("");
  const [takeover, setTakeover] = useState(false);

  function open(nextRole: string) {
    setRole(nextRole);
    const result = glassConsole(nextRole);
    setBypass(result.bypass);
    setConsoleOut(
      result.bypass
        ? `HTTP ${result.status}\n${pretty({ panel: result.panel, users: result.users })}`
        : `HTTP ${result.status}\nstaff only`,
    );
  }

  function issue(nextEmail: string) {
    setEmail(nextEmail);
    const issued = glassIssueReset(nextEmail);
    setToken(issued.token);
    setTakeover(false);
    setResetOut(
      issued.status === 200
        ? `HTTP 200\n${pretty({ email: nextEmail, token: issued.token, user: issued.user })}`
        : "No such mailbox in the lab.",
    );
  }

  function redeem(value: string) {
    const result = glassRedeem(value);
    setTakeover(result.takeover);
    setResetOut(
      result.takeover
        ? `HTTP 200\n${pretty({ resetFor: result.user, session: `sess_${result.user}` })}`
        : `HTTP ${result.status}\nbad token`,
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="font-serif text-lg">Staff console</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Preset label="Role customer" onClick={() => open("customer")} />
          <Preset label="Role admin" onClick={() => open("admin")} />
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <TextInput label="role sent by the browser" value={role} onChange={(event) => setRole(event.target.value)} />
          </div>
          <Button tone="quiet" onClick={() => open(role.trim())}>
            Open console
          </Button>
        </div>
        {consoleOut ? <Slip label={bypass ? "Staff panel opened" : "Console"} value={consoleOut} bad={bypass} /> : null}
      </div>
      <div className="border-t border-line pt-6">
        <p className="font-serif text-lg">Password reset</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Preset label="Reset Blake" onClick={() => issue("blake@glass.lab")} />
          <Preset label="Redeem forged token" onClick={() => redeem(btoa("user_blake"))} />
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <TextInput label="Mailbox" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <Button tone="quiet" onClick={() => issue(email.trim())}>
            Issue token
          </Button>
        </div>
        {token ? (
          <div className="mt-3">
            <Button tone="meta" onClick={() => redeem(token)}>
              Redeem issued token
            </Button>
          </div>
        ) : null}
        {resetOut ? <Slip label={takeover ? "Session issued" : "Reset"} value={resetOut} bad={takeover} /> : null}
      </div>
      <div className="border-t border-line pt-6">
        <p className="font-serif text-lg">Shipped bundle</p>
        <Paper className="mt-3">{GLASS_BUNDLE_SOURCE}</Paper>
      </div>
    </div>
  );
}

const LABS = {
  harbor: HarborLab,
  northline: NorthlineLab,
  pylon: PylonLab,
  kiln: KilnLab,
  glass: GlassLab,
};

export function Lab({ programId }: { programId: string }) {
  const View = LABS[programId as keyof typeof LABS];
  if (!View) return null;
  return <View />;
}
