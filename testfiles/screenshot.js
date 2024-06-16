const screenshot = require('screenshot-desktop');
const fs = require('fs');

// Function to capture a screenshot
async function takeScreenshot() {
  try {
    // Capture the screenshot
    const img = await screenshot();

    // Save the screenshot to a file (optional)
    fs.writeFileSync('screenshot.png', img);

    console.log('Screenshot captured and saved as screenshot.png');
  } catch (err) {
    console.error('Error capturing screenshot:', err);
  }
}

// Call the function to capture the screenshot
takeScreenshot();
