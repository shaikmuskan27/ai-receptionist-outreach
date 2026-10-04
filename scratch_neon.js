const endpoint = "https://ep-silent-leaf-b4nfyxp4-pooler.c-6.us-east-2.aws.neon.tech/sql";
const connStr = "postgresql://neondb_owner:npg_7BVzILMdct9O@ep-silent-leaf-b4nfyxp4-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function test() {
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + connStr,
      'Neon-Connection-String': connStr
    },
    body: JSON.stringify({ query: 'SELECT 1 as num' })
  });
  console.log(resp.status);
  console.log(await resp.text());
}
test();
