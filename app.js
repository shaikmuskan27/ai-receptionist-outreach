var STATUS=["New","Contacted","Responded","Demo booked","Won","Lost"];
var FLOW={
 in:[["call","Call and pitch"],["mail","Email right after the call"],["wa","WhatsApp if no reply in 2 days"],["f5","Second call (day 5)"],["f10","Final follow-up with demo video (day 10)"],["ask","Ask for a call or demo slot"]],
 intl:[["li","LinkedIn connect with short note"],["mail","Email"],["wa","WhatsApp"],["f2","Follow-up (day 2)"],["f5","Follow-up (day 5)"],["f10","Final follow-up with demo video (day 10)"],["ask","Ask for a call or demo slot"]]
};
var leads=[],open={},armed=null,editingId=null;
try{leads=JSON.parse(localStorage.getItem("leads_v1")||"[]")}catch(e){leads=[]}

import { Pool } from 'https://esm.sh/@neondatabase/serverless@0.9.3';
const pool = new Pool({ connectionString: "postgresql://neondb_owner:npg_7BVzILMdct9O@ep-silent-leaf-b4nfyxp4-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require" });

// Sync with database
pool.query('CREATE TABLE IF NOT EXISTS leads_v1 (id BIGINT PRIMARY KEY, data JSONB)')
  .then(() => pool.query('SELECT data FROM leads_v1 ORDER BY id DESC'))
  .then(function(res){
    const serverLeads = res.rows.map(r => typeof r.data === 'string' ? JSON.parse(r.data) : r.data);
    if (serverLeads && serverLeads.length > 0) {
      leads = serverLeads;
      render();
    } else if (leads.length > 0) {
      // Migrate local data to database
      save();
    }
  })
  .catch(function(err){ console.error("Could not load from DB:", err); });

async function save(){
  try{localStorage.setItem("leads_v1",JSON.stringify(leads))}catch(e){}
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM leads_v1');
    for (const lead of leads) {
      await client.query('INSERT INTO leads_v1 (id, data) VALUES ($1, $2)', [lead.id, JSON.stringify(lead)]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Could not save to DB:", err);
  } finally {
    client.release();
  }
}
function $(id){return document.getElementById(id)}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function today(){var d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function plus(n){var d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function isDue(l){return l.next&&l.next<=today()&&l.status!=="Won"&&l.status!=="Lost"}
function href(u){return /^https?:\/\//i.test(u)?u:"https://"+u}

$("fs").innerHTML+=STATUS.map(function(s){return "<option>"+s+"</option>"}).join("");

$("f").addEventListener("submit",function(e){
 e.preventDefault();var d=new FormData(e.target),o={};
 d.forEach(function(v,k){o[k]=String(v).trim()});
 if(editingId){
  var l=leads.filter(function(x){return x.id===editingId})[0];
  if(l){ for(var k in o) l[k]=o[k]; }
  cancelEdit();
 }else{
  o.id=Date.now();o.status="New";o.done={};o.next="";o.notes="";
  leads.unshift(o);
  e.target.reset();
 }
 save();render();
});
$("fc").addEventListener("click",cancelEdit);
function cancelEdit(){
 editingId=null;
 $("f").reset();
 $("fh2").innerText="Add lead";
 $("fb").innerText="Add lead";
 $("fc").style.display="none";
}

$("list").addEventListener("click",function(e){
 var lead=e.target.closest(".lead");if(!lead)return;
 var id=+lead.dataset.id,l=leads.filter(function(x){return x.id===id})[0];if(!l)return;
 if(e.target.closest(".head")){open[id]=!open[id];render();return}
 if(e.target.dataset.del){
  if(armed===id){armed=null;leads=leads.filter(function(x){return x.id!==id});save();render()}
  else{armed=id;render();setTimeout(function(){if(armed===id){armed=null;render()}},4000)}
 }
 if(e.target.dataset.edit){
  editingId=id;
  var f=$("f");
  for(var k in l){ if(f.elements[k]) f.elements[k].value=l[k]; }
  $("fh2").innerText="Edit lead";
  $("fb").innerText="Save changes";
  $("fc").style.display="block";
  window.scrollTo({top:0,behavior:"smooth"});
 }
});
$("list").addEventListener("input",function(e){
 var lead=e.target.closest(".lead");if(!lead)return;
 var id=+lead.dataset.id,l=leads.filter(function(x){return x.id===id})[0];if(!l)return;
 var t=e.target;
 if(t.dataset.notes)l.notes=t.value;
 if(t.dataset.next)l.next=t.value;
 save(); // Save instantly on typing without re-rendering to keep focus
});
$("list").addEventListener("change",function(e){
 var lead=e.target.closest(".lead");if(!lead)return;
 var id=+lead.dataset.id,l=leads.filter(function(x){return x.id===id})[0];if(!l)return;
 var t=e.target;
 if(t.dataset.step){
  l.done[t.dataset.step]=t.checked;
  if(t.checked&&l.status==="New")l.status="Contacted";
  if(t.checked&&!l.next)l.next=plus(2);
 }
 if(t.dataset.status)l.status=t.value;
 if(t.dataset.next)l.next=t.value;
 if(t.dataset.notes)l.notes=t.value;
 save();render();
});

function render(){
 var q=$("q").value.toLowerCase(),fs=$("fs").value,fr=$("fr").value;
 var c=function(s){return leads.filter(function(l){return l.status===s}).length};
 $("stats").innerHTML=
  '<div class="stat"><b>'+leads.length+'</b><span>Leads</span></div>'+
  '<div class="stat"><b>'+(leads.length-c("New"))+'</b><span>Contacted</span></div>'+
  '<div class="stat"><b>'+(c("Responded")+c("Demo booked")+c("Won"))+'</b><span>Responded</span></div>'+
  '<div class="stat"><b>'+c("Demo booked")+'</b><span>Demos booked</span></div>'+
  '<div class="stat due"><b>'+leads.filter(isDue).length+'</b><span>Follow-ups due</span></div>';
 var rows=leads.filter(function(l){
  return (!q||(l.company+" "+l.person).toLowerCase().indexOf(q)>-1)&&(!fs||l.status===fs)&&(!fr||l.region===fr);
 }).sort(function(a,b){return (isDue(b)?1:0)-(isDue(a)?1:0)});
 if(!rows.length){$("list").innerHTML='<div class="empty">'+(leads.length?"No leads match.":"No leads yet. Add your first one above.")+'</div>';return}
 $("list").innerHTML=rows.map(function(l){
  var steps=FLOW[l.region]||FLOW.in,n=steps.filter(function(s){return l.done[s[0]]}).length;
  var due=isDue(l);
  var phone=l.phone?'<a href="tel:'+esc(l.phone)+'">'+esc(l.phone)+'</a> &nbsp;<a href="https://wa.me/'+esc(l.phone.replace(/\D/g,""))+'" target="_blank" rel="noopener">WhatsApp</a>':"-";
  var mail=l.email?'<a href="mailto:'+esc(l.email)+'">'+esc(l.email)+'</a>':"-";
  var li=l.linkedin?'<a href="'+esc(href(l.linkedin))+'" target="_blank" rel="noopener">Open profile</a>':"-";
  return '<div class="lead'+(open[l.id]?" open":"")+'" data-id="'+l.id+'">'+
  '<div class="head"><div><strong>'+esc(l.company)+'</strong><small>'+esc(l.industry||"")+(l.country?" | "+esc(l.country):"")+'</small></div>'+
  '<div><strong>'+esc(l.person)+'</strong><small>'+esc(l.role)+'</small></div>'+
  '<span class="tag'+(due?" due":"")+'">'+(due?"Due ":"")+esc(l.status)+'</span><span class="prog">'+n+'/'+steps.length+'</span></div>'+
  '<div class="body"><div class="steps">'+
  steps.map(function(s){var d=l.done[s[0]];return '<label class="'+(d?"done":"")+'"><input type="checkbox" data-step="'+s[0]+'"'+(d?" checked":"")+'> '+s[1]+'</label>'}).join("")+
  '<div class="row"><select data-status="1">'+STATUS.map(function(s){return '<option'+(s===l.status?" selected":"")+'>'+s+'</option>'}).join("")+'</select>'+
  '<input type="date" data-next="1" value="'+esc(l.next)+'" title="Next follow-up"></div></div>'+
  '<div class="info"><div><span>Phone</span>'+phone+'</div><div><span>Email</span>'+mail+'</div><div><span>LinkedIn</span>'+li+'</div>'+
  '<div><span>Notes</span><input data-notes="1" value="'+esc(l.notes)+'" placeholder="Add a note"></div>'+
  '<div class="row"><button data-edit="1">Edit lead</button><button data-del="1"'+(armed===l.id?' class="pri"':'')+'>'+(armed===l.id?"Tap again to delete":"Delete lead")+'</button></div></div></div></div>';
 }).join("");
}

$("q").addEventListener("input",render);$("fs").addEventListener("change",render);$("fr").addEventListener("change",render);
$("exp").addEventListener("click",function(){
 var h=["company","industry","region","country","person","role","phone","email","linkedin","status","next","notes"];
 var csv=[h.join(",")].concat(leads.map(function(l){return h.map(function(k){return '"'+String(l[k]||"").replace(/"/g,'""')+'"'}).join(",")})).join("\n");
 var box=$("csvbox");box.style.display="block";box.querySelector("textarea").value=csv;box.querySelector("textarea").select();
 try{navigator.clipboard.writeText(csv)}catch(e){}
});
$("csvclose").addEventListener("click",function(){$("csvbox").style.display="none"});
$("backup").addEventListener("click",function(){
 var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(leads));
 var a = document.createElement("a");
 a.href = dataStr;
 a.download = "leads_backup_" + today() + ".json";
 a.click();
});
$("fileIn").addEventListener("change",function(e){
 var file = e.target.files[0];
 if(!file) return;
 var reader = new FileReader();
 reader.onload = function(e){
  try {
   var data = JSON.parse(e.target.result);
   if(Array.isArray(data)){
    if(confirm("Restore this backup? This will merge with your current leads.")){
     var map = {};
     leads.forEach(function(l){ map[l.id] = l; });
     data.forEach(function(l){ map[l.id] = l; });
     leads = Object.keys(map).map(function(k){return map[k]}).sort(function(a,b){return b.id - a.id});
     save(); render();
     alert("Backup restored successfully!");
    }
   } else { alert("Invalid backup file."); }
  } catch(err){ alert("Error reading file."); }
  $("fileIn").value = "";
 };
 reader.readAsText(file);
});
render();
