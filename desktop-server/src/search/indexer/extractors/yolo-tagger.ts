/**
 * image-tagger.ts
 *
 * Runs YOLOX-nano inference on an image file and returns a list of
 * detected COCO object labels.
 *
 * Model expected: yolox_nano.onnx  (YOLOX-nano trained on COCO)
 * Input:          [1, 3, 416, 416]  float32, BGR, values in [0, 1]
 * Output:         [1, N, 85]        float32  — N anchor boxes × 85 values
 *                 each row: [cx, cy, w, h, obj_conf, cls_0 … cls_79]
 */

import type * as OrtTypes from 'onnxruntime-node';
import { ensureModelsDownloaded } from '../../models-downloader.js';
import { loadSharp } from '../../sharp-loader.js';
import fs from 'fs';
import path from 'path';

/**
 * `onnxruntime-node`'s bundled DirectML binding calls dlopen() as soon as the module is
 * evaluated, before any inference runs. On machines where DirectML/D3D12 device probing in its
 * DllMain fails (no compatible GPU, remote desktop session, outdated GPU driver), that crashes
 * the *entire* process with ERR_DLOPEN_FAILED — even though image tagging is a purely optional
 * feature that already degrades gracefully when its model is missing. A static top-level import
 * would make that unrecoverable; load it lazily and behind a try/catch instead.
 */
let ortModule: typeof OrtTypes | null | undefined;

async function loadOrt(): Promise<typeof OrtTypes | null> {
  if (ortModule !== undefined) return ortModule;
  try {
    ortModule = await import('onnxruntime-node');
  } catch (err) {
    console.warn('[tagger] onnxruntime-node unavailable — image tagging disabled:', err);
    ortModule = null;
  }
  return ortModule;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** COCO 80-class labels, ordered to match the model's class indices. */
const COCO_LABELS: readonly string[] = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train',
  'truck', 'boat', 'traffic light', 'fire hydrant', 'stop sign',
  'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
  'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag',
  'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball', 'kite',
  'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana',
  'apple', 'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza',
  'donut', 'cake', 'chair', 'couch', 'potted plant', 'bed', 'dining table',
  'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone',
  'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock',
  'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush',
];

const NUM_CLASSES = COCO_LABELS.length;           // 80
const VALUES_PER_BOX = 5 + NUM_CLASSES;              // 85  (x,y,w,h,obj + classes)
const INPUT_SIZE = 416;                           // model's expected H and W
const CONF_THRESHOLD = 0.05;                          // obj_conf × class_conf cutoff
const MODEL_INPUT_NAME = 'images';                      // verify with: session.inputNames

// ---------------------------------------------------------------------------
// Session cache  (one per process, created lazily)
// ---------------------------------------------------------------------------

let cachedSession: OrtTypes.InferenceSession | null = null;

/**
 * Returns the ONNX inference session, creating it on first call.
 * Throws a descriptive error if the model file is missing or onnxruntime-node is unavailable.
 */
async function loadSession(modelsDir: string): Promise<OrtTypes.InferenceSession> {
  if (cachedSession) return cachedSession;

  const ort = await loadOrt();
  if (!ort) {
    throw new Error('onnxruntime-node unavailable');
  }

  const modelPath = path.join(modelsDir, 'yolox_nano.onnx');
  if (!fs.existsSync(modelPath)) {
    console.warn(`[yolo-tagger] YOLOX model missing at "${modelPath}". Attempting download...`);
    await ensureModelsDownloaded(modelsDir);
    if (!fs.existsSync(modelPath)) {
      throw new Error(`YOLOX model failed to download at "${modelPath}".`);
    }
  }

  // Log the model's actual I/O names once so you can verify MODEL_INPUT_NAME
  cachedSession = await ort.InferenceSession.create(modelPath, {
    executionProviders: ['cpu'],
  });

  console.log('[tagger] Model input  names:', cachedSession.inputNames);
  console.log('[tagger] Model output names:', cachedSession.outputNames);

  return cachedSession;
}

// ---------------------------------------------------------------------------
// Image preprocessing
// ---------------------------------------------------------------------------

/**
 * Loads an image, resizes it to INPUT_SIZE × INPUT_SIZE, and converts it
 * into a float32 tensor in CHW (Channel-Height-Width) layout with BGR
 * channel order and pixel values normalised to [0, 1].
 *
 * YOLOX is trained with BGR input normalised to [0, 1] — both requirements
 * must be met or the model will produce near-zero confidences.
 *
 * Layout produced:
 *   [ B-plane (INPUT_SIZE²), G-plane (INPUT_SIZE²), R-plane (INPUT_SIZE²) ]
 *
 * @returns Tensor shaped [1, 3, INPUT_SIZE, INPUT_SIZE]
 */
async function buildInputTensor(filePath: string, ort: typeof OrtTypes): Promise<OrtTypes.Tensor> {
  const pixelsPerChannel = INPUT_SIZE * INPUT_SIZE;

  // Use letterboxing (contain) with 114 padding, and flatten with 114
  const sharp = await loadSharp();
  const rgbBytes = await sharp(filePath)
    .resize(INPUT_SIZE, INPUT_SIZE, {
      fit: 'contain',
      background: { r: 114, g: 114, b: 114 },
    })
    .flatten({ background: { r: 114, g: 114, b: 114 } })
    .raw()
    .toBuffer();

  const float32 = new Float32Array(3 * pixelsPerChannel);

  for (let px = 0; px < pixelsPerChannel; px++) {
    const srcOffset = px * 3;
    const r = rgbBytes[srcOffset];
    const g = rgbBytes[srcOffset + 1];
    const b = rgbBytes[srcOffset + 2];

    // Write in RGB channel order (CHW layout)
    float32[px] = r;  // channel 0 — Red
    float32[pixelsPerChannel + px] = g;  // channel 1 — Green
    float32[2 * pixelsPerChannel + px] = b;  // channel 2 — Blue
  }

  return new ort.Tensor('float32', float32, [1, 3, INPUT_SIZE, INPUT_SIZE]);
}

// ---------------------------------------------------------------------------
// Output decoding
// ---------------------------------------------------------------------------

/**
 * Decodes the raw YOLOX output tensor into a set of COCO label strings.
 *
 * YOLOX output shape: [1, numBoxes, 85]
 *   - index 0–3 : bounding box  (cx, cy, w, h)
 *   - index 4   : objectness confidence
 *   - index 5–84: per-class confidence scores
 *
 * Final score = objectness × argmax(class confidences)
 * A detection is kept when final score ≥ CONF_THRESHOLD.
 */
function decodeDetections(output: OrtTypes.Tensor): Set<string> {
  const data = output.data as Float32Array;

  // Derive dims from the tensor itself — never hardcode.
  const [, numBoxes] = output.dims as number[];

  const allDetections: { label: string, conf: number }[] = [];
  const detected = new Set<string>();
  let maxConfSeen = 0;
  for (let box = 0; box < numBoxes; box++) {
    const base = box * VALUES_PER_BOX;
    const objConf = data[base + 4];
    let bestClassConf = 0;
    let bestClassIdx = 0;
    for (let cls = 0; cls < NUM_CLASSES; cls++) {
      const clsConf = data[base + 5 + cls];
      if (clsConf > bestClassConf) {
        bestClassConf = clsConf;
        bestClassIdx = cls;
      }
    }
    const finalConf = objConf * bestClassConf;
    if (finalConf > 0.01) {
      allDetections.push({ label: COCO_LABELS[bestClassIdx], conf: finalConf });
    }
    if (finalConf > maxConfSeen) maxConfSeen = finalConf;
    if (finalConf >= CONF_THRESHOLD) {
      detected.add(COCO_LABELS[bestClassIdx]);
    }
  }

  // Log top 5
  allDetections.sort((a, b) => b.conf - a.conf);
  console.log('[tagger] Top 5 detections:');
  allDetections.slice(0, 5).forEach(d => console.log(`  - ${d.label}: ${d.conf.toFixed(4)}`));

  // Diagnostics — useful while tuning CONF_THRESHOLD
  if (detected.size === 0) {
    console.log(`[tagger] No objects detected. Max conf seen: ${maxConfSeen.toFixed(4)}`);
  } else {
    console.log(
      `[tagger] Detected: ${[...detected].join(', ')}  (max conf: ${maxConfSeen.toFixed(4)})`,
    );
  }

  return detected;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detects objects in an image and returns the unique COCO labels found.
 *
 * Returns an empty array when the model file is absent so callers can
 * degrade gracefully without crashing.
 *
 * @param filePath   Absolute path to the image file.
 * @param modelsDir  Directory that contains `yolox_nano.onnx`.
 * @returns          Array of unique label strings, e.g. ["person", "car"].
 */
export async function tagImage(
  filePath: string,
  modelsDir: string,
): Promise<string[]> {
  // Graceful degradation: if the model isn't downloaded, skip silently.
  let session: OrtTypes.InferenceSession;
  try {
    session = await loadSession(modelsDir);
  } catch (err) {
    console.warn('[tagger] Skipping image tagging:', (err as Error).message);
    return [];
  }

  const ort = await loadOrt();
  if (!ort) {
    return [];
  }
  const inputTensor = await buildInputTensor(filePath, ort);

  const outputs = await session.run({ [MODEL_INPUT_NAME]: inputTensor });
  const outputTensor = outputs[session.outputNames[0]];

  const labels = decodeDetections(outputTensor);
  return [...labels];
}