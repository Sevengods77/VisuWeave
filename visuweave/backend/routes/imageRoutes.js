const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Endpoint to get all available images
router.get('/api/images', (req, res) => {
  const imageDir = path.join(__dirname, '../../public/images');
  fs.readdir(imageDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Error reading image directory' });
    }
    const images = files.map((file) => ({ filename: file }));
    res.json(images);
  });
});

// Serve images statically from /public/images
router.use('/public/images', express.static(path.join(__dirname, '../../public/images')));

module.exports = router;

