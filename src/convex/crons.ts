import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

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
