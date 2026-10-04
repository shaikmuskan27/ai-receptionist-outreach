const fs = require('fs');
const { Client } = require('pg');

const dataStr = fs.readFileSync('C:\\Users\\ADMIN\\Downloads\\leads_backup_2026-10-04.json', 'utf8');
const leads = JSON.parse(dataStr);

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_7BVzILMdct9O@ep-silent-leaf-b4nfyxp4-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function run() {
  await client.connect();
  console.log('Connected to DB.');
  await client.query('BEGIN');
  await client.query('DELETE FROM leads_v1');
  for (const lead of leads) {
    await client.query('INSERT INTO leads_v1 (id, data) VALUES ($1, $2)', [lead.id, JSON.stringify(lead)]);
  }
  await client.query('COMMIT');
  console.log(`Successfully integrated ${leads.length} leads from backup.`);
  await client.end();
}

run().catch(console.error);
