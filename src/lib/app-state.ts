import { useSyncExternalStore } from "react";
import usersSeed from "@/data/users.json";
import plansSeed from "@/data/plans.json";
import walletsSeed from "@/data/wallets.json";
import passesSeed from "@/data/passes.json";
import applicationsSeed from "@/data/applications.json";
import servicesSeed from "@/data/services.json";
import routesSeed from "@/data/routes.json";
import operatorsSeed from "@/data/operators.json";
import notificationsSeed from "@/data/notifications.json";
import vehiclesSeed from "@/data/vehicles.json";
import tripsSeed from "@/data/trips.json";

export type UserRole = "user" | "operator" | "admin";
export type UserType = "student" | "employee";
export type AppStatus = "active" | "suspended";
export type PassStatus = "active" | "expired" | "suspended" | "pending" | "rejected";
export type ApplicationStatus = "pending" | "approved" | "rejected";
export type CrowdLevel = "low" | "moderate" | "high";

export interface AppUser {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  userType: UserType;
  password: string;
  role: UserRole;
  status: AppStatus;
  createdAt: string;
  photoUrl: string | null;
  faceDescriptor: number[] | null;
}

export interface WalletTransaction {
  id: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  date: string;
  status: string;
}

export interface WalletRecord {
  balance: number;
  transactions: WalletTransaction[];
}

export interface Plan {
  id: string;
  name: string;
  duration: string;
  price: number;
  routeLimit: number;
  benefits: string[];
}

export interface PassHistoryItem {
  historyId: string;
  routeId: string;
  routeName: string;
  from: string;
  to: string;
  operatorId: string;
  scannedAt: string;
  access: "granted" | "denied";
}

export interface TransportPass {
  passId: string;
  userId: string;
  type: string;
  planId: string;
  startDate: string;
  expiryDate: string;
  status: PassStatus;
  routes: string[];
  vehicleTypes: string[];
  fare: number;
  issuedAt: string;
  qrToken: string;
  history: PassHistoryItem[];
}

export interface PassApplication {
  applicationId: string;
  userId: string;
  planId: string;
  type: string;
  status: ApplicationStatus;
  appliedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export interface Service {
  id: string;
  name: string;
  icon: string;
  status: string;
  routes: number;
  crowdLevel: CrowdLevel;
  description: string;
}

export interface RouteStop {
  name: string;
  distanceFromStart: number; // km from first stop
  timeFromStart: number; // minutes from first stop
}

export interface JourneyRoute {
  id: string;
  name: string;
  from: string;
  to: string;
  type: "bus" | "metro";
  distance: string;
  estimatedTime: string;
  trafficLevel: CrowdLevel;
  fare: number;
  stops?: RouteStop[];
}

export interface OperatorRecord {
  operatorId: string;
  assignedRouteId: string;
  assignedRoute: string;
  vehicleId: string;
  vehicleCapacity: number;
  currentPassengers: number;
  todayTrips: number;
  crowdLevel: CrowdLevel;
  predictedCrowd: string;
  from: string;
  to: string;
}

export interface Vehicle {
  vehicleId: string;
  vehicleType: "bus" | "metro";
  capacity: number;
  currentPassengers: number;
}

export interface Trip {
  tripId: string;
  userId: string;
  passId: string;
  vehicleId: string;
  routeId: string;
  routeName: string;
  from: string;
  to: string;
  distance: string;
  estimatedTime: string;
  operatorId: string;
  timestamp: string;
  status: "active" | "completed";
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  userId?: string;
}

export interface AppState {
  users: AppUser[];
  plans: Record<UserType, Plan[]>;
  wallets: Record<string, WalletRecord>;
  passes: TransportPass[];
  applications: PassApplication[];
  services: Service[];
  routes: JourneyRoute[];
  operators: Record<string, OperatorRecord>;
  notifications: AppNotification[];
  vehicles: Vehicle[];
  trips: Trip[];
}

const STORAGE_KEY = "smart_transport_realtime_state_v4";
const EVENT_NAME = "smart_transport_realtime_state_changed";

const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const buildInitialState = (): AppState => ({
  users: deepClone(usersSeed as AppUser[]),
  plans: deepClone(plansSeed as Record<UserType, Plan[]>),
  wallets: deepClone(walletsSeed as Record<string, WalletRecord>),
  passes: deepClone(passesSeed as TransportPass[]),
  applications: deepClone(applicationsSeed as PassApplication[]),
  services: deepClone(servicesSeed as Service[]),
  routes: deepClone(routesSeed as JourneyRoute[]),
  operators: deepClone(operatorsSeed as Record<string, OperatorRecord>),
  notifications: deepClone(notificationsSeed as AppNotification[]),
  vehicles: deepClone(vehiclesSeed as Vehicle[]),
  trips: deepClone(tripsSeed as Trip[]),
});

const getStoredState = (): AppState => {
  if (typeof window === "undefined") {
    return buildInitialState();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = buildInitialState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as AppState;
    // Ensure new fields exist for older stored states
    if (!parsed.vehicles) parsed.vehicles = [];
    if (!parsed.trips) parsed.trips = [];
    return parsed;
  } catch {
    const seeded = buildInitialState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
};

const emitStateChange = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  }
};

export const getAppState = (): AppState => deepClone(getStoredState());

export const updateAppState = (updater: (draft: AppState) => AppState | void) => {
  const current = getStoredState();
  const draft = deepClone(current);
  const next = updater(draft) ?? draft;

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    emitStateChange();
  }

  return deepClone(next);
};

export const resetAppState = () => {
  const seeded = buildInitialState();
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    emitStateChange();
  }
  return deepClone(seeded);
};

/** Export current state as a downloadable JSON file */
export const exportAppState = () => {
  const state = getStoredState();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `smart-transport-data-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/** Import state from a JSON file, merging or replacing */
export const importAppState = (jsonString: string): { success: boolean; error?: string } => {
  try {
    const parsed = JSON.parse(jsonString) as Partial<AppState>;

    // Basic validation
    if (!parsed.users || !Array.isArray(parsed.users)) {
      return { success: false, error: "Invalid data format: missing users array" };
    }

    // Merge with defaults for any missing fields
    const current = getStoredState();
    const merged: AppState = {
      users: parsed.users ?? current.users,
      plans: parsed.plans ?? current.plans,
      wallets: parsed.wallets ?? current.wallets,
      passes: parsed.passes ?? current.passes,
      applications: parsed.applications ?? current.applications,
      services: parsed.services ?? current.services,
      routes: parsed.routes ?? current.routes,
      operators: parsed.operators ?? current.operators,
      notifications: parsed.notifications ?? current.notifications,
      vehicles: parsed.vehicles ?? current.vehicles,
      trips: parsed.trips ?? current.trips,
    };

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      emitStateChange();
    }

    return { success: true };
  } catch {
    return { success: false, error: "Invalid JSON file" };
  }
};

export const subscribeToAppState = (listener: () => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener();
    }
  };

  const handleCustom = () => listener();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(EVENT_NAME, handleCustom);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(EVENT_NAME, handleCustom);
  };
};

export const useAppSelector = <T,>(selector: (state: AppState) => T) =>
  useSyncExternalStore(
    subscribeToAppState,
    () => selector(getAppState()),
    () => selector(buildInitialState())
  );

if (typeof window !== "undefined") {
  getStoredState();
}
