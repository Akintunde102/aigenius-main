/** Standing 3D mascot — Three.js RobotExpressive (CC0 public domain by Tomás Laulhé) */
export const MASCOT_MODEL_URL = "/mascot/robot.glb";

export const IDLE_CLIP_PREFERENCE = [
  "Standing",
  "Idle",
  "Survey",
  "Idle_2",
] as const;

export const WALK_CLIP_PREFERENCE = [
  "Walking",
  "Walk",
  "Survey",
] as const;

export const DANCE_CLIP_PREFERENCE = [
  "Dance",
  "Run",
  "Walk",
] as const;

export const EXCITED_CLIP_PREFERENCE = [
  "Wave",
  "ThumbsUp",
  "Jump",
  "Dance",
  "Run",
] as const;

export type MascotRoutineStep = {
  clip: string;
  durationMs: number;
  spinSpeed: number;
  timeScale: number;
};

export function pickClipName(
  available: string[],
  preference: readonly string[],
): string | null {
  if (available.length === 0) {
    return null;
  }

  for (const name of preference) {
    if (available.includes(name)) {
      return name;
    }
  }

  return available[0] ?? null;
}

export function computeFitScale(sizeY: number, targetHeight: number): number {
  if (!Number.isFinite(sizeY) || sizeY <= 0) {
    return 1;
  }
  if (!Number.isFinite(targetHeight) || targetHeight <= 0) {
    return 1;
  }
  return targetHeight / sizeY;
}

export function buildMascotDanceRoutine(
  available: string[],
): MascotRoutineStep[] {
  const idle = pickClipName(available, IDLE_CLIP_PREFERENCE);
  const walk = pickClipName(available, WALK_CLIP_PREFERENCE);
  const dance = pickClipName(available, DANCE_CLIP_PREFERENCE);

  const steps: MascotRoutineStep[] = [];

  if (idle) {
    steps.push({
      clip: idle,
      // Survey is a longer-hold idle — give it more time so the head-turns show
      durationMs: 3200,
      spinSpeed: 0.35,
      timeScale: 1,
    });
  }
  if (walk) {
    steps.push({
      clip: walk,
      durationMs: 2800,
      spinSpeed: 1.1,
      timeScale: 1.05,
    });
  }
  if (dance && dance !== walk) {
    steps.push({
      clip: dance,
      // Run is the exciting beat — keep it brief so it punches
      durationMs: 1800,
      spinSpeed: 2.0,
      timeScale: 1.1,
    });
  }

  return steps;
}
