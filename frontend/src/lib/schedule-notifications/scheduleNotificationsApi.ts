import { authorizedFetch } from "@/lib/api/auth-client";
import { LINKS } from "@/lib/links";

const NOTIFICATIONS_BASE = `${LINKS.noboxAPIRootUrl}/gateway/*/notifications`;

export type ScheduleRunNotificationPhase = "started" | "finished";
export type ScheduleRunNotificationOutcome = "completed" | "failed" | "cancelled";

export type ScheduleRunNotificationDto = {
  id: string;
  userId: string;
  workflowId: string;
  runId: string;
  scheduleId: string | null;
  phase: ScheduleRunNotificationPhase;
  outcome: ScheduleRunNotificationOutcome | null;
  workflowName: string;
  message: string | null;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string | null;
};

export type ScheduleNotificationsListResponse = {
  items: ScheduleRunNotificationDto[];
  nextCursor: string | null;
};

export async function fetchScheduleNotifications(options?: {
  limit?: number;
  cursor?: string;
}): Promise<ScheduleNotificationsListResponse> {
  const params = new URLSearchParams();
  if (options?.limit != null) params.set("limit", String(options.limit));
  if (options?.cursor) params.set("cursor", options.cursor);
  const q = params.toString();
  const url = q ? `${NOTIFICATIONS_BASE}?${q}` : NOTIFICATIONS_BASE;
  const res = await authorizedFetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`Failed to load notifications (${res.status})`);
  }
  return (await res.json()) as ScheduleNotificationsListResponse;
}

export async function markScheduleNotificationRead(id: string): Promise<void> {
  const res = await authorizedFetch(`${NOTIFICATIONS_BASE}/${id}/read`, {
    method: "PATCH",
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to mark read (${res.status})`);
  }
}

export async function markAllScheduleNotificationsRead(): Promise<{ updated: number }> {
  const res = await authorizedFetch(`${NOTIFICATIONS_BASE}/read-all`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`Failed to mark all read (${res.status})`);
  }
  return (await res.json()) as { updated: number };
}

export async function deleteScheduleNotification(id: string): Promise<void> {
  const res = await authorizedFetch(`${NOTIFICATIONS_BASE}/${id}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to delete notification (${res.status})`);
  }
}

export const SCHEDULE_NOTIFICATIONS_EVENTS_URL = `${NOTIFICATIONS_BASE}/events`;

export type ScheduleNotificationSsePayload = {
  type: "schedule_notification";
  notification: ScheduleRunNotificationDto;
};
