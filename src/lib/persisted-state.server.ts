import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDir = path.resolve(process.cwd(), "src/data");

const files = {
  users: "users.json",
  plans: "plans.json",
  wallets: "wallets.json",
  passes: "passes.json",
  applications: "applications.json",
  services: "services.json",
  routes: "routes.json",
  operators: "operators.json",
  notifications: "notifications.json",
  vehicles: "vehicles.json",
  trips: "trips.json",
} as const;

type PersistedState = Record<keyof typeof files, unknown>;

const readJson = async (filename: string) => {
  const fullPath = path.join(dataDir, filename);
  const raw = await readFile(fullPath, "utf-8");
  return JSON.parse(raw) as unknown;
};

const writeJson = async (filename: string, value: unknown) => {
  const fullPath = path.join(dataDir, filename);
  await writeFile(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
};

export const loadPersistedState = async (): Promise<PersistedState> => {
  const result = {} as PersistedState;
  for (const [key, filename] of Object.entries(files) as [keyof typeof files, string][]) {
    result[key] = await readJson(filename);
  }
  return result;
};

export const savePersistedState = async (state: Partial<PersistedState>) => {
  for (const [key, filename] of Object.entries(files) as [keyof typeof files, string][]) {
    if (key in state) {
      await writeJson(filename, state[key]);
    }
  }
};

