import * as ort from 'onnxruntime-node';
import path from 'path';

async function inspect() {
  const modelPath = path.join(__dirname, '..', 'src', 'models', 'yolox_nano.onnx');
  try {
    const session = await ort.InferenceSession.create(modelPath);
    console.log('Model loaded successfully.');
    console.log('Input Names:', session.inputNames);
    console.log('Output Names:', session.outputNames);

    // Create a dummy float32 input
    const dummyInput = new Float32Array(1 * 3 * 416 * 416); // Guessing 416 for nano
    const tensor = new ort.Tensor('float32', dummyInput, [1, 3, 416, 416]);
    const res = await session.run({ images: tensor });
    const output0 = res[session.outputNames[0]];
    console.log('Output Shape:', output0.dims);
  } catch (err) {
    console.error('Error loading model:', err);
  }
}

inspect();
