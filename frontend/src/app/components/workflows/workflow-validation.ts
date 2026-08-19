import type { WorkflowDraft, WorkflowValidation } from './workflow-types';
import { scanArgsForLastToken } from './workflow-token.utils';

export function validateWorkflowDraft(draft: WorkflowDraft): WorkflowValidation {
  const issues: string[] = [];

  if (!draft.name.trim()) {
    issues.push("Give your workflow a name.");
  }

  if (draft.steps.length === 0) {
    issues.push("Add at least one step.");
  }

  const seenStepIds = new Set<string>();
  draft.steps.forEach((step, index) => {
    if (!step.toolName) {
      issues.push(`Choose a tool for Step ${index + 1}.`);
    }
    if (!step.label.trim()) {
      issues.push(`Give Step ${index + 1} a short name.`);
    }
    if (!step.stepId.trim()) {
      issues.push(`Step ${index + 1} is missing its saved ID.`);
    }
    if (seenStepIds.has(step.stepId)) {
      issues.push(`Step IDs must be unique. "${step.stepId}" is repeated.`);
    }
    seenStepIds.add(step.stepId);

    if (step.resultLink?.sourceStepId && step.resultLink.targetPath && index === 0) {
      issues.push("The first step cannot use an earlier step result.");
    }
    if (index === 0 && scanArgsForLastToken(step.args)) {
      issues.push("The first step cannot use {{ last }} — there is no previous step output.");
    }
  });

  draft.schedules.forEach((schedule, index) => {
    if (!schedule.name.trim()) {
      issues.push(`Give schedule ${index + 1} a short name.`);
    }
    if (!schedule.enabled) {
      return;
    }
    if (schedule.mode === "once" && !schedule.scheduledAt) {
      issues.push("Pick a date and time for your scheduled run.");
    }
    if (schedule.mode === "once" && schedule.scheduledAt && Number.isNaN(new Date(schedule.scheduledAt).getTime())) {
      issues.push("Use a valid date and time for your scheduled run.");
    }

    if (schedule.mode === "repeat") {
      if (schedule.repeatPreset === "interval") {
        const parsedInterval = Number.parseInt(schedule.repeatInterval, 10);
        if (!Number.isFinite(parsedInterval) || parsedInterval < 1) {
          issues.push("Use a whole number greater than 0 for the repeat interval.");
        }
        if (["years", "decades", "centuries"].includes(schedule.repeatUnit)) {
          issues.push("Years, decades, and centuries are not supported by cron schedules yet.");
        }
      }
      if (schedule.repeatPreset === "custom" && !schedule.customCron.trim()) {
        issues.push("Add a custom repeat rule or choose a simpler repeat option.");
      }
      if (
        schedule.repeatPreset !== "custom" &&
        schedule.repeatPreset !== "interval" &&
        !schedule.repeatTime
      ) {
        issues.push("Choose a repeat time.");
      }
      if (schedule.repeatPreset === "interval" && schedule.repeatUnit === "months" && !schedule.repeatTime) {
        issues.push("Choose a run time for monthly intervals.");
      }
    }
  });

  return {
    isValid: issues.length === 0,
    totalIssues: issues.length,
    issues,
  };
}

/** Validation for saving to the API (allows empty steps; name defaults in {@link formatWorkflowDraftForApi}). */
export function validateWorkflowDraftForRemotePersist(draft: WorkflowDraft): WorkflowValidation {
  const issues: string[] = [];

  const seenStepIds = new Set<string>();
  draft.steps.forEach((step, index) => {
    if (!step.toolName) {
      issues.push(`Choose a tool for Step ${index + 1}.`);
    }
    if (!step.label.trim()) {
      issues.push(`Give Step ${index + 1} a short name.`);
    }
    if (!step.stepId.trim()) {
      issues.push(`Step ${index + 1} is missing its saved ID.`);
    }
    if (seenStepIds.has(step.stepId)) {
      issues.push(`Step IDs must be unique. "${step.stepId}" is repeated.`);
    }
    seenStepIds.add(step.stepId);

    if (step.resultLink?.sourceStepId && step.resultLink.targetPath && index === 0) {
      issues.push("The first step cannot use an earlier step result.");
    }
    if (index === 0 && scanArgsForLastToken(step.args)) {
      issues.push("The first step cannot use {{ last }} — there is no previous step output.");
    }
  });

  draft.schedules.forEach((schedule, index) => {
    if (!schedule.name.trim()) {
      issues.push(`Give schedule ${index + 1} a short name.`);
    }
    if (!schedule.enabled) {
      return;
    }
    if (schedule.mode === "once" && !schedule.scheduledAt) {
      issues.push("Pick a date and time for your scheduled run.");
    }
    if (schedule.mode === "once" && schedule.scheduledAt && Number.isNaN(new Date(schedule.scheduledAt).getTime())) {
      issues.push("Use a valid date and time for your scheduled run.");
    }

    if (schedule.mode === "repeat") {
      if (schedule.repeatPreset === "interval") {
        const parsedInterval = Number.parseInt(schedule.repeatInterval, 10);
        if (!Number.isFinite(parsedInterval) || parsedInterval < 1) {
          issues.push("Use a whole number greater than 0 for the repeat interval.");
        }
        if (["years", "decades", "centuries"].includes(schedule.repeatUnit)) {
          issues.push("Years, decades, and centuries are not supported by cron schedules yet.");
        }
      }
      if (schedule.repeatPreset === "custom" && !schedule.customCron.trim()) {
        issues.push("Add a custom repeat rule or choose a simpler repeat option.");
      }
      if (
        schedule.repeatPreset !== "custom" &&
        schedule.repeatPreset !== "interval" &&
        !schedule.repeatTime
      ) {
        issues.push("Choose a repeat time.");
      }
      if (schedule.repeatPreset === "interval" && schedule.repeatUnit === "months" && !schedule.repeatTime) {
        issues.push("Choose a run time for monthly intervals.");
      }
    }
  });

  return {
    isValid: issues.length === 0,
    totalIssues: issues.length,
    issues,
  };
}
