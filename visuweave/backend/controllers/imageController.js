const pool = require('../config/dbConfig');

exports.getImages = async (req, res) => {
  try {
    // Sample query - adjust based on your database structure
    const result = await pool.query('SELECT * FROM images WHERE category = $1', [req.query.category]);

    if (result.rows.length > 0) {
      res.json(result.rows); // Send the image data as JSON
    } else {
      res.status(404).send('No images found for this category');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

