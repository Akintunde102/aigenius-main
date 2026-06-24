"use client";

import React, { useEffect } from "react";
import toast from "react-hot-toast";
import {
  authorizedFetch,
  getAccessToken,
  subscribeToTokenRefresh,
} from "@/lib/api/auth-client";
import { ScheduleRunToast } from "@/app/components/schedule-notifications/ScheduleRunToast";
import {
  SCHEDULE_NOTIFICATIONS_EVENTS_URL,
  type ScheduleNotificationSsePayload,
  type ScheduleRunNotificationDto,
} from "@/lib/schedule-notifications/scheduleNotificationsApi";

/** Dispatched when a new schedule notification arrives (for list pages to refetch). */
export const SCHEDULE_NOTIFICATIONS_REFRESH_EVENT = "aigenius:schedule-notifications-refresh";

/** Side toasts: short, skimmable, dismissible; animation in schedule-notification-toast.scss */
const SCHEDULE_TOAST_CLASS = "schedule-notification-toast";
const SCHEDULE_TOAST_DURATION_MS = 6_000;

const scheduleToastOpts = {
  duration: SCHEDULE_TOAST_DURATION_MS,
  className: SCHEDULE_TOAST_CLASS,
  position: "top-right" as const,
};

function dispatchRefresh(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SCHEDULE_NOTIFICATIONS_REFRESH_EVENT));
}

function showToastForNotification(n: ScheduleRunNotificationDto): void {
  const name = n.workflowName?.trim() || "Workflow";
  if (n.phase === "started") {
    toast.custom(
      (t) => React.createElement(ScheduleRunToast, { t, variant: "started", workflowName: name }),
      scheduleToastOpts,
    );
    return;
  }
  if (n.phase === "finished") {
    if (n.outcome === "completed") {
      toast.custom(
        (t) => React.createElement(ScheduleRunToast, { t, variant: "ended_ok", workflowName: name }),
        scheduleToastOpts,
      );
      return;
    }
    if (n.outcome === "failed") {
      toast.custom(
        (t) => React.createElement(ScheduleRunToast, { t, variant: "ended_error", workflowName: name }),
        scheduleToastOpts,
      );
      return;
    }
    toast.custom(
      (t) => React.createElement(ScheduleRunToast, { t, variant: "ended_cancelled", workflowName: name }),
      scheduleToastOpts,
    );
  }
}

/**
 * Subscribes to SSE for schedule-run notifications; shows toasts and broadcasts a refresh event.
 */
export async function runScheduleNotificationEventsSubscription(
  url: string,
  getToken: () => string | undefined,
  signal: AbortSignal,
): Promise<void> {
  const jwtToken = getToken();
  if (!jwtToken) return;

  const res = await authorizedFetch(url, {
    method: "GET",
    headers: { Accept: "text/event-stream", Authorization: `Bearer ${jwtToken}` },
    signal,
  });
  if (!res.ok || !res.body) return;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventType = "";

  const handleData = (dataJson: string) => {
    if (eventType !== "schedule_notification") {
      eventType = "";
      return;
    }
    try {
      const data = JSON.parse(dataJson) as ScheduleNotificationSsePayload;
      if (data?.type !== "schedule_notification" || !data.notification) {
        return;
      }
      showToastForNotification(data.notification);
      dispatchRefresh();
    } catch {
      /* ignore */
    }
    eventType = "";
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          const payload = line.slice(6);
          if (payload) {
            handleData(payload);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function useScheduleNotificationEvents(): void {
  useEffect(() => {
    const url = SCHEDULE_NOTIFICATIONS_EVENTS_URL;
    let controller = new AbortController();

    const start = () =>
      runScheduleNotificationEventsSubscription(url, () => getAccessToken(), controller.signal).catch(
        (err: unknown) => {
          if (err instanceof Error && err.name === "AbortError") return;
          console.warn("Schedule notification SSE error", err);
        },
      );

    void start();

    const unsubscribe = subscribeToTokenRefresh(() => {
      controller.abort();
      controller = new AbortController();
      void start();
    });

    return () => {
      unsubscribe();
      controller.abort();
    };
  }, []);
}
