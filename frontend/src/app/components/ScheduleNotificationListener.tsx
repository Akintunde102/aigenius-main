"use client";

import { useScheduleNotificationEvents } from "@/lib/hooks/useScheduleNotificationEvents";

/** One global SSE subscription for schedule-run notifications (toasts + list refresh signal). */
export default function ScheduleNotificationListener() {
  useScheduleNotificationEvents();
  return null;
}
