import { useMutation, useQuery } from "convex/react";
import { api } from "./convex";
import type { InboxMessage } from "./types";

/** Boîte de réception + compteur de non-lus. */
export function useGetMyInbox(): { messages: InboxMessage[]; unread: number } | undefined {
  return useQuery(api.messages.getMyInbox);
}

export function useMarkMessagesRead() {
  return useMutation(api.messages.markMessagesRead);
}

export function useMarkAllMessagesRead() {
  return useMutation(api.messages.markAllMessagesRead);
}
