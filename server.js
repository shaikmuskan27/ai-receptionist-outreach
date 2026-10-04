require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files from current directory
app.use(express.static(__dirname));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize database
pool.query(`
  CREATE TABLE IF NOT EXISTS leads_v1 (
    id BIGINT PRIMARY KEY,
    data JSONB
  )
`).then(() => console.log('Database table verified/created.'))
  .catch(err => console.error('Error creating database table:', err));

// Get all leads
app.get('/api/leads', async (req, res) => {
  try {
    const result = await pool.query('SELECT data FROM leads_v1 ORDER BY id DESC');
    res.json(result.rows.map(row => row.data));
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ error: err.message });
  }
});

// Save all leads (sync from frontend)
app.post('/api/leads', async (req, res) => {
  const leads = req.body;
  if (!Array.isArray(leads)) {
    return res.status(400).json({ error: 'Expected an array of leads' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Clear existing to replace with the incoming state (since frontend is the source of truth for now)
    await client.query('DELETE FROM leads_v1');
    for (const lead of leads) {
      await client.query('INSERT INTO leads_v1 (id, data) VALUES ($1, $2)', [lead.id, lead]);
    }
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error saving leads:', e);
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
