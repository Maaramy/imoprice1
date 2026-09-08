import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Reset all monthly estimation quotas on the 1st of each month (00:00 UTC).
// The lazy reset in plans.ts also handles month changes at read/write time,
// so this cron simply keeps the stored counters tidy.
crons.cron(
  "monthly-quota-reset",
  "0 0 1 * *",
  internal.plans.resetMonthlyQuotas,
);

// Alertes prix du marché : vérification quotidienne à 07:00 UTC.
crons.cron(
  "price-alerts-daily-check",
  "0 7 * * *",
  internal.alerts.checkPriceAlerts,
);

// Annonces : synchronisation horaire des statuts (publication / expiration).
crons.cron(
  "announcements-status-sync",
  "0 * * * *",
  internal.announcements.syncAnnouncementStatuses,
);

export default crons;
