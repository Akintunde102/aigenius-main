import { Clock3, Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  formatIntervalScheduleLabel,
  formatScheduleSummary,
  type WorkflowDraft,
  type WorkflowScheduleDraft,
} from "./workflowsUtils";
import { formatDateTime } from "./workflowsStudio.utils";

export type WorkflowsStudioSchedulePanelsProps = {
  scheduleOpen: boolean;
  scheduleAddOpen: boolean;
  headerPanelMaxHeight: string;
  draft: WorkflowDraft;
  enabledScheduleCount: number;
  selectedSchedule: WorkflowScheduleDraft | null;
  openScheduleEditor: (scheduleId: string) => void;
  setScheduleAddOpen: React.Dispatch<React.SetStateAction<boolean>>;
  updateSelectedSchedule: (updater: (schedule: WorkflowScheduleDraft) => WorkflowScheduleDraft) => void;
  timezoneOverrideOpenForScheduleId: string | null;
  setTimezoneOverrideOpenForScheduleId: React.Dispatch<React.SetStateAction<string | null>>;
  setDraft: React.Dispatch<React.SetStateAction<WorkflowDraft>>;
  setSelectedScheduleId: React.Dispatch<React.SetStateAction<string | null>>;
  scheduleSaving: boolean;
  handleScheduleSave: () => void | Promise<void>;
};

export function WorkflowsStudioSchedulePanels({
  scheduleOpen,
  scheduleAddOpen,
  headerPanelMaxHeight,
  draft,
  enabledScheduleCount,
  selectedSchedule,
  openScheduleEditor,
  setScheduleAddOpen,
  updateSelectedSchedule,
  timezoneOverrideOpenForScheduleId,
  setTimezoneOverrideOpenForScheduleId,
  setDraft,
  setSelectedScheduleId,
  scheduleSaving,
  handleScheduleSave,
}: WorkflowsStudioSchedulePanelsProps) {
  return (
    <>
      {scheduleOpen ? (
        <div
          id="workflow-schedule-panel"
          className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white p-3 shadow-md dark:border-slate-700/80 dark:bg-slate-900/45"
          style={{ maxHeight: headerPanelMaxHeight }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Schedules</p>
              <p className="mt-1 text-[11px] text-slate-700 dark:text-slate-300">
                {draft.schedules.length === 0
                  ? "No schedules yet"
                  : `${enabledScheduleCount} active · ${draft.schedules.length - enabledScheduleCount} paused`}
              </p>
            </div>
          </div>

          <div className="mt-3 min-h-0 flex-1">
            <div className="flex h-full min-h-0 flex-col rounded-lg border border-slate-200/90 bg-slate-50/80 dark:border-slate-700/80 dark:bg-slate-950/20">
              <div className="border-b border-slate-200/80 px-2.5 py-2 dark:border-slate-700/80">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Schedule list</p>
              </div>
              <div className="workflow-scroll workflow-header-scroll min-h-0 flex-1 space-y-2 overflow-y-auto px-2.5 py-2 pr-1.5">
                {draft.schedules.length === 0 ? (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Add a one-time or recurring schedule.</p>
                ) : (
                  draft.schedules.map((schedule) => (
                    <button
                      key={schedule.id}
                      type="button"
                      onClick={() => openScheduleEditor(schedule.id)}
                      className={`block w-full rounded-lg border px-2.5 py-2 text-left transition ${selectedSchedule?.id === schedule.id
                          ? "border-teal-500/60 bg-teal-50/80 shadow-sm dark:border-cyan-500/60 dark:bg-cyan-500/10"
                          : "border-slate-200/90 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-950/30 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-900/60"
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-slate-800 dark:text-slate-100">{schedule.name || "Untitled schedule"}</span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${schedule.enabled
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                                : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600/60 dark:bg-slate-800/70 dark:text-slate-400"
                              }`}
                          >
                            {schedule.enabled ? "Active" : "Paused"}
                          </span>
                          <span className="text-[10px] uppercase tracking-wide text-slate-500">
                            {schedule.mode === "once" ? "once" : "recurring"}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-[10px] text-slate-600 dark:text-slate-400">{formatScheduleSummary(schedule)}</p>
                      <div className="mt-2 space-y-1 text-[9px] uppercase tracking-wide text-slate-500">
                        <p>Created {formatDateTime(schedule.createdAt)}</p>
                        <p>Updated {formatDateTime(schedule.updatedAt)}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {scheduleAddOpen ? (
        <div
          id="workflow-schedule-add-panel"
          className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white p-3 shadow-md dark:border-slate-700/80 dark:bg-slate-900/45"
          style={{ maxHeight: headerPanelMaxHeight }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Add schedule</p>
              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">Create a one-time or recurring run without replacing the list or history panels.</p>
            </div>
            <button
              type="button"
              onClick={() => setScheduleAddOpen(false)}
              className="inline-flex h-7 items-center rounded-md border border-slate-200/90 bg-white px-2.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700/80 dark:bg-slate-950/35 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-900/60"
            >
              Close
            </button>
          </div>

          <div className="workflow-scroll workflow-header-scroll mt-3 min-h-0 flex-1 overflow-y-auto pr-1.5">
            {selectedSchedule ? (
              <div className="space-y-3 rounded-lg border border-slate-200/90 bg-slate-50/80 p-3 dark:border-slate-700/80 dark:bg-slate-950/30">
                <div className="space-y-2">
                  <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">Name</span>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <input
                      id="schedule-name-input"
                      type="text"
                      value={selectedSchedule.name}
                      onChange={(e) => updateSelectedSchedule((schedule) => ({ ...schedule, name: e.target.value }))}
                      aria-label="Schedule name"
                      className="min-h-[34px] min-w-0 flex-1 rounded border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-800 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/30 dark:border-slate-600/80 dark:bg-slate-900/60 dark:text-slate-100 dark:focus:border-cyan-500/50 dark:focus:ring-cyan-500/30"
                    />
                    <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={selectedSchedule.enabled}
                        onChange={(e) => updateSelectedSchedule((schedule) => ({ ...schedule, enabled: e.target.checked }))}
                        className="rounded border-slate-300 dark:border-slate-600"
                      />
                      Enabled
                    </label>
                  </div>
                </div>

                <div className="rounded border border-slate-200/90 bg-white px-2 py-1.5 dark:border-slate-700/70 dark:bg-slate-900/50">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Timezone</p>
                      <p className="truncate text-[11px] leading-snug text-slate-800 dark:text-slate-300">{selectedSchedule.timezone || "Auto-detected"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTimezoneOverrideOpenForScheduleId((current) =>
                          current === selectedSchedule.id ? null : selectedSchedule.id,
                        );
                      }}
                      className="inline-flex h-7 shrink-0 items-center rounded-md border border-slate-200/90 bg-white px-2.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700/80 dark:bg-slate-950/35 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-900/60"
                    >
                      {timezoneOverrideOpenForScheduleId === selectedSchedule.id ? "Hide timezone" : "Pick different timezone"}
                    </button>
                  </div>
                  {timezoneOverrideOpenForScheduleId === selectedSchedule.id ? (
                    <label className="mt-2 block">
                      <input
                        id="schedule-timezone-input"
                        type="text"
                        value={selectedSchedule.timezone}
                        onChange={(e) => updateSelectedSchedule((schedule) => ({ ...schedule, timezone: e.target.value }))}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-800 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/30 dark:border-slate-600/80 dark:bg-slate-900/60 dark:text-slate-100 dark:focus:border-cyan-500/50 dark:focus:ring-cyan-500/30"
                      />
                    </label>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">Frequency</span>
                  <div className="grid grid-cols-2 gap-1 rounded-md border border-slate-200/90 bg-slate-100/80 p-1 dark:border-slate-700/70 dark:bg-slate-900/40" role="group" aria-label="Schedule frequency">
                    <button
                      type="button"
                      className={`min-h-[34px] rounded px-2 py-1.5 text-[11px] font-medium transition ${selectedSchedule.mode === "once"
                          ? "bg-white text-teal-900 shadow-sm ring-1 ring-slate-200 dark:bg-cyan-500/25 dark:text-cyan-100 dark:ring-cyan-500/40"
                          : "text-slate-600 hover:bg-white/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-200"
                        }`}
                      onClick={() => updateSelectedSchedule((schedule) => ({ ...schedule, mode: "once" }))}
                    >
                      Once
                    </button>
                    <button
                      type="button"
                      className={`min-h-[34px] rounded px-2 py-1.5 text-[11px] font-medium transition ${selectedSchedule.mode === "repeat"
                          ? "bg-white text-teal-900 shadow-sm ring-1 ring-slate-200 dark:bg-cyan-500/25 dark:text-cyan-100 dark:ring-cyan-500/40"
                          : "text-slate-600 hover:bg-white/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-200"
                        }`}
                      onClick={() => updateSelectedSchedule((schedule) => ({ ...schedule, mode: "repeat" }))}
                    >
                      Repeat
                    </button>
                  </div>
                </div>

                {selectedSchedule.mode === "once" ? (
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">Date and time</span>
                    <input
                      id="schedule-once-datetime"
                      type="datetime-local"
                      value={selectedSchedule.scheduledAt}
                      onChange={(e) => updateSelectedSchedule((schedule) => ({ ...schedule, scheduledAt: e.target.value }))}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-800 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/30 dark:border-slate-600/80 dark:bg-slate-900/60 dark:text-slate-100 dark:focus:border-cyan-500/50 dark:focus:ring-cyan-500/30"
                    />
                  </label>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={`block ${selectedSchedule.repeatPreset === "interval" ? "sm:col-span-2" : ""}`}>
                      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">Pattern</span>
                      {selectedSchedule.repeatPreset === "interval" ? (
                        <>
                          <div className="flex items-center gap-2">
                            <select
                              id="schedule-repeat-preset"
                              value={selectedSchedule.repeatPreset}
                              onChange={(e) => updateSelectedSchedule((schedule) => ({
                                ...schedule,
                                repeatPreset: e.target.value as WorkflowScheduleDraft["repeatPreset"],
                              }))}
                              className="w-32 shrink-0 rounded border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-800 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/30 dark:border-slate-600/80 dark:bg-slate-900/60 dark:text-slate-100 dark:focus:border-cyan-500/50 dark:focus:ring-cyan-500/30"
                            >
                              <option value="daily" className="dark:bg-slate-900 dark:text-slate-100">Daily</option>
                              <option value="weekdays" className="dark:bg-slate-900 dark:text-slate-100">Weekdays</option>
                              <option value="weekly" className="dark:bg-slate-900 dark:text-slate-100">Weekly</option>
                              <option value="interval" className="dark:bg-slate-900 dark:text-slate-100">Every…</option>
                              <option value="custom" className="dark:bg-slate-900 dark:text-slate-100">Custom cron</option>
                            </select>
                            <input
                              id="schedule-repeat-interval"
                              type="number"
                              min="1"
                              step="1"
                              value={selectedSchedule.repeatInterval}
                              onChange={(e) => updateSelectedSchedule((schedule) => ({ ...schedule, repeatInterval: e.target.value }))}
                              className="h-[34px] w-20 shrink-0 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/30 dark:border-slate-600/80 dark:bg-slate-900/60 dark:text-slate-100 dark:focus:border-cyan-500/50 dark:focus:ring-cyan-500/30"
                            />
                            <select
                              id="schedule-repeat-unit"
                              value={selectedSchedule.repeatUnit}
                              onChange={(e) => updateSelectedSchedule((schedule) => ({
                                ...schedule,
                                repeatUnit: e.target.value as WorkflowScheduleDraft["repeatUnit"],
                              }))}
                              className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-800 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/30 dark:border-slate-600/80 dark:bg-slate-900/60 dark:text-slate-100 dark:focus:border-cyan-500/50 dark:focus:ring-cyan-500/30"
                            >
                              <option value="seconds" className="dark:bg-slate-900 dark:text-slate-100">Seconds</option>
                              <option value="minutes" className="dark:bg-slate-900 dark:text-slate-100">Minutes</option>
                              <option value="hours" className="dark:bg-slate-900 dark:text-slate-100">Hours</option>
                              <option value="days" className="dark:bg-slate-900 dark:text-slate-100">Days</option>
                              <option value="months" className="dark:bg-slate-900 dark:text-slate-100">Months</option>
                              <option value="years" className="dark:bg-slate-900 dark:text-slate-100">Years</option>
                              <option value="decades" className="dark:bg-slate-900 dark:text-slate-100">Decades</option>
                              <option value="centuries" className="dark:bg-slate-900 dark:text-slate-100">Centuries</option>
                            </select>
                          </div>
                          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                            {formatIntervalScheduleLabel(selectedSchedule)}
                          </p>
                        </>
                      ) : (
                        <select
                          id="schedule-repeat-preset-select"
                          value={selectedSchedule.repeatPreset}
                          onChange={(e) => updateSelectedSchedule((schedule) => ({
                            ...schedule,
                            repeatPreset: e.target.value as WorkflowScheduleDraft["repeatPreset"],
                          }))}
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-800 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/30 dark:border-slate-600/80 dark:bg-slate-900/60 dark:text-slate-100 dark:focus:border-cyan-500/50 dark:focus:ring-cyan-500/30"
                        >
                          <option value="daily" className="dark:bg-slate-900 dark:text-slate-100">Daily</option>
                          <option value="weekdays" className="dark:bg-slate-900 dark:text-slate-100">Weekdays</option>
                          <option value="weekly" className="dark:bg-slate-900 dark:text-slate-100">Weekly</option>
                          <option value="interval" className="dark:bg-slate-900 dark:text-slate-100">Every…</option>
                          <option value="custom" className="dark:bg-slate-900 dark:text-slate-100">Custom cron</option>
                        </select>
                      )}
                    </label>
                    {selectedSchedule.repeatPreset === "interval" ? (
                      <>
                        {selectedSchedule.repeatUnit === "months" ? (
                          <label className="block sm:col-span-2">
                            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">Time</span>
                            <input
                              id="schedule-repeat-time"
                              type="time"
                              value={selectedSchedule.repeatTime}
                              onChange={(e) => updateSelectedSchedule((schedule) => ({ ...schedule, repeatTime: e.target.value }))}
                              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-800 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/30 dark:border-slate-600/80 dark:bg-slate-900/60 dark:text-slate-100 dark:focus:border-cyan-500/50 dark:focus:ring-cyan-500/30"
                            />
                            <p className="mt-1 text-[10px] text-slate-500">Monthly intervals run on day 1 at the chosen time.</p>
                          </label>
                        ) : null}
                        {["years", "decades", "centuries"].includes(selectedSchedule.repeatUnit) ? (
                          <p className="text-[10px] leading-relaxed text-amber-600 dark:text-amber-300 sm:col-span-2">
                            These units are visible here, but cron-based workflow schedules cannot represent them yet.
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <label className="block">
                        <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">Time</span>
                        <input
                          id="schedule-repeat-time-select"
                          type="time"
                          value={selectedSchedule.repeatTime}
                          onChange={(e) => updateSelectedSchedule((schedule) => ({ ...schedule, repeatTime: e.target.value }))}
                          disabled={selectedSchedule.repeatPreset === "custom"}
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-800 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/30 disabled:opacity-50 dark:border-slate-600/80 dark:bg-slate-900/60 dark:text-slate-100 dark:focus:border-cyan-500/50 dark:focus:ring-cyan-500/30"
                        />
                      </label>
                    )}
                    {selectedSchedule.repeatPreset === "weekly" ? (
                      <label className="block">
                        <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">Weekday</span>
                        <select
                          id="schedule-repeat-weekday"
                          value={selectedSchedule.repeatWeekday}
                          onChange={(e) => updateSelectedSchedule((schedule) => ({ ...schedule, repeatWeekday: e.target.value }))}
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-800 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/30 dark:border-slate-600/80 dark:bg-slate-900/60 dark:text-slate-100 dark:focus:border-cyan-500/50 dark:focus:ring-cyan-500/30"
                        >
                          <option value="0" className="dark:bg-slate-900 dark:text-slate-100">Sunday</option>
                          <option value="1" className="dark:bg-slate-900 dark:text-slate-100">Monday</option>
                          <option value="2" className="dark:bg-slate-900 dark:text-slate-100">Tuesday</option>
                          <option value="3" className="dark:bg-slate-900 dark:text-slate-100">Wednesday</option>
                          <option value="4" className="dark:bg-slate-900 dark:text-slate-100">Thursday</option>
                          <option value="5" className="dark:bg-slate-900 dark:text-slate-100">Friday</option>
                          <option value="6" className="dark:bg-slate-900 dark:text-slate-100">Saturday</option>
                        </select>
                      </label>
                    ) : null}
                    {selectedSchedule.repeatPreset === "custom" ? (
                      <label className="block sm:col-span-2">
                        <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">Cron</span>
                        <input
                          id="schedule-custom-cron"
                          type="text"
                          value={selectedSchedule.customCron}
                          onChange={(e) => updateSelectedSchedule((schedule) => ({ ...schedule, customCron: e.target.value }))}
                          placeholder="15 9 * * 1-5"
                          className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-800 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/30 dark:border-slate-600/80 dark:bg-slate-900/60 dark:text-slate-100 dark:focus:border-cyan-500/50 dark:focus:ring-cyan-500/30"
                        />
                      </label>
                    ) : null}
                  </div>
                )}

                <div className="mt-1 border-t border-slate-200/80 pt-3 dark:border-slate-700/60">
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-md border-rose-200 bg-rose-50 px-2.5 text-[11px] font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-700/70 dark:bg-rose-950/20 dark:text-rose-100 dark:hover:bg-rose-900/40"
                      onClick={() => {
                        setDraft((current) => ({
                          ...current,
                          schedules: current.schedules.filter((schedule) => schedule.id !== selectedSchedule.id),
                        }));
                        setSelectedScheduleId((current) =>
                          current === selectedSchedule.id ? draft.schedules.find((schedule) => schedule.id !== selectedSchedule.id)?.id ?? null : current,
                        );
                      }}
                    >
                      Remove
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 rounded-md bg-teal-600 px-2.5 text-[11px] font-medium text-white hover:bg-teal-500 dark:bg-cyan-600 dark:hover:bg-cyan-500"
                      disabled={scheduleSaving}
                      onClick={() => void handleScheduleSave()}
                    >
                      {scheduleSaving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden /> : <Clock3 className="mr-1 h-3 w-3" aria-hidden />}
                      Save schedules
                    </Button>
                  </div>
                  <div className="mt-3 space-y-0.5 border-t border-slate-200/80 pt-3 text-[10px] text-slate-500 dark:border-slate-700/40">
                    <p>Created {formatDateTime(selectedSchedule.createdAt)}</p>
                    <p>Updated {formatDateTime(selectedSchedule.updatedAt)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded border border-dashed border-slate-200/90 bg-slate-50/50 px-3 py-6 text-[11px] text-slate-500 dark:border-slate-700/80 dark:bg-slate-950/20 dark:text-slate-400">
                Click the plus button to start a new schedule.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
