import sharp from 'sharp';

async function main() {
  const filePath = 'C:/Users/DELL5530/Pictures/Screenshot 2026-05-02 205352.png';

  try {
    const { data, info } = await sharp(filePath)
      .resize(416, 416, { fit: 'fill' })
      .flatten({ background: { r: 114, g: 114, b: 114 } })
      .raw()
      .toBuffer({ resolveWithObject: true });

    console.log('Info:', info);          // channels, width, height
    console.log('Buffer size:', data.length);   // must be 519168
    console.log('Sample pixels:', Array.from(data.slice(0, 12)));  // real RGB values?
  } catch (error) {
    console.error('Error processing image:', error);
  }
}

main();
