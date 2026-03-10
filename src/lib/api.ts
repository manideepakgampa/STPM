import { getAppState, updateAppState } from "@/lib/app-state";
import type {
  AppNotification,
  AppState,
  AppUser,
  JourneyRoute,
  OperatorRecord,
  PassApplication,
  Plan,
  Service,
  TransportPass,
  Trip,
  Vehicle,
  WalletRecord,
} from "@/lib/app-state";

/* ─── helpers ─── */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const today = () => new Date().toISOString().split("T")[0];
const nowIso = () => new Date().toISOString();
const createId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
const numericValue = (input: string) => Number.parseFloat(input.replace(/[^\d.]/g, "")) || 0;
const durationToDays = (value: string) => Number.parseInt(value, 10) || 30;
const isExpired = (pass: TransportPass) => new Date(pass.expiryDate) < new Date(`${today()}T00:00:00`);

const ensureWallet = (state: AppState, userId: string): WalletRecord => {
  if (!state.wallets[userId]) {
    state.wallets[userId] = { balance: 0, transactions: [] };
  }
  return state.wallets[userId];
};

const getUser = (state: AppState, userId: string) => state.users.find((e) => e.id === userId) ?? null;
const getUserPlans = (state: AppState, userType: AppUser["userType"]) => state.plans[userType] ?? [];
const getPlanById = (state: AppState, user: AppUser, planId: string) =>
  getUserPlans(state, user.userType).find((e) => e.id === planId) ?? null;
const getUserPasses = (state: AppState, userId: string) => state.passes.filter((e) => e.userId === userId);
const getUserApplications = (state: AppState, userId: string) => state.applications.filter((e) => e.userId === userId);

const appendNotification = (state: AppState, notification: AppNotification) => {
  state.notifications.unshift(notification);
};

/* ─── USER: Profile ─── */
export async function getUserProfile(userId: string) {
  await delay(180);
  const state = getAppState();
  const user = getUser(state, userId);
  if (!user) return null;
  return {
    ...user,
    walletBalance: ensureWallet(state, userId).balance,
    passes: getUserPasses(state, userId).length,
    pendingApplications: getUserApplications(state, userId).filter((e) => e.status === "pending").length,
  };
}
export const fetchProfile = getUserProfile;

/* ─── USER: Dashboard ─── */
export async function getUserDashboard(userId: string) {
  await delay();
  const state = getAppState();
  const passes = getUserPasses(state, userId);
  const activePasses = passes.filter((e) => e.status === "active" && !isExpired(e));
  const wallet = ensureWallet(state, userId);
  const userTrips = state.trips.filter((t) => t.userId === userId);
  const pendingApplications = getUserApplications(state, userId).filter((e) => e.status === "pending");
  const totalDistance = userTrips.reduce((sum, t) => sum + numericValue(t.distance), 0);
  const totalMinutes = userTrips.reduce((sum, t) => sum + numericValue(t.estimatedTime), 0);

  return {
    trips: userTrips.length,
    distance: `${totalDistance.toFixed(totalDistance > 0 && totalDistance < 10 ? 1 : 0)} km`,
    timeSaved: `${Math.max(0, Math.round((totalMinutes * 0.35) / 60))} hrs`,
    carbonSaved: `${(userTrips.length * 0.6 + totalDistance * 0.04).toFixed(1)} kg`,
    efficiencyScore: Math.min(99, activePasses.length * 8 + userTrips.length * 3 + pendingApplications.length * 2),
    activePasses: activePasses.length,
    walletBalance: wallet.balance,
    pendingApplications: pendingApplications.length,
  };
}
export const fetchUserDashboard = getUserDashboard;

/* ─── USER: Wallet ─── */
export async function getUserWallet(userId: string) {
  await delay(180);
  return ensureWallet(getAppState(), userId);
}
export const fetchWallet = getUserWallet;

export async function addWalletMoney(userId: string, amount: number) {
  await delay(260);
  const updated = updateAppState((draft) => {
    const wallet = ensureWallet(draft, userId);
    wallet.balance += amount;
    wallet.transactions.unshift({
      id: createId("TXN"),
      type: "credit",
      amount,
      description: "Wallet top-up",
      date: today(),
      status: "completed",
    });
  }) as AppState;
  return ensureWallet(updated, userId);
}

/* ─── USER: Passes ─── */
export async function fetchUserPasses(userId: string) {
  await delay(180);
  return getUserPasses(getAppState(), userId).sort(
    (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
  );
}

export async function fetchUserApplications(userId: string) {
  await delay(180);
  const state = getAppState();
  const user = getUser(state, userId);
  if (!user) return [];
  return getUserApplications(state, userId)
    .map((app) => ({ ...app, plan: getPlanById(state, user, app.planId) }))
    .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
}

/* ─── USER: Plans ─── */
export async function getPlans(userType: string) {
  await delay(180);
  return getAppState().plans[userType as AppUser["userType"]] ?? [];
}
export const fetchPlans = getPlans;

export async function createPassRequest(userId: string, planId: string) {
  await delay(320);
  const state = getAppState();
  const user = getUser(state, userId);
  if (!user) return { success: false, error: "User not found" };
  const plan = getPlanById(state, user, planId);
  if (!plan) return { success: false, error: "Plan not found" };
  const wallet = ensureWallet(state, userId);
  if (wallet.balance < plan.price) return { success: false, error: "Insufficient wallet balance" };

  const hasPending = state.applications.some(
    (e) => e.userId === userId && e.planId === planId && e.status === "pending"
  );
  if (hasPending) return { success: false, error: "This plan is already waiting for admin approval." };

  const existingActive = state.passes.some(
    (e) => e.userId === userId && e.planId === planId && e.status === "active" && !isExpired(e)
  );
  if (existingActive) return { success: false, error: "You already have an active pass for this plan." };

  const application: PassApplication = {
    applicationId: createId("APP"),
    userId,
    planId,
    type: plan.name,
    status: "pending",
    appliedAt: today(),
    reviewedAt: null,
    reviewedBy: null,
  };

  updateAppState((draft) => {
    draft.applications.unshift(application);
    appendNotification(draft, {
      id: createId("NOT"),
      type: "targeted",
      userId,
      title: "Pass application submitted",
      message: `${plan.name} is waiting for admin approval.`,
      date: today(),
      read: false,
    });
  });

  return { success: true, application };
}
export const applyForPlan = createPassRequest;
export const buyPlan = createPassRequest;

/* ─── USER: Renew Pass (extends existing pass expiry) ─── */
export async function renewPass(userId: string, planId: string) {
  await delay(300);
  const state = getAppState();
  const user = getUser(state, userId);
  if (!user) return { success: false, error: "User not found" };
  const plan = getPlanById(state, user, planId);
  if (!plan) return { success: false, error: "Plan not found" };
  const wallet = ensureWallet(state, userId);
  if (wallet.balance < plan.price) return { success: false, error: "Insufficient wallet balance." };

  const activePass = state.passes.find(
    (e) => e.userId === userId && e.planId === planId && e.status === "active" && !isExpired(e)
  );
  if (!activePass) return { success: false, error: "No active pass found to renew." };

  const currentExpiry = new Date(activePass.expiryDate);
  const extensionDays = durationToDays(plan.duration);
  currentExpiry.setDate(currentExpiry.getDate() + extensionDays);
  const newExpiry = currentExpiry.toISOString().split("T")[0];

  updateAppState((draft) => {
    const pass = draft.passes.find((e) => e.passId === activePass.passId);
    if (pass) pass.expiryDate = newExpiry;

    const w = ensureWallet(draft, userId);
    w.balance -= plan.price;
    w.transactions.unshift({
      id: createId("TXN"),
      type: "debit",
      amount: plan.price,
      description: `Renewal: ${plan.name}`,
      date: today(),
      status: "completed",
    });

    appendNotification(draft, {
      id: createId("NOT"),
      type: "targeted",
      userId,
      title: "Pass Renewed",
      message: `${plan.name} extended until ${newExpiry}.`,
      date: today(),
      read: false,
    });
  });

  return { success: true, newExpiry };
}

/* ─── ADMIN: Stats ─── */
export async function getAdminStats() {
  await delay(180);
  const state = getAppState();
  const activePasses = state.passes.filter((e) => e.status === "active" && !isExpired(e));
  const pendingApps = state.applications.filter((e) => e.status === "pending");
  const monthlyRevenue = Object.values(state.wallets)
    .flatMap((w) => w.transactions)
    .filter((t) => t.type === "debit")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalTrips = state.trips.length;

  const buildMonthlyTrends = () => {
    const fmt = new Intl.DateTimeFormat("en-US", { month: "short" });
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i), 1);
      d.setHours(0, 0, 0, 0);
      return d;
    });
    return months.map((date) => {
      const sameMonth = (v?: string | null) => {
        if (!v) return false;
        const t = new Date(v);
        return t.getMonth() === date.getMonth() && t.getFullYear() === date.getFullYear();
      };
      return {
        month: fmt.format(date),
        users: state.users.filter((e) => e.role === "user" && sameMonth(e.createdAt)).length,
        passes: state.passes.filter((e) => sameMonth(e.issuedAt)).length,
        revenue: Object.values(state.wallets)
          .flatMap((w) => w.transactions)
          .filter((t) => t.type === "debit" && sameMonth(t.date))
          .reduce((s, t) => s + t.amount, 0),
      };
    });
  };

  return {
    totalUsers: state.users.filter((e) => e.role === "user").length,
    activeUsers: state.users.filter((e) => e.role === "user" && e.status === "active").length,
    totalPasses: state.passes.length,
    activePasses: activePasses.length,
    pendingApplications: pendingApps.length,
    monthlyRevenue,
    totalTripsThisMonth: totalTrips,
    monthlyTrends: buildMonthlyTrends(),
  };
}
export const fetchAdminStats = getAdminStats;

/* ─── ADMIN: Users ─── */
export async function getAdminUsers() {
  await delay(180);
  const state = getAppState();
  return state.users
    .filter((e) => e.role !== "admin")
    .map((e) => ({
      ...e,
      walletBalance: ensureWallet(state, e.id).balance,
      activePasses: state.passes.filter((p) => p.userId === e.id && p.status === "active" && !isExpired(p)).length,
      pendingApplications: state.applications.filter((a) => a.userId === e.id && a.status === "pending").length,
    }));
}
export const fetchAdminUsers = getAdminUsers;

/* ─── ADMIN: Pass Requests ─── */
export async function getPassRequests() {
  await delay(180);
  const state = getAppState();
  return state.applications
    .filter((e) => e.status === "pending")
    .map((e) => {
      const user = getUser(state, e.userId);
      return { ...e, user, plan: user ? getPlanById(state, user, e.planId) : null };
    })
    .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
}
export const fetchPendingApplications = getPassRequests;

/* ─── ADMIN: Approve / Reject ─── */
export async function approvePassRequest(applicationId: string, adminId: string) {
  await delay(320);
  const state = getAppState();
  const app = state.applications.find((e) => e.applicationId === applicationId);
  if (!app || app.status !== "pending") return { success: false, error: "Application is no longer pending." };

  const user = getUser(state, app.userId);
  if (!user) return { success: false, error: "User not found." };
  const plan = getPlanById(state, user, app.planId);
  if (!plan) return { success: false, error: "Plan not found." };
  const wallet = ensureWallet(state, user.id);
  if (wallet.balance < plan.price) return { success: false, error: "User has insufficient wallet balance." };

  const startDate = today();
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + durationToDays(plan.duration));

  const baseRoutes = state.routes.slice(0, Math.max(1, plan.routeLimit === -1 ? 3 : plan.routeLimit));
  const nextPass: TransportPass = {
    passId: createId("PASS"),
    userId: user.id,
    type: plan.name,
    planId: plan.id,
    startDate,
    expiryDate: expiry.toISOString().split("T")[0],
    status: "active",
    routes: plan.routeLimit === -1 ? ["All Routes"] : baseRoutes.map((r) => r.name),
    vehicleTypes: ["Bus", "Metro"],
    fare: plan.price,
    issuedAt: startDate,
    qrToken: createId("QR"),
    history: [],
  };

  updateAppState((draft) => {
    const target = draft.applications.find((e) => e.applicationId === applicationId);
    const tw = ensureWallet(draft, user.id);
    if (!target || target.status !== "pending") return;

    target.status = "approved";
    target.reviewedAt = startDate;
    target.reviewedBy = adminId;

    tw.balance -= plan.price;
    tw.transactions.unshift({
      id: createId("TXN"),
      type: "debit",
      amount: plan.price,
      description: `${plan.name} approved by admin`,
      date: startDate,
      status: "completed",
    });

    draft.passes.unshift(nextPass);
    appendNotification(draft, {
      id: createId("NOT"),
      type: "targeted",
      userId: user.id,
      title: "Pass approved",
      message: `${plan.name} is now active in your account.`,
      date: startDate,
      read: false,
    });
  });

  return { success: true, pass: nextPass };
}
export const approvePassApplication = approvePassRequest;

export async function rejectPassApplication(applicationId: string, adminId: string) {
  await delay(260);
  updateAppState((draft) => {
    const target = draft.applications.find((e) => e.applicationId === applicationId);
    if (!target || target.status !== "pending") return;
    target.status = "rejected";
    target.reviewedAt = today();
    target.reviewedBy = adminId;
    appendNotification(draft, {
      id: createId("NOT"),
      type: "targeted",
      userId: target.userId,
      title: "Pass application rejected",
      message: `${target.type} needs changes before it can be approved.`,
      date: today(),
      read: false,
    });
  });
  return { success: true };
}

/* ─── ADMIN: Create Operator ─── */
export async function createOperator(data: {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
  assignedRouteId: string;
  vehicleId: string;
  vehicleCapacity: number;
}) {
  await delay(400);
  const state = getAppState();
  const existing = state.users.find((e) => e.email.toLowerCase() === data.email.toLowerCase());
  if (existing) return { success: false, error: "Email already registered." };

  const route = state.routes.find((r) => r.id === data.assignedRouteId);
  const operatorId = createId("OPR");

  updateAppState((draft) => {
    draft.users.push({
      id: operatorId,
      fullName: data.fullName,
      email: data.email,
      mobile: data.mobile,
      userType: "employee",
      password: data.password,
      role: "operator",
      status: "active",
      createdAt: today(),
      photoUrl: null,
      faceDescriptor: null,
    });

    draft.wallets[operatorId] = { balance: 0, transactions: [] };

    draft.operators[operatorId] = {
      operatorId,
      assignedRouteId: data.assignedRouteId,
      assignedRoute: route?.name ?? "Unassigned",
      vehicleId: data.vehicleId,
      vehicleCapacity: data.vehicleCapacity,
      currentPassengers: 0,
      todayTrips: 0,
      crowdLevel: "low",
      predictedCrowd: "No data yet",
      from: route?.from ?? "",
      to: route?.to ?? "",
    };

    // Also add vehicle if it doesn't exist
    if (!draft.vehicles.find((v) => v.vehicleId === data.vehicleId)) {
      draft.vehicles.push({
        vehicleId: data.vehicleId,
        vehicleType: route?.type === "metro" ? "metro" : "bus",
        capacity: data.vehicleCapacity,
        currentPassengers: 0,
      });
    }
  });

  return { success: true, operatorId };
}

/* ─── ADMIN: Passes & Renewals ─── */
export async function fetchAllPasses() {
  await delay(180);
  const state = getAppState();
  return state.passes
    .map((e) => ({ ...e, user: getUser(state, e.userId), expired: isExpired(e) }))
    .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
}

export async function sendRenewalAlert(passId: string) {
  await delay(180);
  const state = getAppState();
  const pass = state.passes.find((e) => e.passId === passId);
  if (!pass) return { success: false, error: "Pass not found." };
  updateAppState((draft) => {
    appendNotification(draft, {
      id: createId("NOT"),
      type: "targeted",
      userId: pass.userId,
      title: "Renewal reminder",
      message: `Your ${pass.type} expires on ${pass.expiryDate}. Please renew it soon.`,
      date: today(),
      read: false,
    });
  });
  return { success: true };
}

/* ─── SERVICES & ROUTES ─── */
export async function fetchServices() {
  await delay(150);
  return getAppState().services;
}

export async function fetchAllRoutes() {
  await delay(150);
  return getAppState().routes;
}

export async function searchJourney(from: string, to: string, type: string) {
  await delay(380);
  const state = getAppState();
  const routes = state.routes.filter((e) => {
    const matchType = !type || type === "all" || e.type === type;
    const matchFrom = !from || e.from.toLowerCase().includes(from.toLowerCase()) || e.name.toLowerCase().includes(from.toLowerCase());
    const matchTo = !to || e.to.toLowerCase().includes(to.toLowerCase()) || e.name.toLowerCase().includes(to.toLowerCase());
    return matchType && (matchFrom || matchTo);
  });
  return routes.length > 0 ? routes : state.routes.slice(0, 2);
}

/* ─── OPERATOR: Dashboard ─── */
export async function getOperatorDashboard(operatorId: string) {
  await delay(180);
  return getAppState().operators[operatorId] ?? null;
}
export const fetchOperatorDashboard = getOperatorDashboard;

export async function updateOperatorRouteAssignment(operatorId: string, routeId: string) {
  await delay(220);
  const route = getAppState().routes.find((e) => e.id === routeId);
  if (!route) return { success: false, error: "Route not found." };

  const updated = updateAppState((draft) => {
    const op = draft.operators[operatorId];
    if (!op) return;
    op.assignedRouteId = route.id;
    op.assignedRoute = route.name;
    op.from = route.from;
    op.to = route.to;
  }) as AppState;

  return { success: true, data: updated.operators[operatorId] };
}

/* ─── OPERATOR: Verify Pass (QR) ─── */
export async function verifyPass(scanInput: string) {
  await delay(260);
  const state = getAppState();
  let passId = scanInput.trim();

  try {
    const parsed = JSON.parse(scanInput);
    if (parsed.passId) passId = parsed.passId;
  } catch {
    // manual pass id entry
  }

  const pass = state.passes.find((e) => e.passId === passId);
  if (!pass) return { valid: false, errorType: "not_found", error: "Invalid QR code — no matching pass found in the system. The code may be fake or corrupted." };

  const user = getUser(state, pass.userId);
  const expired = isExpired(pass);
  const latestScan = pass.history[0];
  const duplicate = !!latestScan && Math.abs(Date.now() - new Date(latestScan.scannedAt).getTime()) < 120000;
  const wallet = ensureWallet(state, pass.userId);

  if (pass.status === "pending") {
    return { valid: false, errorType: "pending", error: "This pass is still pending admin approval. The passenger cannot board yet.", pass, user: user ? { id: user.id, fullName: user.fullName, userType: user.userType, photoUrl: user.photoUrl } : null, walletBalance: wallet.balance };
  }
  if (pass.status === "rejected") {
    return { valid: false, errorType: "rejected", error: "This pass application was rejected by admin. Entry denied.", pass, user: user ? { id: user.id, fullName: user.fullName, userType: user.userType, photoUrl: user.photoUrl } : null, walletBalance: wallet.balance };
  }
  if (expired) {
    return { valid: false, errorType: "expired", expired: true, error: `This pass expired on ${pass.expiryDate}. The passenger needs to renew their pass.`, pass, user: user ? { id: user.id, fullName: user.fullName, userType: user.userType, photoUrl: user.photoUrl } : null, walletBalance: wallet.balance };
  }
  if (duplicate) {
    return { valid: false, errorType: "duplicate", duplicate: true, error: "This QR was scanned less than 2 minutes ago. Duplicate entry blocked to prevent misuse.", pass, user: user ? { id: user.id, fullName: user.fullName, userType: user.userType, photoUrl: user.photoUrl } : null, walletBalance: wallet.balance };
  }

  return {
    valid: true,
    duplicate: false,
    expired: false,
    pass,
    user: user ? { id: user.id, fullName: user.fullName, userType: user.userType, photoUrl: user.photoUrl } : null,
    walletBalance: wallet.balance,
  };
}
export const verifyPassByQR = verifyPass;

/* ─── OPERATOR: Log Trip (Assign Route) ─── */
export async function logTrip(
  passId: string,
  operatorId: string,
  routeId: string,
  fromStop?: string,
  toStop?: string,
) {
  await delay(300);
  const state = getAppState();
  const route = state.routes.find((e) => e.id === routeId);
  const pass = state.passes.find((e) => e.passId === passId);
  const operator = state.operators[operatorId];

  if (!route || !pass || !operator) return { success: false, error: "Missing route, pass, or operator." };
  if (isExpired(pass) || pass.status !== "active") return { success: false, error: "This pass is not valid for travel." };

  // Calculate segment distance/time based on stops
  const stops = route.stops ?? [];
  const startStop = stops.find((s) => s.name === fromStop);
  const endStop = stops.find((s) => s.name === toStop);
  let segmentDistance = route.distance;
  let segmentTime = route.estimatedTime;
  const actualFrom = fromStop || route.from;
  const actualTo = toStop || route.to;

  if (startStop && endStop) {
    const dist = Math.abs(endStop.distanceFromStart - startStop.distanceFromStart);
    const time = Math.abs(endStop.timeFromStart - startStop.timeFromStart);
    segmentDistance = `${dist.toFixed(1)} km`;
    segmentTime = `${time} min`;
  }

  const historyItem = {
    historyId: createId("HIS"),
    routeId: route.id,
    routeName: route.name,
    from: actualFrom,
    to: actualTo,
    operatorId,
    scannedAt: nowIso(),
    access: "granted" as const,
  };

  const trip: Trip = {
    tripId: createId("TRIP"),
    userId: pass.userId,
    passId: pass.passId,
    vehicleId: operator.vehicleId,
    routeId: route.id,
    routeName: route.name,
    from: actualFrom,
    to: actualTo,
    distance: segmentDistance,
    estimatedTime: segmentTime,
    operatorId,
    timestamp: nowIso(),
    status: "active",
  };

  updateAppState((draft) => {
    const tp = draft.passes.find((e) => e.passId === passId);
    const op = draft.operators[operatorId];
    if (!tp || !op) return;

    tp.history.unshift(historyItem);
    draft.trips.unshift(trip);

    op.todayTrips += 1;
    op.currentPassengers = Math.min(op.vehicleCapacity, op.currentPassengers + 1);
    const occupancy = op.currentPassengers / op.vehicleCapacity;
    op.crowdLevel = occupancy >= 0.8 ? "high" : occupancy >= 0.5 ? "moderate" : "low";

    const vehicle = draft.vehicles.find((v) => v.vehicleId === op.vehicleId);
    if (vehicle) {
      vehicle.currentPassengers = Math.min(vehicle.capacity, vehicle.currentPassengers + 1);
    }

    appendNotification(draft, {
      id: createId("NOT"),
      type: "targeted",
      userId: tp.userId,
      title: "Trip recorded",
      message: `${route.name}: ${actualFrom} → ${actualTo} was added to your pass history.`,
      date: today(),
      read: false,
    });
  });

  return { success: true, historyItem, trip };
}
export const assignRouteToPass = logTrip;

/* ─── OPERATOR: Complete Trip ─── */
export async function completeTrip(tripId: string, operatorId: string) {
  await delay(200);
  const state = getAppState();
  const trip = state.trips.find((t) => t.tripId === tripId);
  if (!trip) return { success: false, error: "Trip not found." };
  if (trip.status === "completed") return { success: false, error: "Trip already completed." };

  updateAppState((draft) => {
    const t = draft.trips.find((e) => e.tripId === tripId);
    if (t) t.status = "completed";

    const op = draft.operators[operatorId];
    if (op) {
      op.currentPassengers = Math.max(0, op.currentPassengers - 1);
      const occupancy = op.currentPassengers / op.vehicleCapacity;
      op.crowdLevel = occupancy >= 0.8 ? "high" : occupancy >= 0.5 ? "moderate" : "low";
    }

    const vehicle = op ? draft.vehicles.find((v) => v.vehicleId === op.vehicleId) : null;
    if (vehicle) {
      vehicle.currentPassengers = Math.max(0, vehicle.currentPassengers - 1);
    }
  });

  return { success: true };
}

/* ─── OPERATOR: Get Active Trips ─── */
export async function getActiveTrips(operatorId: string) {
  await delay(150);
  return getAppState().trips.filter((t) => t.operatorId === operatorId && t.status === "active");
}

/* ─── OPERATOR: Get Route Stops ─── */
export async function getRouteStops(routeId: string) {
  await delay(100);
  const route = getAppState().routes.find((r) => r.id === routeId);
  if (!route) return [];

  // If stops exist, return them
  if (route.stops && route.stops.length > 0) return route.stops;

  // Auto-generate stops for routes that don't have them
  const totalDist = numericValue(route.distance);
  const totalTime = numericValue(route.estimatedTime);
  const count = Math.max(3, Math.min(6, Math.ceil(totalDist / 3))); // 1 stop per ~3km
  const stops: Array<{ name: string; distanceFromStart: number; timeFromStart: number }> = [];
  stops.push({ name: route.from, distanceFromStart: 0, timeFromStart: 0 });
  for (let i = 1; i < count - 1; i++) {
    const frac = i / (count - 1);
    stops.push({
      name: `${route.name} Stop ${i}`,
      distanceFromStart: Math.round(totalDist * frac * 10) / 10,
      timeFromStart: Math.round(totalTime * frac),
    });
  }
  stops.push({ name: route.to, distanceFromStart: totalDist, timeFromStart: totalTime });

  // Persist the generated stops
  updateAppState((draft) => {
    const r = draft.routes.find((e) => e.id === routeId);
    if (r) r.stops = stops;
  });

  return stops;
}

/* ─── NOTIFICATIONS ─── */
export async function fetchNotifications() {
  await delay(150);
  return getAppState().notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function fetchUserNotifications(userId: string) {
  await delay(150);
  return getAppState().notifications
    .filter((n) => !n.userId || n.userId === userId || n.type === "broadcast")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function markNotificationRead(notificationId: string) {
  updateAppState((draft) => {
    const n = draft.notifications.find((e) => e.id === notificationId);
    if (n) n.read = true;
  });
}

export async function markAllNotificationsRead(userId: string) {
  updateAppState((draft) => {
    draft.notifications.forEach((n) => {
      if (!n.userId || n.userId === userId || n.type === "broadcast") n.read = true;
    });
  });
}

export async function sendAdminNotification(data: {
  title: string;
  message: string;
  type: "broadcast" | "targeted";
  userId?: string;
}) {
  await delay(200);
  updateAppState((draft) => {
    appendNotification(draft, {
      id: createId("NOT"),
      type: data.type,
      userId: data.userId,
      title: data.title,
      message: data.message,
      date: today(),
      read: false,
    });
  });
  return { success: true };
}

/* ─── VEHICLES ─── */
export async function fetchVehicles() {
  await delay(150);
  return getAppState().vehicles;
}

/* ─── TRIPS ─── */
export async function fetchTrips(userId?: string) {
  await delay(150);
  const trips = getAppState().trips;
  if (userId) return trips.filter((t) => t.userId === userId);
  return trips;
}

export async function createRoute(data: {
  name: string;
  from: string;
  to: string;
  type: "bus" | "metro";
  distance: string;
  estimatedTime: string;
  fare: number;
  stops?: Array<{ name: string; distanceFromStart: number; timeFromStart: number }>;
}) {
  await delay(300);
  const totalDist = numericValue(data.distance);
  const totalTime = numericValue(data.estimatedTime);

  // Auto-generate stops if not provided: from, 2-4 midpoints, to
  const stops = data.stops ?? (() => {
    const count = Math.floor(Math.random() * 3) + 3; // 3-5 total stops
    const result: Array<{ name: string; distanceFromStart: number; timeFromStart: number }> = [];
    result.push({ name: data.from, distanceFromStart: 0, timeFromStart: 0 });
    for (let i = 1; i < count - 1; i++) {
      const frac = i / (count - 1);
      result.push({
        name: `Stop ${i}`,
        distanceFromStart: Math.round(totalDist * frac * 10) / 10,
        timeFromStart: Math.round(totalTime * frac),
      });
    }
    result.push({ name: data.to, distanceFromStart: totalDist, timeFromStart: totalTime });
    return result;
  })();

  const route: JourneyRoute = {
    id: createId("RT"),
    name: data.name,
    from: data.from,
    to: data.to,
    type: data.type,
    distance: data.distance,
    estimatedTime: data.estimatedTime,
    trafficLevel: "low",
    fare: data.fare,
    stops,
  };
  updateAppState((draft) => { draft.routes.push(route); });
  return { success: true, route };
}

export async function deleteRoute(routeId: string) {
  await delay(200);
  updateAppState((draft) => { draft.routes = draft.routes.filter((r) => r.id !== routeId); });
  return { success: true };
}

/* ─── ADMIN: Create Vehicle ─── */
export async function createVehicle(data: { vehicleId: string; vehicleType: "bus" | "metro"; capacity: number }) {
  await delay(300);
  const state = getAppState();
  if (state.vehicles.find((v) => v.vehicleId === data.vehicleId)) return { success: false, error: "Vehicle ID already exists." };
  const vehicle: Vehicle = { vehicleId: data.vehicleId, vehicleType: data.vehicleType, capacity: data.capacity, currentPassengers: 0 };
  updateAppState((draft) => { draft.vehicles.push(vehicle); });
  return { success: true, vehicle };
}

export async function deleteVehicle(vehicleId: string) {
  await delay(200);
  updateAppState((draft) => { draft.vehicles = draft.vehicles.filter((v) => v.vehicleId !== vehicleId); });
  return { success: true };
}

/* ─── ADMIN: Create / Delete Plan ─── */
export async function createPlan(data: { name: string; duration: string; price: number; routeLimit: number; benefits: string[]; userType: "student" | "employee" }) {
  await delay(300);
  const plan: Plan = { id: createId("PLAN"), name: data.name, duration: data.duration, price: data.price, routeLimit: data.routeLimit, benefits: data.benefits };
  updateAppState((draft) => {
    if (!draft.plans[data.userType]) draft.plans[data.userType] = [];
    draft.plans[data.userType].push(plan);
  });
  return { success: true, plan };
}

export async function deletePlan(planId: string, userType: "student" | "employee") {
  await delay(200);
  updateAppState((draft) => { draft.plans[userType] = (draft.plans[userType] || []).filter((p) => p.id !== planId); });
  return { success: true };
}

/* ─── ADMIN: Create / Delete Service ─── */
export async function createService(data: { name: string; icon: string; description: string }) {
  await delay(300);
  const service: Service = { id: createId("SVC"), name: data.name, icon: data.icon, status: "active", routes: 0, crowdLevel: "low", description: data.description };
  updateAppState((draft) => { draft.services.push(service); });
  return { success: true, service };
}

export async function deleteService(serviceId: string) {
  await delay(200);
  updateAppState((draft) => { draft.services = draft.services.filter((s) => s.id !== serviceId); });
  return { success: true };
}

/* ─── ADMIN: Delete Operator ─── */
export async function deleteOperator(operatorId: string) {
  await delay(200);
  updateAppState((draft) => {
    draft.users = draft.users.filter((u) => u.id !== operatorId);
    delete draft.operators[operatorId];
  });
  return { success: true };
}

/* ─── ADMIN/USER: Delete User (cascades all related records) ─── */
export async function deleteUserAccount(userId: string) {
  await delay(220);
  updateAppState((draft) => {
    const target = draft.users.find((u) => u.id === userId);
    if (!target) return;

    draft.users = draft.users.filter((u) => u.id !== userId);
    delete draft.wallets[userId];
    draft.passes = draft.passes.filter((p) => p.userId !== userId);
    draft.applications = draft.applications.filter((a) => a.userId !== userId);
    draft.trips = draft.trips.filter((t) => t.userId !== userId);
    draft.notifications = draft.notifications.filter((n) => n.userId !== userId);

    if (target.role === "operator") {
      delete draft.operators[userId];
      draft.trips = draft.trips.filter((t) => t.operatorId !== userId);
      draft.passes.forEach((pass) => {
        pass.history = pass.history.filter((h) => h.operatorId !== userId);
      });
    }
  });
  return { success: true };
}

/* ─── RESET ─── */
export { resetAppState } from "@/lib/app-state";
