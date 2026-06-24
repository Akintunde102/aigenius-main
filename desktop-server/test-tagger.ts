import { tagImage } from './src/search/indexer/extractors/yolo-tagger.js';
import path from 'path';

async function test() {
  const imagePath = 'c:/Users/DELL5530/Desktop/projects/aigenius/desktop-server/dog.jpg';
  const modelsDir = 'c:/Users/DELL5530/Desktop/projects/aigenius/desktop/src/models';

  console.log('Testing tagImage...');
  const labels = await tagImage(imagePath, modelsDir);
  console.log('Detected labels:', labels);
}

test();
