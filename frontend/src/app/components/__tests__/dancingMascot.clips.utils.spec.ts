import * as fs from "fs";
import * as path from "path";
import {
  buildMascotDanceRoutine,
  computeFitScale,
  pickClipName,
} from "../dancingMascot.clips.utils";

// The KhronosGroup Fox model has exactly three animation clips.
const FOX_CLIPS = ["Survey", "Walk", "Run"];

// Keep a broader canine set to exercise the preference-fallback logic
// without depending on a specific model asset.
const CANINE_CLIPS_LEGACY = [
  "Attack",
  "Death",
  "Eating",
  "Gallop",
  "Gallop_Jump",
  "Idle",
  "Idle_2",
  "Idle_2_HeadLow",
  "Idle_HitReact1",
  "Idle_HitReact2",
  "Jump_ToIdle",
  "Walk",
];

describe("pickClipName", () => {
  it("returns the first preferred clip that exists", () => {
    expect(pickClipName(CANINE_CLIPS_LEGACY, ["Gallop", "Walk"])).toBe("Gallop");
  });

  it("skips missing preference names and uses the next match", () => {
    expect(pickClipName(CANINE_CLIPS_LEGACY, ["Moonwalk", "Walk", "Idle"])).toBe(
      "Walk",
    );
  });

  it("falls back to the first available clip when nothing matches", () => {
    expect(pickClipName(["Hop"], ["Walk", "Idle"])).toBe("Hop");
  });

  it("returns null for an empty clip list", () => {
    expect(pickClipName([], ["Walk"])).toBeNull();
  });
});

describe("computeFitScale", () => {
  it("scales a tall model down to the target height", () => {
    expect(computeFitScale(3, 1.5)).toBeCloseTo(0.5);
  });

  it("returns 1 for zero or invalid sizes", () => {
    expect(computeFitScale(0, 1.2)).toBe(1);
    expect(computeFitScale(-4, 1.2)).toBe(1);
    expect(computeFitScale(2, 0)).toBe(1);
  });
});

// The RobotExpressive model animation clips.
const ROBOT_CLIPS = [
  "Dance",
  "Death",
  "Idle",
  "Jump",
  "No",
  "Punch",
  "Running",
  "Sitting",
  "Standing",
  "ThumbsUp",
  "Walking",
  "WalkJump",
  "Wave",
  "Yes",
];

describe("buildMascotDanceRoutine — Robot clips", () => {
  it("builds Standing/Idle, Walking, Dance steps from Robot clips", () => {
    const routine = buildMascotDanceRoutine(ROBOT_CLIPS);
    expect(routine.length).toBe(3);
    expect(["Standing", "Idle"]).toContain(routine[0]?.clip);
    expect(routine[1]?.clip).toBe("Walking");
    expect(routine[2]?.clip).toBe("Dance");
    // Dance step should spin faster than idle
    expect(routine[2]?.spinSpeed).toBeGreaterThan(routine[0]?.spinSpeed ?? 0);
  });

  it("builds Survey, Walk, Run steps from Fox clips fallback", () => {
    const routine = buildMascotDanceRoutine(FOX_CLIPS);
    expect(routine.map((step) => step.clip)).toEqual(["Survey", "Walk", "Run"]);
    expect(routine[2]?.spinSpeed).toBeGreaterThan(routine[0]?.spinSpeed ?? 0);
  });

  it("returns an empty routine when no clips exist", () => {
    expect(buildMascotDanceRoutine([])).toEqual([]);
  });
});

describe("vendored Robot mascot asset", () => {
  const robotGlbPath = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "public",
    "mascot",
    "robot.glb",
  );

  it("is a real glTF binary, not a Git LFS pointer", () => {
    const buf = fs.readFileSync(robotGlbPath);
    expect(buf.length).toBeGreaterThan(100_000);
    expect(buf.subarray(0, 4).toString("ascii")).toBe("glTF");
  });

  it("embeds the Robot animation clips used by the hero routine", () => {
    const buf = fs.readFileSync(robotGlbPath);
    const jsonLength = buf.readUInt32LE(12);
    const json = JSON.parse(buf.subarray(20, 20 + jsonLength).toString("utf8")) as {
      animations?: Array<{ name?: string }>;
    };
    const names = (json.animations ?? []).map((clip) => clip.name);
    expect(names).toEqual(
      expect.arrayContaining(["Dance", "Idle", "Walking", "Wave"]),
    );
  });
});
