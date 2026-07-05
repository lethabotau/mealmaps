import "dotenv/config";

/**
 * Triggers ingest against the RUNNING backend via POST /api/ingest, so it
 * mutates the same in-memory store the server serves from. Running ingest in a
 * standalone process would only fill a throwaway store and exit with no effect,
 * so this thin client is the correct operational path (and gives real
 * cross-run dedupe: a warm store reports `inserted 0`).
 */
async function main(): Promise<void> {
  const secret = process.env.INGEST_SECRET;
  if (!secret) {
    console.error(
      "[ingest] INGEST_SECRET is not set in backend/.env — cannot authorize POST /api/ingest.",
    );
    process.exit(1);
  }

  const base =
    process.env.INGEST_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
  const url = `${base}/api/ingest`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "x-ingest-secret": secret },
    });
  } catch (err) {
    console.error(
      `[ingest] could not reach the backend at ${url} — is it running (npm run dev)?`,
      err instanceof Error ? `\n  ${err.message}` : "",
    );
    process.exit(1);
    return;
  }

  const body = (await res.json().catch(() => ({}))) as {
    fetched?: number;
    classified?: number;
    inserted?: number;
    error?: string;
  };

  if (!res.ok) {
    console.error(
      `[ingest] server returned ${res.status}: ${body.error ?? "unknown error"}`,
    );
    process.exit(1);
  }

  console.log(
    `[ingest] fetched ${body.fetched}, classified ${body.classified} food-likely, inserted ${body.inserted} new`,
  );
  process.exit(0);
}

void main();
