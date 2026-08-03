import { authorizedFetch } from "@/lib/api/auth-client";
import { resolveGatewayApiRootUrl } from "@/lib/api/resolve-gateway-api-root";

async function notificationsBase(): Promise<string> {
  const root = await resolveGatewayApiRootUrl();
  return `${root}/gateway/*/notifications`;
}

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
  const base = await notificationsBase();
  const params = new URLSearchParams();
  if (options?.limit != null) params.set("limit", String(options.limit));
  if (options?.cursor) params.set("cursor", options.cursor);
  const q = params.toString();
  const url = q ? `${base}?${q}` : base;
  const res = await authorizedFetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`Failed to load notifications (${res.status})`);
  }
  return (await res.json()) as ScheduleNotificationsListResponse;
}

export async function markScheduleNotificationRead(id: string): Promise<void> {
  const base = await notificationsBase();
  const res = await authorizedFetch(`${base}/${id}/read`, {
    method: "PATCH",
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to mark read (${res.status})`);
  }
}

export async function markAllScheduleNotificationsRead(): Promise<{ updated: number }> {
  const base = await notificationsBase();
  const res = await authorizedFetch(`${base}/read-all`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`Failed to mark all read (${res.status})`);
  }
  return (await res.json()) as { updated: number };
}

export async function deleteScheduleNotification(id: string): Promise<void> {
  const base = await notificationsBase();
  const res = await authorizedFetch(`${base}/${id}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to delete notification (${res.status})`);
  }
}

export async function getScheduleNotificationsEventsUrl(): Promise<string> {
  return `${await notificationsBase()}/events`;
}

export type ScheduleNotificationSsePayload = {
  type: "schedule_notification";
  notification: ScheduleRunNotificationDto;
};
