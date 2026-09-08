"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { vly } from "../lib/vly-integrations";

/**
 * Emails automatiques (best-effort) via la passerelle d'intégration VLY.
 *
 * Les mutations du backend (réponses d'agence, alertes prix…) programment
 * internal.notifications.sendEmail via ctx.scheduler.runAfter : l'email est
 * envoyé en tâche de fond et n'ajoute jamais de latence ni de point de
 * défaillance au flux principal.
 */
export const sendEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    text: v.optional(v.string()),
    html: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    if (!args.to || !args.to.includes("@")) return { skipped: true, reason: "invalid_recipient" };

    const html =
      args.html ||
      `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1e293b;max-width:560px;margin:0 auto">
        <div style="background:#2563eb;padding:16px 24px;border-radius:12px 12px 0 0">
          <span style="color:#fff;font-weight:700;font-size:18px">🏠 imoprice AI</span>
        </div>
        <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px">
          <p style="white-space:pre-wrap;margin:0">${escapeHtml(args.text || args.subject)}</p>
        </div>
        <p style="color:#94a3b8;font-size:12px;margin-top:16px">
          Estimation immobilière intelligente en Tunisie · imoprice AI
        </p>
      </div>`;

    try {
      const res = await vly.email.send({
        to: args.to,
        subject: args.subject,
        html,
        text: args.text || args.subject,
      });
      return { success: res?.success !== false, ...(res?.data ? { data: res.data } : {}) };
    } catch (e: any) {
      // Best-effort : une erreur d'envoi ne doit jamais faire échouer le flux.
      console.warn("[notifications] email send failed:", e?.message || e);
      return { success: false, error: String(e?.message || e) };
    }
  },
});

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
