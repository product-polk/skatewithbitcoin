const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Paths
const imagesDir = path.join(__dirname, '../public/images');

// SVG files to convert
const svgFiles = [
  'bitcoin-symbol.svg',
  'btc-icon.svg'
];

// Size for output PNGs
const size = 128;

// Convert each SVG to PNG
async function convertSvgToPng() {
  for (const svgFile of svgFiles) {
    const svgPath = path.join(imagesDir, svgFile);
    const pngPath = path.join(imagesDir, svgFile.replace('.svg', '.png'));
    
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
}

// Also fix the file naming issues
async function fixNamingIssues() {
  // Fix 'pizza,png.png' to 'pizza.png'
  const incorrectPizzaPath = path.join(imagesDir, 'Obstacles', 'pizza,png.png');
  const correctPizzaPath = path.join(imagesDir, 'Obstacles', 'pizza.png');
  
  if (fs.existsSync(incorrectPizzaPath)) {
    console.log('Fixing pizza filename...');
    fs.copyFileSync(incorrectPizzaPath, correctPizzaPath);
  }
  
  // Fix 'bitcoinetf.png.png' to 'bitcoinetf.png'
  const incorrectBitcoinEtfPath = path.join(imagesDir, 'Obstacles', 'bitcoinetf.png.png');
  const correctBitcoinEtfPath = path.join(imagesDir, 'Obstacles', 'bitcoinetf.png');
  
  if (fs.existsSync(incorrectBitcoinEtfPath)) {
    console.log('Fixing bitcoinetf filename...');
    fs.copyFileSync(incorrectBitcoinEtfPath, correctBitcoinEtfPath);
  }
}

// Run the conversion
async function run() {
  await convertSvgToPng();
  await fixNamingIssues();
  console.log('All conversions and fixes complete!');
}

run().catch(err => {
  console.error('Error:', err);
}); 