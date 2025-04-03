const { Pool } = require('pg');

const pool = new Pool({
  user: 'image_user',
  host: 'localhost',
  database: 'image_db',
  password: 'image_db',
  port: 5434,
});

module.exports = pool;

