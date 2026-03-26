import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import type {
  ActionRecord,
  ActionPlanRecord,
  ActionRunRecord,
  ApprovalGrantRecord,
  AutomationEventRecord,
  AutomationSessionRecord,
  ArtifactRecord,
  BrowserCommandRecord,
  BrowserSnapshotRecord,
  CaseRecord,
  DraftRecord,
  FollowUpTaskRecord,
  GmailConnectionRecord,
  MerchantProfileRecord,
  MessageRecord,
  PolicySourceRecord,
  ProfileRecord,
  RefundStrategyRecord,
  ResearchRunRecord
} from "@/lib/contracts/domain";
import {
  env,
  getProviderRuntimeState,
  hasConfiguredSupabaseDatabase,
  isDemoSafeModeEnabled
} from "@/lib/config/env";
import { getLocalDataRoot } from "@/server/storage/localDataRoot";

export interface LocalDatabase {
  profiles: ProfileRecord[];
  cases: CaseRecord[];
  artifacts: ArtifactRecord[];
  researchRuns: ResearchRunRecord[];
  policySources: PolicySourceRecord[];
  refundStrategies: RefundStrategyRecord[];
  merchantProfiles: MerchantProfileRecord[];
  actionPlans: ActionPlanRecord[];
  actionRuns: ActionRunRecord[];
  approvalGrants: ApprovalGrantRecord[];
  followUpTasks: FollowUpTaskRecord[];
  automationSessions: AutomationSessionRecord[];
  browserSnapshots: BrowserSnapshotRecord[];
  browserCommands: BrowserCommandRecord[];
  automationEvents: AutomationEventRecord[];
  drafts: DraftRecord[];
  actions: ActionRecord[];
  messages: MessageRecord[];
  gmailConnections: GmailConnectionRecord[];
}

const DATA_DIRECTORY = getLocalDataRoot();
const DATABASE_PATH = path.join(DATA_DIRECTORY, "refund-raider-db.json");
const DATABASE_ROW_ID = "global";

let sqlClient: postgres.Sql | null = null;

function serializeDatabase(database: LocalDatabase) {
  return JSON.parse(JSON.stringify(database)) as Record<string, unknown>;
}

const blankDatabase = (): LocalDatabase => ({
  profiles: [],
  cases: [],
  artifacts: [],
  researchRuns: [],
  policySources: [],
  refundStrategies: [],
  merchantProfiles: [],
  actionPlans: [],
  actionRuns: [],
  approvalGrants: [],
  followUpTasks: [],
  automationSessions: [],
  browserSnapshots: [],
  browserCommands: [],
  automationEvents: [],
  drafts: [],
  actions: [],
  messages: [],
  gmailConnections: []
});

let mutationQueue = Promise.resolve();

async function ensureDataDirectory() {
  await mkdir(DATA_DIRECTORY, { recursive: true });
}

function getSqlClient() {
  if (isDemoSafeModeEnabled() || !hasConfiguredSupabaseDatabase()) {
    return null;
  }

  if (!sqlClient) {
    sqlClient = postgres(env.supabaseDbUrl, {
      prepare: false,
      idle_timeout: 5,
      connect_timeout: 10
    });
  }

  return sqlClient;
}

async function ensureRemoteStateTable() {
  const sql = getSqlClient();
  if (!sql) {
    return null;
  }

  await sql`
    create table if not exists refund_raider_state (
      id text primary key,
      payload jsonb not null,
      updated_at timestamptz not null default now()
    )
  `;

  return sql;
}

async function readLocalDatabaseSnapshot(): Promise<LocalDatabase | null> {
  await ensureDataDirectory();

  try {
    const buffer = await readFile(DATABASE_PATH, "utf8");
    return {
      ...blankDatabase(),
      ...(JSON.parse(buffer) as Partial<LocalDatabase>)
    };
  } catch {
    return null;
  }
}

async function readRemoteDatabase(): Promise<LocalDatabase> {
  const sql = await ensureRemoteStateTable();
  if (!sql) {
    throw new Error("Supabase database is not configured.");
  }

  const rows = await sql<{ payload: LocalDatabase }[]>`
    select payload
    from refund_raider_state
    where id = ${DATABASE_ROW_ID}
    limit 1
  `;

  if (rows.length > 0) {
    return {
      ...blankDatabase(),
      ...(rows[0].payload as Partial<LocalDatabase>)
    };
  }

  const localSnapshot = await readLocalDatabaseSnapshot();
  const initialDatabase = localSnapshot ?? blankDatabase();

  await sql`
    insert into refund_raider_state (id, payload)
    values (${DATABASE_ROW_ID}, ${sql.json(serializeDatabase(initialDatabase) as any)})
    on conflict (id) do nothing
  `;

  return initialDatabase;
}

async function writeRemoteDatabase(database: LocalDatabase) {
  const sql = await ensureRemoteStateTable();
  if (!sql) {
    throw new Error("Supabase database is not configured.");
  }

  await sql`
    insert into refund_raider_state (id, payload, updated_at)
    values (${DATABASE_ROW_ID}, ${sql.json(serializeDatabase(database) as any)}, now())
    on conflict (id) do update
    set payload = excluded.payload,
        updated_at = excluded.updated_at
  `;
}

async function readDatabase(): Promise<LocalDatabase> {
  if (hasConfiguredSupabaseDatabase()) {
    try {
      return await readRemoteDatabase();
    } catch {
      // fall through to local persistence so the app remains demo-safe
    }
  }

  const localSnapshot = await readLocalDatabaseSnapshot();
  if (localSnapshot) {
    return localSnapshot;
  }

  const initialDatabase = blankDatabase();
  await writeFile(DATABASE_PATH, JSON.stringify(initialDatabase, null, 2), "utf8");
  return initialDatabase;
}

async function writeDatabase(database: LocalDatabase) {
  if (hasConfiguredSupabaseDatabase()) {
    try {
      await writeRemoteDatabase(database);
      return;
    } catch {
      // fall through to local persistence so the app remains demo-safe
    }
  }

  await ensureDataDirectory();
  await writeFile(DATABASE_PATH, JSON.stringify(database, null, 2), "utf8");
}

export async function getDatabaseSnapshot() {
  return readDatabase();
}

export async function mutateDatabase<T>(
  mutator: (database: LocalDatabase) => Promise<T> | T
): Promise<T> {
  let result!: T;

  mutationQueue = mutationQueue.catch(() => undefined).then(async () => {
    const database = await readDatabase();
    result = await mutator(database);
    await writeDatabase(database);
  });

  await mutationQueue;
  return result;
}

export function getPersistenceRuntimeState() {
  const runtimeState = getProviderRuntimeState("supabase_db", hasConfiguredSupabaseDatabase());

  return {
    ...runtimeState,
    provider: "supabase_db",
    message:
      runtimeState.readiness === "ready"
        ? "Supabase Postgres persistence is configured."
        : runtimeState.readiness === "demo_safe"
          ? "Supabase Postgres persistence is configured but demo safety mode keeps the app on local JSON."
          : "Supabase Postgres persistence is not configured, so the app will fall back to local JSON."
  } as const;
}
