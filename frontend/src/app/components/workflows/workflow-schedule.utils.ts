import type { WorkflowScheduleDraft, WorkflowScheduleRecord } from './workflow-types';

export function detectUserTimezone(): string {
  if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat !== "function") {
    return "UTC";
  }

  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof timezone === "string" && timezone.trim() ? timezone : "UTC";
  } catch {
    return "UTC";
  }
}

export function buildStableScheduleName(existingSchedules: Array<Pick<WorkflowScheduleDraft, "name">> = []): string {
  const used = new Set(
    existingSchedules
      .map((schedule) => schedule.name?.trim())
      .filter((name): name is string => Boolean(name)),
  );

  let index = 1;
  while (used.has(`Schedule ${index}`)) {
    index += 1;
  }
  return `Schedule ${index}`;
}

export function getEmptyScheduleDraft(existingSchedules: Array<Pick<WorkflowScheduleDraft, "name">> = []): WorkflowScheduleDraft {
  return {
    id: `schedule-${Math.random().toString(36).slice(2, 10)}`,
    name: buildStableScheduleName(existingSchedules),
    enabled: false,
    mode: "once",
    scheduledAt: "",
    repeatPreset: "daily",
    repeatInterval: "1",
    repeatUnit: "minutes",
    repeatTime: "09:00",
    repeatWeekday: "1",
    customCron: "",
    timezone: detectUserTimezone(),
  };
}

export function hydrateScheduleDraftFromRecord(record?: WorkflowScheduleRecord | null): WorkflowScheduleDraft {
  if (!record) {
    return getEmptyScheduleDraft();
  }

  if (record.ruleType === "once") {
    return {
      id: record.id,
      name: record.name,
      enabled: record.enabled,
      mode: "once",
      scheduledAt: toDateTimeLocalValue(record.expression),
      repeatPreset: "daily",
      repeatInterval: "1",
      repeatUnit: "minutes",
      repeatTime: "09:00",
      repeatWeekday: "1",
      customCron: "",
      timezone: record.timezone,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  const cronSummary = describeCronExpression(record.expression);
  return {
    id: record.id,
    name: record.name,
    enabled: record.enabled,
    mode: "repeat",
    scheduledAt: "",
    repeatPreset: cronSummary.repeatPreset,
    repeatInterval: cronSummary.repeatInterval,
    repeatUnit: cronSummary.repeatUnit,
    repeatTime: cronSummary.repeatTime,
    repeatWeekday: cronSummary.repeatWeekday,
    customCron: cronSummary.customCron,
    timezone: record.timezone,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}


function toDateTimeLocalValue(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 16);
}

export function toIsoStringOrFallback(value: string, fallback: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed.toISOString();
}

function formatScheduledAtForDisplay(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Set a valid date and time";
  }
  return parsed.toLocaleString();
}

export function buildCronExpression(schedule: WorkflowScheduleDraft): string {
  if (schedule.repeatPreset === "custom") {
    return schedule.customCron.trim();
  }

  if (schedule.repeatPreset === "interval") {
    const interval = Math.max(1, Number.parseInt(schedule.repeatInterval, 10) || 1);

    if (schedule.repeatUnit === "seconds") {
      return `*/${interval} * * * * *`;
    }
    if (schedule.repeatUnit === "minutes") {
      return `*/${interval} * * * *`;
    }
    if (schedule.repeatUnit === "hours") {
      return `0 */${interval} * * *`;
    }
    if (schedule.repeatUnit === "months") {
      const [hour = "9", minute = "0"] = schedule.repeatTime.split(":");
      return `${Number(minute)} ${Number(hour)} 1 */${interval} *`;
    }
  }

  const [hour = "9", minute = "0"] = schedule.repeatTime.split(":");

  if (schedule.repeatPreset === "weekdays") {
    return `${Number(minute)} ${Number(hour)} * * 1-5`;
  }

  if (schedule.repeatPreset === "weekly") {
    return `${Number(minute)} ${Number(hour)} * * ${schedule.repeatWeekday}`;
  }

  return `${Number(minute)} ${Number(hour)} * * *`;
}

function formatConfiguredScheduleSummary(schedule: WorkflowScheduleDraft): string {
  if (schedule.mode === "once" && schedule.scheduledAt) {
    return `Runs once on ${formatScheduledAtForDisplay(schedule.scheduledAt)}`;
  }

  if (schedule.mode === "repeat") {
    if (schedule.repeatPreset === "interval") {
      const amount = Number.parseInt(schedule.repeatInterval, 10) || 1;
      if (["years", "decades", "centuries"].includes(schedule.repeatUnit)) {
        return `Every ${amount} ${schedule.repeatUnit} is not supported by cron schedules yet`;
      }
      if (schedule.repeatUnit === "months") {
        return `Every ${amount} month${amount === 1 ? "" : "s"} on day 1 at ${schedule.repeatTime || "00:00"}`;
      }
      return `Every ${amount} ${schedule.repeatUnit}`;
    }
    if (schedule.repeatPreset === "custom") {
      return "Repeats with a custom rule";
    }
    if (schedule.repeatPreset === "weekdays") {
      return `Repeats every weekday at ${schedule.repeatTime}`;
    }
    if (schedule.repeatPreset === "weekly") {
      const weekdayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return `Repeats every ${weekdayLabels[Number(schedule.repeatWeekday)]} at ${schedule.repeatTime}`;
    }
    return `Repeats every day at ${schedule.repeatTime}`;
  }

  return "Schedule ready";
}

export function formatScheduleSummary(schedule: WorkflowScheduleDraft): string {
  const summary = formatConfiguredScheduleSummary(schedule);

  if (!schedule.enabled) {
    if (summary === "Schedule ready") {
      return "No schedule yet";
    }
    return `Disabled · ${summary}`;
  }

  return summary;
}

export function formatIntervalScheduleLabel(schedule: Pick<WorkflowScheduleDraft, "repeatInterval" | "repeatUnit">): string {
  const amount = Math.max(1, Number.parseInt(schedule.repeatInterval, 10) || 1);
  const singularUnit = schedule.repeatUnit.endsWith("s")
    ? schedule.repeatUnit.slice(0, -1)
    : schedule.repeatUnit;
  return `Every ${amount} ${amount === 1 ? singularUnit : schedule.repeatUnit}`;
}

export function describeCronExpression(expression: string): Pick<WorkflowScheduleDraft, "repeatPreset" | "repeatInterval" | "repeatUnit" | "repeatTime" | "repeatWeekday" | "customCron"> {
  const trimmed = expression.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length !== 5 && parts.length !== 6) {
    return {
      repeatPreset: "custom",
      repeatInterval: "1",
      repeatUnit: "minutes",
      repeatTime: "09:00",
      repeatWeekday: "1",
      customCron: trimmed,
    };
  }
  const secondInterval = trimmed.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*\s+\*$/);
  if (secondInterval) {
    return {
      repeatPreset: "interval",
      repeatInterval: secondInterval[1] ?? "1",
      repeatUnit: "seconds",
      repeatTime: "09:00",
      repeatWeekday: "1",
      customCron: "",
    };
  }
  const minuteInterval = trimmed.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/);
  if (minuteInterval) {
    return {
      repeatPreset: "interval",
      repeatInterval: minuteInterval[1] ?? "1",
      repeatUnit: "minutes",
      repeatTime: "09:00",
      repeatWeekday: "1",
      customCron: "",
    };
  }
  const hourInterval = trimmed.match(/^0\s+\*\/(\d+)\s+\*\s+\*\s+\*$/);
  if (hourInterval) {
    return {
      repeatPreset: "interval",
      repeatInterval: hourInterval[1] ?? "1",
      repeatUnit: "hours",
      repeatTime: "09:00",
      repeatWeekday: "1",
      customCron: "",
    };
  }
  const monthlyInterval = trimmed.match(/^(\d+)\s+(\d+)\s+1\s+\*\/(\d+)\s+\*$/);
  if (monthlyInterval) {
    const minute = monthlyInterval[1] ?? "0";
    const hour = monthlyInterval[2] ?? "0";
    const interval = monthlyInterval[3] ?? "1";
    return {
      repeatPreset: "interval",
      repeatInterval: interval,
      repeatUnit: "months",
      repeatTime: `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`,
      repeatWeekday: "1",
      customCron: "",
    };
  }
  const baseParts = parts.length === 6 ? parts.slice(1) : parts;
  const [minute, hour, dayOfMonth, month, dayOfWeek] = baseParts;
  const repeatTime = `${String(Number(hour ?? 9)).padStart(2, "0")}:${String(Number(minute ?? 0)).padStart(2, "0")}`;
  if (dayOfMonth === "*" && month === "*") {
    if (dayOfWeek === "*") {
      return { repeatPreset: "daily", repeatInterval: "1", repeatUnit: "minutes", repeatTime, repeatWeekday: "1", customCron: "" };
    }
    if (dayOfWeek === "1-5") {
      return { repeatPreset: "weekdays", repeatInterval: "1", repeatUnit: "minutes", repeatTime, repeatWeekday: "1", customCron: "" };
    }
    if (/^[0-6]$/.test(dayOfWeek)) {
      return { repeatPreset: "weekly", repeatInterval: "1", repeatUnit: "minutes", repeatTime, repeatWeekday: dayOfWeek, customCron: "" };
    }
  }
  return {
    repeatPreset: "custom",
    repeatInterval: "1",
    repeatUnit: "minutes",
    repeatTime,
    repeatWeekday: "1",
    customCron: trimmed,
  };
}
