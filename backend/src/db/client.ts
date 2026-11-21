// Minimal client for Turso (libSQL) over its HTTP API: POST {url}/v2/pipeline.
// It uses plain fetch and no npm packages, so the same code runs in Deno (local
// server and scrapers) and in Node (the Vercel Function).
// Protocol reference: https://docs.turso.tech/sdk/http/reference
import { readEnv } from "../config/env.ts";

export type SqlValue = string | number | null;
export type Row = Record<string, SqlValue>;

export interface Statement {
  sql: string;
  args?: (SqlValue | undefined)[];
}

export interface ExecuteResult {
  rows: Row[];
  rowsAffected: number;
  lastInsertRowid: number | null;
}

// Values travel as typed JSON objects; integers are strings to avoid precision loss
type WireValue =
  | { type: "null" }
  | { type: "integer"; value: string }
  | { type: "float"; value: number }
  | { type: "text"; value: string }
  | { type: "blob"; base64: string };

interface WireResult {
  cols: { name: string }[];
  rows: WireValue[][];
  affected_row_count: number;
  last_insert_rowid: string | null;
}

type PipelineResult =
  | { type: "ok"; response: { type: string; result?: unknown } }
  | { type: "error"; error: { message: string } };

interface BatchResult {
  step_results: (WireResult | null)[];
  step_errors: ({ message: string } | null)[];
}

export function encodeValue(value: SqlValue | undefined): WireValue {
  if (value === null || value === undefined) return { type: "null" };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { type: "integer", value: String(value) }
      : { type: "float", value };
  }
  return { type: "text", value };
}

export function decodeValue(value: WireValue): SqlValue {
  switch (value.type) {
    case "null":
      return null;
    case "integer":
      return Number(value.value);
    case "float":
      return value.value;
    case "text":
      return value.value;
    case "blob":
      return value.base64;
  }
}

function toWireStatement(statement: Statement) {
  return {
    sql: statement.sql,
    args: (statement.args ?? []).map(encodeValue),
  };
}

function toResult(result: WireResult): ExecuteResult {
  const names = result.cols.map((col) => col.name);
  return {
    rows: result.rows.map((row) =>
      Object.fromEntries(row.map((value, i) => [names[i], decodeValue(value)]))
    ),
    rowsAffected: result.affected_row_count,
    lastInsertRowid: result.last_insert_rowid === null
      ? null
      : Number(result.last_insert_rowid),
  };
}

function unwrap(result: PipelineResult) {
  if (result.type === "error") throw new Error(result.error.message);
  return result.response;
}

export class TursoClient {
  constructor(
    private readonly url: string,
    private readonly authToken: string,
    // Injectable so the tests can replace the network with a fake
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  // Every call opens a short-lived connection: run the requests, then close it
  private async pipeline(requests: unknown[]): Promise<PipelineResult[]> {
    const response = await this.fetchFn(`${this.url}/v2/pipeline`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        baton: null,
        requests: [...requests, { type: "close" }],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Database request failed (${response.status}): ${await response
          .text()}`,
      );
    }
    const body = (await response.json()) as { results: PipelineResult[] };
    return body.results;
  }

  async execute(
    sql: string,
    args: (SqlValue | undefined)[] = [],
  ): Promise<ExecuteResult> {
    const [result] = await this.pipeline([
      { type: "execute", stmt: toWireStatement({ sql, args }) },
    ]);
    return toResult(unwrap(result).result as WireResult);
  }

  // Runs several statements as one transaction: all of them are saved or none.
  // Each step only runs if the previous one succeeded; if COMMIT did not run,
  // the last step rolls everything back.
  async batch(statements: Statement[]): Promise<ExecuteResult[]> {
    const all: Statement[] = [{ sql: "BEGIN" }, ...statements, {
      sql: "COMMIT",
    }];
    const steps: unknown[] = all.map((statement, i) => ({
      stmt: toWireStatement(statement),
      ...(i > 0 ? { condition: { type: "ok", step: i - 1 } } : {}),
    }));
    const commitStep = all.length - 1;
    steps.push({
      stmt: { sql: "ROLLBACK", args: [] },
      condition: { type: "not", cond: { type: "ok", step: commitStep } },
    });

    const [result] = await this.pipeline([{ type: "batch", batch: { steps } }]);
    const batch = unwrap(result).result as BatchResult;

    const error = batch.step_errors.find((stepError) => stepError !== null);
    if (error) throw new Error(error.message);

    return batch.step_results
      .slice(1, statements.length + 1)
      .map((stepResult) => toResult(stepResult as WireResult));
  }

  // Runs a script with several statements separated by ";" (used for migrations)
  async executeScript(sql: string): Promise<void> {
    const [result] = await this.pipeline([{ type: "sequence", sql }]);
    unwrap(result);
  }
}

let client: TursoClient | null = null;

// Created on first use, so importing this file never needs the variables
export function getDb(): TursoClient {
  if (!client) {
    const url = readEnv("TURSO_DATABASE_URL");
    if (!url) throw new Error("TURSO_DATABASE_URL is not set");
    client = new TursoClient(
      url.replace(/^libsql:\/\//, "https://"),
      readEnv("TURSO_AUTH_TOKEN"),
    );
  }
  return client;
}
