import assert from "node:assert/strict";
import { decodeValue, encodeValue, TursoClient } from "./client.ts";

// Fake fetch: remembers the request body and answers with a fixed response
interface SentBody {
  requests: {
    type: string;
    stmt?: { args: unknown[] };
    batch?: { steps: { stmt: { sql: string }; condition?: unknown }[] };
  }[];
}

function fakeFetch(answer: unknown, status = 200) {
  const calls: { url: string; body: SentBody }[] = [];
  const fn = ((url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)) });
    return Promise.resolve(
      new Response(JSON.stringify(answer), { status }),
    );
  }) as unknown as typeof fetch;
  return { fn, calls };
}

Deno.test("values are encoded with their SQL type", () => {
  assert.deepEqual(encodeValue(42), { type: "integer", value: "42" });
  assert.deepEqual(encodeValue(1.5), { type: "float", value: 1.5 });
  assert.deepEqual(encodeValue("ssd"), { type: "text", value: "ssd" });
  assert.deepEqual(encodeValue(null), { type: "null" });
  assert.deepEqual(encodeValue(undefined), { type: "null" });
});

Deno.test("integers come back as numbers", () => {
  assert.equal(decodeValue({ type: "integer", value: "119990" }), 119990);
  assert.equal(decodeValue({ type: "null" }), null);
});

Deno.test("execute sends the SQL and turns rows into objects", async () => {
  const { fn, calls } = fakeFetch({
    results: [
      {
        type: "ok",
        response: {
          type: "execute",
          result: {
            cols: [{ name: "id" }, { name: "name" }],
            rows: [[{ type: "integer", value: "7" }, {
              type: "text",
              value: "PC Express",
            }]],
            affected_row_count: 0,
            last_insert_rowid: null,
          },
        },
      },
      { type: "ok", response: { type: "close" } },
    ],
  });
  const db = new TursoClient("https://db.example", "token", fn);

  const result = await db.execute("SELECT id, name FROM stores WHERE id = ?", [
    7,
  ]);

  assert.deepEqual(result.rows, [{ id: 7, name: "PC Express" }]);
  assert.equal(calls[0].url, "https://db.example/v2/pipeline");
  assert.deepEqual(calls[0].body.requests[0].stmt?.args, [{
    type: "integer",
    value: "7",
  }]);
  assert.equal(calls[0].body.requests.at(-1)?.type, "close");
});

Deno.test("a database error becomes an exception", async () => {
  const { fn } = fakeFetch({
    results: [{ type: "error", error: { message: "no such table: nope" } }],
  });
  const db = new TursoClient("https://db.example", "token", fn);
  await assert.rejects(() => db.execute("SELECT * FROM nope"), /no such table/);
});

Deno.test("batch wraps the statements in a transaction with rollback", async () => {
  const ok = {
    cols: [],
    rows: [],
    affected_row_count: 1,
    last_insert_rowid: "1",
  };
  const { fn, calls } = fakeFetch({
    results: [
      {
        type: "ok",
        response: {
          type: "batch",
          result: {
            step_results: [ok, ok, ok, ok, null],
            step_errors: [null, null, null, null, null],
          },
        },
      },
    ],
  });
  const db = new TursoClient("https://db.example", "token", fn);

  const results = await db.batch([{ sql: "INSERT A" }, { sql: "INSERT B" }]);

  const steps = calls[0].body.requests[0].batch?.steps ?? [];
  assert.deepEqual(steps.map((s) => s.stmt.sql), [
    "BEGIN",
    "INSERT A",
    "INSERT B",
    "COMMIT",
    "ROLLBACK",
  ]);
  assert.deepEqual(steps[2].condition, { type: "ok", step: 1 });
  assert.deepEqual(steps[4].condition, {
    type: "not",
    cond: { type: "ok", step: 3 },
  });
  assert.equal(results.length, 2);
});

Deno.test("an HTTP error (for example a wrong token) is reported", async () => {
  const { fn } = fakeFetch({ error: "unauthorized" }, 401);
  const db = new TursoClient("https://db.example", "bad", fn);
  await assert.rejects(() => db.execute("SELECT 1"), /401/);
});
