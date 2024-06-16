const express = require('express');
const bodyParser = require('body-parser');
const screenshot = require('screenshot-desktop');
const fs = require('fs').promises;

const app = express();
const port = 3001;

app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from 'public' folder

// Endpoint to receive capture coordinates and dimensions
app.post('/capture', async (req, res) => {
  const { x, y, width, height } = req.body;

  try {
    // Capture screenshot of the specified area
    const img = await screenshot({
      screen: {
        x: x,
        y: y,
        width: width,
        height: height
      }
    });

    // Save the screenshot to a file (optional)
    const fileName = `screenshot_${Date.now()}.png`;
    await fs.writeFile(`public/${fileName}`, img);

    console.log('Screenshot captured and saved as', fileName);

    res.sendStatus(200); // Respond with success status
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    res.sendStatus(500); // Respond with error status
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
