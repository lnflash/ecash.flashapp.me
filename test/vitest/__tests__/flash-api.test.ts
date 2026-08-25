// @vitest-environment node
/**
 * ecash.flashapp.me — Live API integration tests
 * Runs in Node.js environment (no CORS restrictions, native fetch)
 */

import { describe, test, expect } from "vitest";

const BASE_URL = "https://ecash.flashapp.me";
const MINT_URL = "https://forge.flashapp.me";

describe("API integration — live ecash.flashapp.me", () => {
  test("GET / returns 200", async () => {
    const res = await fetch(BASE_URL + "/");
    expect(res.ok).toBe(true);
    expect(res.status).toBe(200);
  }, 10000);

  test("GET /api/wallets returns 10 agents", async () => {
    const res = await fetch(BASE_URL + "/api/wallets");
    expect(res.ok).toBe(true);
    const d = await res.json();
    expect(Array.isArray(d.wallets)).toBe(true);
    expect(d.wallets.length).toBe(10);
    const names = d.wallets.map((w: { id: string }) => w.id);
    for (const n of ["patoo", "vandana", "pulse", "sparks"]) {
      expect(names).toContain(n);
    }
  }, 10000);

  test("GET /.well-known/lnurlp/vandana returns valid payRequest", async () => {
    const res = await fetch(BASE_URL + "/.well-known/lnurlp/vandana");
    expect(res.ok).toBe(true);
    const d = await res.json();
    expect(d.tag).toBe("payRequest");
    expect(d.callback).toContain("vandana");
    expect(d.minSendable).toBe(1000);
    expect(d.maxSendable).toBeGreaterThan(0);
    const meta = JSON.parse(d.metadata);
    const identifier = meta.find((e: string[]) => e[0] === "text/identifier");
    expect(identifier).toBeDefined();
    expect(identifier[1]).toBe("vandana@ecash.flashapp.me");
  }, 10000);

  test("LNURL callback ?amount=1000 returns bolt11 invoice", async () => {
    const res = await fetch(
      BASE_URL + "/.well-known/lnurlp/vandana?amount=1000"
    );
    expect(res.ok).toBe(true);
    const d = await res.json();
    expect(d.pr).toBeDefined();
    expect((d.pr as string).startsWith("lnbc")).toBe(true);
  }, 10000);

  test("LNURL callback rejects sub-minimum amount", async () => {
    const res = await fetch(
      BASE_URL + "/.well-known/lnurlp/vandana?amount=500"
    );
    const d = await res.json();
    expect(d.status).toBe("ERROR");
  }, 10000);

  test("unknown username returns ERROR status", async () => {
    const res = await fetch(BASE_URL + "/.well-known/lnurlp/zzznobody99999");
    const d = await res.json();
    expect(d.status).toBe("ERROR");
  }, 10000);

  test("POST /api/register rejects invalid npub", async () => {
    const res = await fetch(BASE_URL + "/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "testregcheck", npub: "not-an-npub" }),
    });
    const d = await res.json();
    expect(d.ok).toBe(false);
  }, 10000);

  test("GET /api/check/vandana returns available: false (agent reserved)", async () => {
    const res = await fetch(BASE_URL + "/api/check/vandana");
    expect(res.ok).toBe(true);
    const d = await res.json();
    expect(typeof d.available).toBe("boolean");
    expect(d.available).toBe(false);
  }, 10000);

  test("GET /api/check for fresh unused name returns available: true", async () => {
    const name = "zzztestname" + Date.now();
    const res = await fetch(BASE_URL + "/api/check/" + name);
    expect(res.ok).toBe(true);
    const d = await res.json();
    expect(d.available).toBe(true);
  }, 10000);

  test("GET /api/history/pulse returns valid structure", async () => {
    const res = await fetch(BASE_URL + "/api/history/pulse");
    expect(res.ok).toBe(true);
    const d = await res.json();
    expect(d.ownerId).toBe("pulse");
    expect(Array.isArray(d.history)).toBe(true);
    if (d.history.length > 0) {
      const tx = d.history[0];
      expect(["receive", "send"]).toContain(tx.type);
      expect(tx.amount).toBeGreaterThan(0);
      expect(tx.ts).toBeDefined();
    }
  }, 10000);

  test("forge mint /v1/info is reachable and supports P2PK", async () => {
    const res = await fetch(MINT_URL + "/v1/info");
    expect(res.ok).toBe(true);
    const d = await res.json();
    expect(d.nuts).toBeDefined();
    expect(d.nuts["4"]).toBeDefined(); // mint bolt11
    expect(d.nuts["5"]).toBeDefined(); // melt bolt11
    expect(d.nuts["10"]?.supported).toBe(true); // arbitrary secrets
    expect(d.nuts["11"]?.supported).toBe(true); // P2PK
  }, 10000);

  test("forge mint can create a receive invoice (0 sats = any amount)", async () => {
    const res = await fetch(MINT_URL + "/v1/mint/quote/bolt11", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 100, unit: "sat" }),
    });
    expect(res.ok).toBe(true);
    const d = await res.json();
    expect(d.quote).toBeDefined();
    expect((d.request as string).startsWith("lnbc")).toBe(true);
    expect(d.state).toBe("UNPAID");
    expect(d.expiry).toBeGreaterThan(Date.now() / 1000);
  }, 10000);

  test("forge mint quote state check returns UNPAID for fresh quote", async () => {
    const quoteRes = await fetch(MINT_URL + "/v1/mint/quote/bolt11", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 1, unit: "sat" }),
    });
    const quote = await quoteRes.json();
    const checkRes = await fetch(
      MINT_URL + "/v1/mint/quote/bolt11/" + quote.quote
    );
    expect(checkRes.ok).toBe(true);
    const check = await checkRes.json();
    expect(check.state).toBe("UNPAID");
    expect(check.quote).toBe(quote.quote);
  }, 15000);

  test("POST /api/register upserts existing user with new npub", async () => {
    // Re-register dread with known npub — server should upsert, not error
    const res = await fetch(BASE_URL + "/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "dread",
        npub: "npub1lng57tm2klq3gwtegqdyd7qg4x7uya5zkxmhevlkuyssljf97d9q5v2j6e",
      }),
    });
    const d = await res.json();
    expect(d.ok).toBe(true);
    expect(d.address).toBe("dread@ecash.flashapp.me");
  }, 10000);
});
