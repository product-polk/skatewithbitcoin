const fs = require('fs');
const path = require('path');

// Paths
const obstaclesDir = path.join(__dirname, '../public/images/Obstacles');

// Files to check and fix
const filesToCheck = [
  { incorrect: 'pizza,png.png', correct: 'pizza.png' },
  { incorrect: 'bitcoinetf.png.png', correct: 'bitcoinetf.png' }
];

// Function to fix filenames
async function fixFilenames() {
  console.log('Checking obstacle filenames...');
  
  // Make sure the directory exists
  if (!fs.existsSync(obstaclesDir)) {
    console.log(`Creating Obstacles directory: ${obstaclesDir}`);
    fs.mkdirSync(obstaclesDir, { recursive: true });
  }
  
  // Check each file
  for (const file of filesToCheck) {
    const incorrectPath = path.join(obstaclesDir, file.incorrect);
    const correctPath = path.join(obstaclesDir, file.correct);
    
    // Check if incorrect filename exists
    if (fs.existsSync(incorrectPath)) {
      console.log(`Fixing filename: ${file.incorrect} -> ${file.correct}`);
      
      // Copy file with correct name
      fs.copyFileSync(incorrectPath, correctPath);
      console.log(`Fixed ${file.correct}`);
    } else {
      // Check if correct filename exists
      if (fs.existsSync(correctPath)) {
        console.log(`File already exists with correct name: ${file.correct}`);
      } else {
        console.log(`Neither ${file.incorrect} nor ${file.correct} exists in the obstacles directory`);
      }
    }
  }
  
  console.log('Filename check complete!');
}

// Run the script
fixFilenames().catch(err => {
  console.error('Error fixing filenames:', err);
}); 