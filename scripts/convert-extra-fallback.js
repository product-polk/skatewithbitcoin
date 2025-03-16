const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Paths
const fallbacksDir = path.join(__dirname, '../public/images/bitcoin-fallbacks');
const svgFile = 'bitcoin-fallback.svg';
const svgPath = path.join(fallbacksDir, svgFile);
const pngPath = path.join(fallbacksDir, svgFile.replace('.svg', '.png'));

// Size for output PNG
const size = 128;

async function convertSvgToPng() {
  console.log(`Converting ${svgFile} to PNG...`);
  
  try {
    // Read SVG file
    const svgData = fs.readFileSync(svgPath);
    
    // Convert to PNG with sharp
    await sharp(svgData)
      .resize(size, size)
      .png()
      .toFile(pngPath);
    
    console.log(`Successfully created ${pngPath}`);
  } catch (error) {
    console.error(`Error converting ${svgFile}:`, error);
  }
}

// Run the conversion
convertSvgToPng().catch(err => {
  console.error('Error:', err);
}); 