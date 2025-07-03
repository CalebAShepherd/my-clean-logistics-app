const express = require('express');
const router = express.Router();
const axios = require('axios');

// POST /api/floorplan/analyze
router.post('/analyze', async (req, res) => {
  try {
    const { base64Image, width, height } = req.body;
    // Forward request to Python CV service
    const response = await axios.post('http://localhost:5001/analyze', { base64Image, width, height });
    res.json(response.data);
  } catch (err) {
    console.error('Floorplan analysis proxy error:', err.message);
    if (err.response && err.response.data) {
      return res.status(err.response.status).json(err.response.data);
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 