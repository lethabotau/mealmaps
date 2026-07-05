import fs from "node:fs";
import path from "node:path";
import type {
  ReportRecord,
  Ticket,
  TicketConfirmMeta,
  TicketOverrides,
} from "@mealmap/shared";

const SNAPSHOT_VERSION = 1;
const DEBOUNCE_MS = 250;

export interface StoreSnapshot {
  version: typeof SNAPSHOT_VERSION;
  tickets: Ticket[];
  overrides: TicketOverrides;
  confirm: Record<string, TicketConfirmMeta>;
  reports: ReportRecord[];
  ingestedEventIds: string[];
}

export interface PersistedStoreState {
  tickets: Ticket[];
  overrides: TicketOverrides;
  confirm: Record<string, TicketConfirmMeta>;
  reports: ReportRecord[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidSnapshot(value: unknown): value is StoreSnapshot {
  if (!isRecord(value)) return false;
  if (value.version !== SNAPSHOT_VERSION) return false;
  if (!Array.isArray(value.tickets)) return false;
  if (!isRecord(value.overrides)) return false;
  if (!isRecord(value.confirm)) return false;
  if (!Array.isArray(value.reports)) return false;
  if (!Array.isArray(value.ingestedEventIds)) return false;
  if (!value.ingestedEventIds.every((id) => typeof id === "string")) return false;
  return true;
}

/** `:memory:` or empty string disables disk persistence (tests). */
export function resolveDataFile(): string | null {
  const raw = process.env.DATA_FILE;
  if (raw === ":memory:" || raw === "") return null;
  return raw ?? "./data/store.json";
}

export function snapshotFromState(
  state: PersistedStoreState,
  ingestedEventIds: Set<string>,
): StoreSnapshot {
  return {
    version: SNAPSHOT_VERSION,
    tickets: state.tickets,
    overrides: state.overrides,
    confirm: state.confirm,
    reports: state.reports,
    ingestedEventIds: [...ingestedEventIds],
  };
}

export function loadSnapshot(
  filePath: string,
): { ok: true; snapshot: StoreSnapshot } | { ok: false; reason: "missing" | "corrupt" } {
  if (!fs.existsSync(filePath)) {
    return { ok: false, reason: "missing" };
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!isValidSnapshot(parsed)) {
      return { ok: false, reason: "corrupt" };
    }
    return { ok: true, snapshot: parsed };
  } catch {
    return { ok: false, reason: "corrupt" };
  }
}

export function atomicWriteJson(filePath: string, data: StoreSnapshot): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, filePath);
}

export class StorePersistence {
  private filePath: string | null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: StoreSnapshot | null = null;

  constructor(filePath: string | null) {
    this.filePath = filePath;
  }

  get enabled(): boolean {
    return this.filePath !== null;
  }

  get path(): string | null {
    return this.filePath;
  }

  schedule(snapshot: StoreSnapshot): void {
    if (!this.filePath) return;
    this.pending = snapshot;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, DEBOUNCE_MS);
  }

  flush(): void {
    if (!this.filePath || !this.pending) return;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const data = this.pending;
    this.pending = null;
    atomicWriteJson(this.filePath, data);
  }

  cancel(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pending = null;
  }
}
