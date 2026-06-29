// charset: utf-8
/* =======================================================
   WorkTrace - Application Logic
   =======================================================
   Sections:
   1. Config (Supabase URL + Key)
   2. Data (Locations, Supplies, Constants)
   3. State Variables
   4. Date Utilities
   5. UI Helpers (show/hide loader, auth, app)
   6. Auth Functions (sign in, sign up, sign out)
   7. Database Functions (load, save work logs)
   8. App Init
   9. Hero & Week Strip
   10. Location & Supply Grid
   11. Save / Clear Day
   12. View Switcher
   13. Dashboard
   14. Week View
   15. Report View
   16. Theme & Settings
   17. Role System
   18. Schedule (Manager + Employee views)
   19. Assignment Modal
   20. Requests System
   21. Boot Sequence
======================================================= */

/* --- 1. CONFIG --------------------------------------- */
const SUPABASE_URL='https://vwoylscgfhuzmsnkjdlu.supabase.co';
const SUPABASE_ANON_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3b3lsc2NnZmh1em1zbmtqZGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNDY0OTUsImV4cCI6MjA5NzcyMjQ5NX0.ci08mxviFw5le494yUUE70fTRnWi6TqqC1Rjk971k_s';
const{createClient}=window.supabase||supabase;
const sb=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const supabaseClient=sb;


/* --- 2. DATA: LOCATIONS & SUPPLIES ------------------- */
// LOCS is populated dynamically from the company's locations in Supabase
// Default fallback locations (used if no company loaded)
const DEFAULT_LOCS=[
  {id:'bravo',   name:'Bravo',           color:'#1a2840', abbr:'BR', keys:[]},
  {id:'swash',   name:'Swash',           color:'#0e3028', abbr:'SW', keys:[]},
  {id:'off-emp', name:'Office (Empire)', color:'#1a3a5c', abbr:'OE', keys:[]},
  {id:'empire',  name:'Empire',          color:'#2a1a40', abbr:'EM', keys:[]},
  {id:'broken',  name:'Broken',          color:'#3a1a1a', abbr:'BK', keys:[]},
  {id:'acs',     name:'ACS',             color:'#1a3a2a', abbr:'AC', keys:[]},
  {id:'wynyard', name:'Wynyard',         color:'#1a2a3a', abbr:'WY', keys:[]},
  {id:'parisole',name:'Parisole',        color:'#2d1a4a', abbr:'PA', keys:[]},
  {id:'off-par', name:'Office (Parisole)',color:'#1a3a5c',abbr:'OP', keys:[]},
  {id:'sweatshop',name:'Sweatshop',      color:'#1a2840', abbr:'SS', keys:[]},
  {id:'siso',    name:'Siso',            color:'#0e3028', abbr:'SI', keys:[]},
];
let LOCS=[...DEFAULT_LOCS];

const SUPS=[
  {id:'bio',name:'Bio Tabs',svg:'<path stroke-linecap="round" stroke-linejoin="round" d="M9 3h6m-6 0v6l-4 9a1 1 0 00.9 1.45h12.2A1 1 0 0019 18l-4-9V3"/>'},
  {id:'tp',name:'Toilet Paper',svg:'<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>'},
  {id:'paper',name:'Paper Towels',svg:'<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>'},
  {id:'soap',name:'Hand Soap',svg:'<path stroke-linecap="round" stroke-linejoin="round" d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/>'},
  {id:'bags',name:'Bin Bags',svg:'<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>'},
  {id:'spray',name:'Spray Bottle',svg:'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'},
];

const DABB=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DFULL=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];


/* --- 3. STATE VARIABLES ------------------------------ */
let ME=null,COMPANY=null,MY_ROLE='employee',selDate=td(),weekOff=0,repOff=0,logOff=0,cache={},tempL=new Set(),tempS=new Set();


/* --- 4. DATE UTILITIES ------------------------------- */
function td(){const d=new Date();return ds(d)}
function ds(d){return`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`}
function p2(n){return String(n).padStart(2,'0')}
function fd(s){const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)}
function mon(s){const d=fd(s),day=d.getDay(),diff=day===0?-6:1-day,m=new Date(d);m.setDate(d.getDate()+diff);return m}
function addD(d,n){const r=new Date(d);r.setDate(r.getDate()+n);return r}
function wkDates(off=0){const m=addD(mon(td()),off*7);return Array.from({length:7},(_,i)=>ds(addD(m,i)))}


/* --- 5. UI HELPERS ----------------------------------- */
function hideLoader(){document.getElementById('loader').classList.add('out')}
function showAuth(){const a=document.getElementById('authWrap');if(a){a.style.display='block';toggleAuth('in');}}
function hideAuth(){document.getElementById('authWrap').style.display='none'}
function showApp(){document.getElementById('app').style.cssText='display:flex;flex-direction:column';document.getElementById('bnav').style.display='flex'}
function hideApp(){document.getElementById('app').style.display='none';document.getElementById('bnav').style.display='none'}


/* --- 6. AUTH FUNCTIONS ------------------------------- */
function toggleAuth(m){
  const si=document.getElementById('siBox');
  const su=document.getElementById('suBox');
  if(si) si.style.display=m==='in'?'block':'none';
  if(su) su.style.display=m==='up'?'block':'none';
  ['siErr','siOk','suErr','suOk'].forEach(id=>{
    const e=document.getElementById(id);
    if(e){e.style.display='none';e.textContent='';}
  });
  if(m==='up') selectSignUpOption('create');
}

// Sign up option selection (create company vs join)
let suOption='create';
let suLocCount=0;
function selectSignUpOption(opt){
  suOption=opt;
  const cr=document.getElementById('suOptCreate');
  const jo=document.getElementById('suOptJoin');
  const cf=document.getElementById('suCreateFields');
  const jf=document.getElementById('suJoinFields');
  if(cr) cr.classList.toggle('on',opt==='create');
  if(jo) jo.classList.toggle('on',opt==='join');
  if(cf) cf.style.display=opt==='create'?'block':'none';
  if(jf) jf.style.display=opt==='join'?'block':'none';
}

function addSuLocation(){
  suLocCount++;
  const container=document.getElementById('suLocList');
  if(!container) return;
  const row=document.createElement('div');
  row.className='co-loc-row';
  row.id='su-loc-'+suLocCount;
  row.innerHTML='<input class="co-loc-input su-loc-input" type="text" placeholder="Location name" id="suLoc'+suLocCount+'"/>'
    +'<button type="button" onclick="removeSuLoc('+suLocCount+')" class="co-loc-del">x</button>';
  container.appendChild(row);
}
function removeSuLoc(n){
  const el=document.getElementById('su-loc-'+n);
  if(el) el.remove();
}
function msg(id,txt,t='err'){const e=document.getElementById(id);e.textContent=txt;e.className=`amsg ${t}`;e.style.display='block'}

async function doSignIn(){
  const email=document.getElementById('siEmail').value.trim();
  const pass=document.getElementById('siPass').value;
  if(!email||!pass){msg('siErr','Enter email and password');return}
  const b=document.getElementById('siBtn');b.disabled=true;b.textContent='Signing in...';
  const{error}=await sb.auth.signInWithPassword({email,password:pass});
  b.disabled=false;b.textContent='Sign In';
  if(error)msg('siErr',error.message);
}
async function doSignUp(){
  const email=document.getElementById('suEmail').value.trim();
  const pass=document.getElementById('suPass').value;
  if(!email||!pass){msg('suErr','Fill in all fields');return}
  if(pass.length<6){msg('suErr','Password must be 6+ characters');return}
  const b=document.getElementById('suBtn');b.disabled=true;b.textContent='Creating...';
  const{error}=await sb.auth.signUp({email,password:pass});
  b.disabled=false;b.textContent='Create Account';
  if(error)msg('suErr',error.message);
  else{msg('suOk','Account created - sign in below.','ok');toggleAuth('in')}
}
async function doSignUpFull(){
  const email=document.getElementById('suEmail')?.value.trim();
  const pass=document.getElementById('suPass')?.value;
  if(!email||!pass){msg('suErr','Fill in your email and password');return;}
  if(pass.length<6){msg('suErr','Password must be 6+ characters');return;}

  if(suOption==='create'){
    const coName=document.getElementById('suCompanyName')?.value.trim();
    if(!coName){msg('suErr','Enter your company name');return;}
    const locInputs=document.querySelectorAll('.su-loc-input');
    const locs=[];
    const colors=['#1a2840','#0e3028','#1a3a5c','#2a1a40','#3a1a1a','#1a3a2a','#1a2a3a','#2d1a4a','#1a3a5c','#1a2840','#0e3028'];
    locInputs.forEach((inp,i)=>{
      const n=inp.value.trim();
      if(n) locs.push({id:'loc'+i,name:n,img:'',color:colors[i%colors.length],abbr:n.substring(0,2).toUpperCase(),keys:[]});
    });
    if(!locs.length){msg('suErr','Add at least one location');return;}
    const btn=document.getElementById('suBtn');
    if(btn){btn.disabled=true;btn.textContent='Creating account...';}
    // Create auth account
    const{error:ae}=await sb.auth.signUp({email,password:pass});
    if(ae){msg('suErr',ae.message);if(btn){btn.disabled=false;btn.textContent='Create Account';}return;}
    // Sign in immediately
    const{data:sd,error:se}=await sb.auth.signInWithPassword({email,password:pass});
    if(se||!sd.user){msg('suErr','Account created - please sign in');toggleAuth('in');if(btn){btn.disabled=false;btn.textContent='Create Account';}return;}
    ME=sd.user;
    // Create company
    const company=await createCompany(coName,locs);
    if(!company){msg('suErr','Error creating company - please sign in and try again');if(btn){btn.disabled=false;btn.textContent='Create Account';}return;}
    COMPANY=company;LOCS=locs;MY_ROLE='admin';
    if(btn){btn.disabled=false;btn.textContent='Create Account';}
    hideAuth();showApp();
    document.getElementById('tbUser').textContent=ME.email;
    document.getElementById('tbRole').textContent='admin';
    renderHero();renderWS();await renderLocGrid();renderSupGrid();loadDayUI(selDate);
    showToast('Welcome! Invite code: '+company.invite_code);

  } else {
    // Join company
    const code=document.getElementById('suInviteCode')?.value.trim();
    if(!code){msg('suErr','Enter your invite code');return;}
    const btn=document.getElementById('suBtn');
    if(btn){btn.disabled=true;btn.textContent='Creating account...';}
    const{error:ae}=await sb.auth.signUp({email,password:pass});
    if(ae&&ae.message!=='User already registered'){msg('suErr',ae.message);if(btn){btn.disabled=false;btn.textContent='Create Account';}return;}
    const{data:sd,error:se}=await sb.auth.signInWithPassword({email,password:pass});
    if(se||!sd.user){msg('suErr','Account created - please sign in');toggleAuth('in');if(btn){btn.disabled=false;btn.textContent='Create Account';}return;}
    ME=sd.user;
    const result=await joinCompany(code);
    if(result.error){msg('suErr',result.error);if(btn){btn.disabled=false;btn.textContent='Create Account';}return;}
    COMPANY=result.company;MY_ROLE='employee';
    if(result.company.locations&&result.company.locations.length){
      LOCS=result.company.locations.map(l=>({...l,keys:[]}));
    }
    if(btn){btn.disabled=false;btn.textContent='Create Account';}
    hideAuth();showApp();
    document.getElementById('tbUser').textContent=ME.email;
    document.getElementById('tbRole').textContent='employee';
    renderHero();renderWS();await renderLocGrid();renderSupGrid();loadDayUI(selDate);
    showToast('Joined '+result.company.name+'!');
  }
}

async function doSignOut(){await sb.auth.signOut();ME=null;cache={};hideApp();showAuth()}


/* --- 7. DATABASE ------------------------------------- */
async function loadWk(dates){
  if(!ME)return;
  const{data,error}=await sb.from('work_logs').select('*').eq('user_id',ME.id).in('log_date',dates);
  if(error){console.error(error);return}
  dates.forEach(d=>{if(!cache[d])cache[d]={locations:[],note:'',supplies:{}}});
  (data||[]).forEach(r=>{cache[r.log_date]={locations:r.locations||[],note:r.note||'',supplies:r.supplies||{}}});
}
async function saveLog(date,locs,note,sups){
  if(!ME)return false;
  // Check if updating existing record
  const existing=cache[date];
  const action=existing&&existing.locations&&existing.locations.length>0?'update':'save';
  const{error}=await sb.from('work_logs').upsert(
    {user_id:ME.id,company_id:COMPANY?.id||null,log_date:date,locations:locs,note,supplies:sups,updated_at:new Date().toISOString()},
    {onConflict:'user_id,log_date'}
  );
  if(error){console.error(error);return false}
  cache[date]={locations:locs,note,supplies:sups};
  // Write backup to history table (non-blocking)
  sb.from('work_logs_history').insert({
    user_id:ME.id,
    user_email:ME.email,
    log_date:date,
    locations:locs,
    note:note||'',
    supplies:sups||{},
    action:action,
    saved_at:new Date().toISOString()
  }).then(({error:he})=>{if(he)console.warn('History save error:',he);});
  return true;
}
function gd(d){return cache[d]||{locations:[],note:'',supplies:{}}}

/* --- KEY MANAGEMENT (Supabase) ----------------------- */
// In-memory cache so we don't re-fetch on every render
let keysCache = {};  // { locId: holderName }
let keysCacheLoaded = false;

async function loadLocKeys(){
  if(keysCacheLoaded) return keysCache;
  try{
    const{data,error}=await supabaseClient.from('location_keys').select('location_id,holder_name');
    if(error){console.error('Keys load error:',error);return keysCache;}
    keysCache={};
    (data||[]).forEach(r=>{if(r.holder_name) keysCache[r.location_id]=r.holder_name;});
    keysCacheLoaded=true;
  }catch(e){console.error(e);}
  return keysCache;
}

function getLocKey(locId){
  return keysCache[locId]||null;
}

async function setLocKey(locId,locName,holder){
  try{
    // Check for duplicate - is this holder already assigned to another location?
    if(holder){
      const duplicate=Object.entries(keysCache).find(([id,name])=>
        id!==locId && name&&name.toLowerCase()===holder.toLowerCase()
      );
      if(duplicate){
        const dupLocName=LOCS.find(l=>l.id===duplicate[0])?.name||duplicate[0];
        const confirmed=confirm(holder+' is already assigned to '+dupLocName+'. Assign to '+locName+' as well?');
        if(!confirmed) return false;
      }
    }
    const{error}=await supabaseClient.from('location_keys').upsert(
      {location_id:locId,location_name:locName,holder_name:holder||null,updated_by:ME.id,updated_at:new Date().toISOString()},
      {onConflict:'location_id'}
    );
    if(error){showToast('Error saving key: '+error.message,'warn');console.error(error);return false;}
    // Write audit log
    supabaseClient.from('key_audit_log').insert({
      location_id:locId,
      location_name:locName,
      holder_name:holder||null,
      action:holder?'assigned':'cleared',
      performed_by:ME.id,
      performed_by_email:ME.email,
      performed_at:new Date().toISOString()
    }).then(({error:ae})=>{if(ae)console.warn('Key audit error:',ae);});
    if(holder) keysCache[locId]=holder;
    else delete keysCache[locId];
    return true;
  }catch(e){console.error(e);return false;}
}

function openKeyModal(locId, locName, currentHolder){
  const existing=currentHolder||getLocKey(locId)||'';
  const sheet=document.getElementById('keyModal');
  if(!sheet){showToast('Key modal missing','warn');return;}
  document.getElementById('keyModalTitle').textContent='Key - '+locName;
  document.getElementById('keyHolderInput').value=existing;
  document.getElementById('keyModalLocId').value=locId;
  sheet.style.cssText='display:flex;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.75);z-index:900;align-items:flex-end;justify-content:center';
}
function closeKeyModal(){
  const m=document.getElementById('keyModal');
  if(m) m.style.display='none';
}
async function saveKeyHolder(){
  const locId=document.getElementById('keyModalLocId').value;
  const holder=document.getElementById('keyHolderInput').value.trim();
  const loc=LOCS.find(l=>l.id===locId);
  const locName=loc?loc.name:locId;
  const btn=document.querySelector('.btn-key-save');
  if(btn){btn.disabled=true;btn.textContent='Saving...';}
  const ok=await setLocKey(locId,locName,holder);
  if(btn){btn.disabled=false;btn.textContent='Save';}
  if(ok){
    closeKeyModal();
    renderLocGrid();
    renderKeysOverview();
    showToast(holder?'Key assigned to '+holder:'Key cleared');
  }
}



/* --- COMPANY & MULTI-TENANT -------------------------- */

async function loadMyCompany(){
  try{
    // Use limit(1) to handle duplicate rows gracefully
    const{data:memberships,error:me}=await supabaseClient
      .from('company_members').select('*').eq('user_id',ME.id).limit(1);
    if(me){console.error('company_members error:',me.message);return null;}
    if(!memberships||!memberships.length){
      console.log('No company membership found for',ME.email);
      return null;
    }
    const membership=memberships[0];
    MY_ROLE=membership.role;
    const{data:companies,error:ce}=await supabaseClient
      .from('companies').select('*').eq('id',membership.company_id).limit(1);
    if(ce){console.error('companies error:',ce.message);return null;}
    if(!companies||!companies.length){
      console.error('Company not found for id',membership.company_id);
      return null;
    }
    const company=companies[0];
    COMPANY=company;
    if(company.locations&&company.locations.length>0){
      LOCS=company.locations.map(l=>({...l,keys:[]}));
    }
    console.log('Company loaded:',company.name,'Role:',MY_ROLE);
    return company;
  }catch(e){
    console.error('loadMyCompany exception:',e);
    return null;
  }
}

async function createCompany(name,locations){
  const{data:rows,error}=await supabaseClient.from('companies').insert({
    name,owner_id:ME.id,locations
  }).select();
  if(error||!rows||!rows.length){console.error(error);return null;}
  const data=rows[0];
  await supabaseClient.from('company_members').insert({
    company_id:data.id,user_id:ME.id,user_email:ME.email,role:'admin'
  });
  return data;
}

async function joinCompany(inviteCode){
  const code=inviteCode.toUpperCase().trim();
  console.log('Joining with code:',code);
  // Look up company by invite code
  const{data:cos,error:ce}=await supabaseClient
    .from('companies').select('*')
    .eq('invite_code',code).limit(1);
  console.log('Company lookup result:',cos,'error:',ce);
  if(ce){return{error:'Error: '+ce.message};}
  if(!cos||!cos.length){return{error:'Invalid invite code. Check the code and try again.'};}
  const company=cos[0];
  // Check if already a member
  const{data:existing}=await supabaseClient.from('company_members')
    .select('id').eq('company_id',company.id).eq('user_id',ME.id).limit(1);
  if(existing&&existing.length>0) return{error:'You are already a member of '+company.name};
  // Join as employee
  const{error:je}=await supabaseClient.from('company_members').insert({
    company_id:company.id,user_id:ME.id,user_email:ME.email,role:'employee'
  });
  console.log('Join result error:',je);
  if(je) return{error:'Could not join: '+je.message};
  return{company};
}

async function getCompanyMembers(){
  if(!COMPANY) return[];
  const{data,error}=await supabaseClient.from('company_members')
    .select('*').eq('company_id',COMPANY.id).order('role');
  if(error) return[];
  return data||[];
}

async function updateMemberRole(userId,role){
  if(!COMPANY) return false;
  const{error}=await supabaseClient.from('company_members')
    .update({role}).eq('company_id',COMPANY.id).eq('user_id',userId);
  if(!error) showToast('Role updated');
  return !error;
}

async function saveCompanyLocations(locations){
  if(!COMPANY) return false;
  const{error}=await supabaseClient.from('companies')
    .update({locations}).eq('id',COMPANY.id);
  if(!error){COMPANY.locations=locations;LOCS=locations.map(l=>({...l,keys:[]}));}
  return !error;
}

function showCompanySetup(){
  const setup=document.getElementById('companySetup');
  if(setup) setup.style.cssText='display:flex;flex-direction:column';
  hideApp();
  const authWrap=document.getElementById('authWrap');
  if(authWrap) authWrap.style.display='none';
}
function hideCompanySetup(){
  const setup=document.getElementById('companySetup');
  if(setup) setup.style.display='none';
}

function switchCompanyTab(tab){
  ['create','join'].forEach(t=>{
    const tb=document.getElementById('co-tab-'+t);
    const pn=document.getElementById('co-panel-'+t);
    if(tb) tb.classList.toggle('on',t===tab);
    if(pn) pn.style.display=t===tab?'block':'none';
  });
}

let coLocCount=0;
function addCoLocation(){
  coLocCount++;
  const container=document.getElementById('coLocList');
  if(!container) return;
  const row=document.createElement('div');
  row.className='co-loc-row';
  row.id='co-loc-'+coLocCount;
  row.innerHTML='<input class="co-loc-input" type="text" placeholder="Location name (e.g. Main Office)" id="coLoc'+coLocCount+'"/>'
    +'<button onclick="removeCoLoc('+coLocCount+')" class="co-loc-del">x</button>';
  container.appendChild(row);
}
function removeCoLoc(n){
  const el=document.getElementById('co-loc-'+n);
  if(el) el.remove();
}

async function submitCreateCompany(){
  const nameEl=document.getElementById('coName');
  const name=nameEl?nameEl.value.trim():'';
  if(!name){showToast('Enter a company name','warn');return;}
  const rows=document.querySelectorAll('.co-loc-input');
  const locations=[];
  const colors=['#1a2840','#0e3028','#1a3a5c','#2a1a40','#3a1a1a','#1a3a2a','#1a2a3a','#2d1a4a','#1a3a5c','#1a2840','#0e3028'];
  rows.forEach((inp,i)=>{
    const n=inp.value.trim();
    if(n) locations.push({id:'loc'+i,name:n,img:'',color:colors[i%colors.length],abbr:n.substring(0,2).toUpperCase(),keys:[]});
  });
  if(!locations.length){showToast('Add at least one location','warn');return;}
  const btn=document.getElementById('btnCreateCo');
  if(btn){btn.disabled=true;btn.textContent='Creating...';}
  const company=await createCompany(name,locations);
  if(btn){btn.disabled=false;btn.textContent='Create Company';}
  if(!company){showToast('Error creating company','warn');return;}
  COMPANY=company;LOCS=locations;MY_ROLE='admin';
  hideCompanySetup();showApp();
  const roleEl=document.getElementById('tbRole');
  if(roleEl) roleEl.textContent=MY_ROLE;
  renderHero();renderWS();await renderLocGrid();renderSupGrid();loadDayUI(selDate);
  showToast('Company created! Invite code: '+company.invite_code);
}

async function submitJoinCompany(){
  const codeEl=document.getElementById('coInviteCode');
  const code=codeEl?codeEl.value.trim():'';
  if(!code){showToast('Enter an invite code','warn');return;}
  const btn=document.getElementById('btnJoinCo');
  if(btn){btn.disabled=true;btn.textContent='Joining...';}
  const result=await joinCompany(code);
  if(btn){btn.disabled=false;btn.textContent='Join Company';}
  if(result.error){showToast(result.error,'warn');return;}
  COMPANY=result.company;MY_ROLE='employee';
  if(result.company.locations&&result.company.locations.length){
    LOCS=result.company.locations.map(l=>({...l,keys:[]}));
  }
  hideCompanySetup();showApp();
  const roleEl=document.getElementById('tbRole');
  if(roleEl) roleEl.textContent=MY_ROLE;
  renderHero();renderWS();await renderLocGrid();renderSupGrid();loadDayUI(selDate);
  showToast('Joined '+result.company.name+'!');
}

async function renderCompanySettings(){
  const el=document.getElementById('companySettingsContent');
  if(!el||!COMPANY) return;
  const members=await getCompanyMembers();
  const isAdmin=MY_ROLE==='admin';
  el.innerHTML=
    '<div style="margin-bottom:12px">'
    +'<div style="font-size:14px;font-weight:700;color:var(--text)">'+COMPANY.name+'</div>'
    +'<div style="font-size:11px;color:var(--text3);font-family:monospace;margin-top:3px">Invite code: <span style="color:var(--teal);font-weight:700;letter-spacing:2px">'+COMPANY.invite_code+'</span></div>'
    +'<div style="font-size:11px;color:var(--text3);margin-top:2px">'+members.length+' member'+(members.length!==1?'s':'')+'</div>'
    +'</div>'
    +'<div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text3);margin-bottom:8px">Team</div>'
    +members.map(m=>{
      const isMe=m.user_id===ME.id;
      return '<div style="background:var(--card2);border-radius:8px;padding:10px 12px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;gap:8px">'
        +'<div><div style="font-size:12px;font-weight:700;color:var(--text)">'+m.user_email.split('@')[0]+'</div>'
        +'<div style="font-size:10px;color:var(--text3);font-family:monospace">'+m.user_email+'</div></div>'
        +(isAdmin&&!isMe
          ?('<select onchange="updateMemberRole(\'' + m.user_id + '\',this.value)" style="background:var(--bg);border:1px solid var(--border2);border-radius:6px;color:var(--text);font-size:11px;padding:4px 8px;cursor:pointer">'
            +'<option value="employee"'+(m.role==='employee'?' selected':'')+'>Employee</option>'
            +'<option value="employer"'+(m.role==='employer'?' selected':'')+'>Employer</option>'
            +'<option value="admin"'+(m.role==='admin'?' selected':'')+'>Admin</option>'
            +'</select>')
          :'<span style="font-size:10px;font-weight:700;padding:3px 9px;border-radius:5px;background:var(--teal-bg);color:var(--teal)">'+m.role+'</span>')
        +'</div>';
    }).join('')
    +(isAdmin
      ?'<div style="margin-top:14px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text3);margin-bottom:8px">Locations</div>'
       +'<div id="coLocEditList">'
       +LOCS.map((l,i)=>'<div style="display:flex;gap:6px;margin-bottom:6px">'
         +'<input value="'+l.name+'" id="coLocEdit'+i+'" style="flex:1;background:var(--bg);border:1.5px solid var(--border2);border-radius:8px;color:var(--text);font-size:13px;padding:8px 10px;outline:none"/>'
         +'</div>').join('')
       +'</div>'
       +'<button onclick="saveCoLocations()" style="width:100%;background:var(--teal);color:#04100D;border:none;border-radius:8px;padding:11px;font-size:13px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;margin-top:6px">Save Locations</button>'
      :'');
}

async function saveCoLocations(){
  const inputs=document.querySelectorAll('[id^="coLocEdit"]');
  const locs=LOCS.map((l,i)=>({...l,name:inputs[i]?inputs[i].value.trim()||l.name:l.name}));
  const ok=await saveCompanyLocations(locs);
  if(ok){showToast('Locations updated');await renderLocGrid();renderCompanySettings();}
  else showToast('Error saving','warn');
}


/* --- 8. APP INIT ------------------------------------- */
async function initApp(u){
  ME=u;
  document.getElementById('tbUser').textContent=u.email;
  hideLoader();
  // Load company first
  const company=await loadMyCompany();
  if(!company){
    // User not in a company yet - show company setup
    hideAuth();
    showCompanySetup();
    return;
  }
  // Update role badge in topbar
  const roleEl=document.getElementById('tbRole');
  if(roleEl) roleEl.textContent=MY_ROLE;
  hideAuth();
  showApp();
  await loadWk(wkDates(logOff));
  await loadLocKeys();
  renderHero();renderWS();await renderLocGrid();renderSupGrid();loadDayUI(selDate);
  setTimeout(checkUnread,2000);
}


/* --- 9. HERO & WEEK STRIP ---------------------------- */
function renderHero(){
  const d=fd(selDate);
  document.getElementById('heroSmall').textContent=
    d.toLocaleDateString('en-NZ',{weekday:'long',month:'long',day:'numeric',year:'numeric'}).toUpperCase();
  document.getElementById('heroBig').textContent=selDate===td()?'Today':''+d.toLocaleDateString('en-NZ',{weekday:'long'});
  let streak=0,chk=td();
  while(true){const dd=gd(chk);if(dd.locations&&dd.locations.length){streak++;chk=ds(addD(fd(chk),-1))}else break}
  document.getElementById('streakTxt').textContent=`${streak} day streak`;
}
function setSaved(s){
  const e=document.getElementById('heroBadge');
  if(s==='saving'){e.textContent='Saving to cloud...';e.className='hero-badge saving'}
  else if(s==='saved'){e.textContent='Saved to cloud OK';e.className='hero-badge saved'}
  else{e.textContent='';e.className='hero-badge'}
}

function renderWS(){
  const today=td(),dates=wkDates(logOff),c=document.getElementById('wsDays');
  // Update label
  const lbl=document.getElementById('wsLbl');
  if(lbl){
    if(logOff===0) lbl.textContent='This week';
    else if(logOff===-1) lbl.textContent='Last week';
    else{
      const m=fd(dates[0]);
      lbl.textContent=m.toLocaleDateString('en-NZ',{month:'short',day:'numeric'}) + ' week';
    }
  }
  // Update nav buttons
  const navTitle=document.getElementById('wsNavTitle');
  if(navTitle){
    const m=fd(dates[0]),sun=fd(dates[6]);
    navTitle.textContent=m.toLocaleDateString('en-NZ',{month:'short',day:'numeric'})+' - '+sun.toLocaleDateString('en-NZ',{day:'numeric',month:'short'});
  }
  // Disable next button if already at current week
  const nextBtn=document.getElementById('wsNavNext');
  if(nextBtn) nextBtn.style.opacity=logOff>=0?'0.3':'1';
  if(nextBtn) nextBtn.disabled=logOff>=0;
  c.innerHTML='';
  dates.forEach((date,i)=>{
    const d=fd(date),day=gd(date),has=day.locations&&day.locations.length>0;
    const ch=document.createElement('div');
    ch.className=`ws-chip${has?' has':''}${date===selDate?' sel':''}${date===today?' today':''}`;
    ch.innerHTML=`<span class="ws-abbr">${DABB[i]}</span><div class="ws-num">${d.getDate()}</div><div class="ws-dot"></div>`;
    ch.onclick=()=>selDay(date);
    c.appendChild(ch);
  });
}
async function navLogWeek(dir){
  logOff+=dir;
  const dates=wkDates(logOff);
  await loadWk(dates);
  renderWS();
  // Select first day of new week if current selDate not in range
  if(!dates.includes(selDate)){
    selDate=logOff===0?td():dates[0];
  }
  await loadDayUI(selDate);
}

async function selDay(date){selDate=date;renderWS();await loadDayUI(date);}


/* --- 10. LOCATION & SUPPLY GRID ---------------------- */
async function renderLocGrid(){
  await loadLocKeys();
  const c=document.getElementById('locGrid');c.innerHTML='';
  LOCS.forEach(loc=>{
    const el=document.createElement('div');
    el.className=`loc-card${tempL.has(loc.id)?' sel':''}`;
    const imgHTML=loc.img
      ?`<div class="loc-img-wrap"><img class="loc-img" src="${loc.img}" alt="${loc.name}"/><div class="loc-img-overlay"></div></div>`
      :`<div class="loc-img-wrap loc-img-placeholder"><div class="loc-placeholder-bg" style="background:${loc.color||'var(--card2)'}"></div><div class="loc-placeholder-abbr" style="color:rgba(255,255,255,0.7)">${loc.abbr||'?'}</div><div class="loc-img-overlay"></div></div>`;
    const keyHolder=getLocKey(loc.id);
    const keyIcon=`<button class="loc-key-btn${keyHolder?' has-key':''}" onclick="event.stopPropagation();openKeyModal('${loc.id}','${loc.name}')" title="${keyHolder?'Key: '+keyHolder:'No key assigned'}">
      <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
    </button>`;
    const nameEl=`<div class="loc-name-bar"><span class="loc-name-highlight">${loc.name}</span>${keyHolder?`<span class="loc-key-holder">${keyHolder}</span>`:''}</div>`;
    el.innerHTML=`${imgHTML}${keyIcon}<div class="loc-chk"><svg fill="none" stroke="#04100D" stroke-width="3" viewBox="0 0 12 12"><path stroke-linecap="round" stroke-linejoin="round" d="M2 6l3 3 5-5"/></svg></div>${nameEl}`;
    el.onclick=()=>{
      if(tempL.has(loc.id)){tempL.delete(loc.id);el.classList.remove('sel')}
      else{tempL.add(loc.id);el.classList.add('sel')}
    };
    c.appendChild(el);
  });
}

function renderSupGrid(){
  const c=document.getElementById('supGrid');c.innerHTML='';
  SUPS.forEach(sup=>{
    const el=document.createElement('div');
    el.className=`sup-btn${tempS.has(sup.id)?' sel':''}`;
    el.innerHTML=`<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">${sup.svg}</svg><div class="sup-nm">${sup.name}</div><div class="sup-tag">NEEDED</div>`;
    el.onclick=()=>{
      if(tempS.has(sup.id)){tempS.delete(sup.id);el.classList.remove('sel')}
      else{tempS.add(sup.id);el.classList.add('sel')}
    };
    c.appendChild(el);
  });
}

async function loadDayUI(date){
  const d=gd(date);
  tempL=new Set(d.locations||[]);
  tempS=new Set(Object.keys(d.supplies||{}).filter(k=>d.supplies[k]));
  document.getElementById('notesTA').value=d.note||'';
  await renderLocGrid();renderSupGrid();
  document.getElementById('selLbl').textContent=fd(date).toLocaleDateString('en-NZ',{weekday:'short',day:'numeric',month:'short'});
  renderHero();setSaved('');
}


/* --- 11. SAVE / CLEAR -------------------------------- */
async function saveDay(){
  const note=document.getElementById('notesTA').value.trim();
  const locs=[...tempL];
  const sups={};tempS.forEach(s=>sups[s]=true);
  const b=document.getElementById('btnSave');b.disabled=true;setSaved('saving');
  const ok=await saveLog(selDate,locs,note,sups);
  b.disabled=false;
  if(ok){
    setSaved('saved');
    // Use requestAnimationFrame to batch DOM updates
    requestAnimationFrame(()=>{renderWS();renderHero();});
    showToast(locs.length?`Saved - ${locs.length} location${locs.length>1?'s':''}`:'Day saved');
    setTimeout(()=>setSaved(''),3000);
  } else {
    setSaved('');showToast('Error saving - try again','warn');
  }
}
function clearDay(){tempL.clear();tempS.clear();document.getElementById('notesTA').value='';renderLocGrid();renderSupGrid();setSaved('')}

function showToast(txt,t=''){
  const el=document.getElementById('toast');
  el.textContent=txt;el.className=`toast${t?' '+t:''} show`;
  setTimeout(()=>el.className=`toast${t?' '+t:''}`,2400);
}


/* --- 12. VIEW SWITCHER ------------------------------- */
function sv(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('.more-item').forEach(b=>b.classList.remove('on'));
  const vEl=document.getElementById('v-'+name);
  if(vEl) vEl.classList.add('on');
  const nb=document.getElementById('nb-'+name);if(nb)nb.classList.add('on');
  // Update more-badge if any more-menu item is active
  const inMore=['sch','req','set'].includes(name);
  const moreBadge=document.getElementById('more-badge');
  if(moreBadge) moreBadge.style.display=inMore?'block':'none';
  if(name==='dash') renderDash();
  if(name==='week') renderWeekView();
  if(name==='rep')  renderReport();
  if(name==='sch')  renderSchedule();
  if(name==='req'){
    initReqUI();
    const isM=isManager();
    document.getElementById('rtab-inbox').style.display=isM?'':'none';
    document.getElementById('req-head-title')||null;
    if(isM) checkUnread();
    switchReqTab(isM?'inbox':'send');
  }
  if(name==='set'){
    if(ME){
      const se=document.getElementById('setEmail');if(se)se.textContent=ME.email;
      const role=getRole(ME.email);
      const sr=document.getElementById('setRole');if(sr)sr.textContent='Cannot be changed here';
      const rb=document.getElementById('setRoleBadge');
      if(rb){
        rb.textContent=role.charAt(0).toUpperCase()+role.slice(1);
        rb.style.background=role==='admin'?'var(--purple-bg)':role==='employer'?'var(--blue-bg)':'var(--teal-bg)';
        rb.style.color=role==='admin'?'var(--purple)':role==='employer'?'var(--blue)':'var(--teal)';
        rb.style.borderColor=role==='admin'?'rgba(167,139,250,0.2)':role==='employer'?'rgba(79,142,247,0.2)':'rgba(5,217,180,0.2)';
      }
      // Show audit sections based on role
      const isM=isManager();
      const ka=document.getElementById('keyAuditSection');
      if(ka) ka.style.display=isM?'block':'none';
      const hs=document.getElementById('historySection');
      if(hs) hs.style.display=MY_ROLE==='admin'?'block':'none';
      // Render company settings
      renderCompanySettings();
    }
    syncThemeToggle();
  }
}


/* --- 13. DASHBOARD ----------------------------------- */

async function renderKeysOverview(){
  const el=document.getElementById('keysOverview');
  if(!el) return;
  el.innerHTML='<div style="font-size:12px;color:var(--text3);padding:8px 0">Loading...</div>';
  const all=await loadLocKeys();
  LOCS.forEach(loc=>{
    const holder=all[loc.id]||null;
    const row=document.createElement('div');
    row.className='key-row';
    row.onclick=()=>openKeyModal(loc.id,loc.name,holder);
    row.innerHTML=`
      <div style="display:flex;align-items:center;gap:6px">
        <svg class="key-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
        <div class="key-loc-name">${loc.name}</div>
      </div>
      ${holder?`<span class="key-holder-name">[key] ${holder}</span>`:'<span class="key-unassigned">Unassigned</span>'}
    `;
    el.appendChild(row);
  });
}

async function renderDash(){
  const dates=wkDates(0);await loadWk(dates);
  const h=new Date().getHours();
  document.getElementById('dashG').textContent=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
  const m=fd(dates[0]),sun=fd(dates[6]);
  document.getElementById('dashS').textContent=`${m.toLocaleDateString('en-NZ',{month:'short',day:'numeric'})} - ${sun.toLocaleDateString('en-NZ',{month:'short',day:'numeric',year:'numeric'})}`;
  let dw=0,tl=0,sd=0,streak=0,chk=td();
  while(true){const dd=gd(chk);if(dd.locations&&dd.locations.length){streak++;chk=ds(addD(fd(chk),-1))}else break}
  dates.forEach(d=>{const dd=gd(d);if(dd.locations&&dd.locations.length){dw++;tl+=dd.locations.length}if(dd.supplies&&Object.values(dd.supplies).some(Boolean))sd++});
  document.getElementById('dashStats').innerHTML=`
    <div class="s-card ct"><div class="s-ico ct"><svg stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div class="s-val">${dw}</div><div class="s-lbl">Days worked</div></div>
    <div class="s-card cb"><div class="s-ico cb"><svg stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><circle cx="12" cy="11" r="3"/></svg></div><div class="s-val">${tl}</div><div class="s-lbl">Total locations</div></div>
    <div class="s-card ca"><div class="s-ico ca"><svg stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg></div><div class="s-val">${streak}</div><div class="s-lbl">Day streak</div></div>
    <div class="s-card cp"><div class="s-ico cp"><svg stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg></div><div class="s-val">${sd}</div><div class="s-lbl">Supply alerts</div></div>`;
  const wm=addD(mon(td()),0),wsu=addD(wm,6);
  document.getElementById('wccR').textContent=`${wm.toLocaleDateString('en-NZ',{month:'short',day:'numeric'})} - ${wsu.toLocaleDateString('en-NZ',{day:'numeric',month:'short'})}`;
  const mx=Math.max(1,...dates.map(d=>gd(d).locations?.length||0)),tday=td();
  document.getElementById('barChart').innerHTML=dates.map((d,i)=>{
    const cnt=gd(d).locations?.length||0,pct=Math.round((cnt/mx)*100),isT=d===tday;
    return`<div class="bar-col${isT?' tod':''}"><div class="bar-out"><div class="bar-in" style="height:${cnt?Math.max(pct,8):0}%"></div></div><div class="bar-d">${DABB[i]}</div></div>`;
  }).join('');
  const sacRows=[];
  dates.forEach(d=>{
    const dd=gd(d);if(!dd.supplies)return;
    const needed=Object.keys(dd.supplies).filter(k=>dd.supplies[k]);if(!needed.length)return;
    const locName=LOCS.find(l=>l.id===(dd.locations||[])[0])?.name||'Location';
    const tags=needed.map(s=>SUPS.find(x=>x.id===s)?.name||s);
    const dstr=fd(d).toLocaleDateString('en-NZ',{weekday:'short',day:'numeric',month:'short'});
    sacRows.push(`<div class="sac-row"><div><div class="sac-loc">${locName}</div><div class="sac-dt">${dstr}</div></div><div class="sac-tags">${tags.map(t=>`<span class="sac-tag">${t}</span>`).join('')}</div></div>`);
  });
  document.getElementById('sacList').innerHTML=sacRows.length?sacRows.join(''):'<div class="sac-empty">No supply alerts this week OK</div>';
  document.getElementById('sacCard').style.display=sacRows.length?'block':'block';
  const recRows=[];
  dates.slice().reverse().forEach((d,i)=>{
    const dd=gd(d);if(!dd.locations?.length)return;
    const hasSup=dd.supplies&&Object.values(dd.supplies).some(Boolean);
    recRows.push(`<div class="rec-row"><div><div class="rec-dn">${DFULL[6-i]}</div><div class="rec-dd">${fd(d).toLocaleDateString('en-NZ',{day:'numeric',month:'short'})}</div></div><div class="rec-r">${hasSup?'<div class="rec-sdot"></div>':''}<div class="rec-cnt">${dd.locations.length} loc</div></div></div>`);
  });
  document.getElementById('recList').innerHTML=recRows.length?recRows.join(''):'<div class="rec-empty">No activity logged this week yet</div>';
  renderKeysOverview();
}


/* --- 14. WEEK VIEW ----------------------------------- */
async function renderWeekView(){
  const dates=wkDates(weekOff);
  const m=fd(dates[0]),sun=fd(dates[6]);
  document.getElementById('wvTitle').textContent=`${m.toLocaleDateString('en-NZ',{month:'short',day:'numeric'})} - ${sun.toLocaleDateString('en-NZ',{month:'short',day:'numeric',year:'numeric'})}`;
  await loadWk(dates);
  const c=document.getElementById('wkEntries');c.innerHTML='';
  dates.forEach((d,i)=>{
    const dd=gd(d),has=dd.locations&&dd.locations.length>0;
    const hasSup=dd.supplies&&Object.values(dd.supplies).some(Boolean);
    const locNames=(dd.locations||[]).map(id=>LOCS.find(l=>l.id===id)?.name||id);
    const supNames=Object.keys(dd.supplies||{}).filter(k=>dd.supplies[k]).map(k=>SUPS.find(s=>s.id===k)?.name||k);
    const el=document.createElement('div');el.className=`wde${has?' has':''}`;
    el.innerHTML=`<div class="wde-h"><div><div class="wde-dn">${DFULL[i]}</div><div class="wde-dd">${fd(d).toLocaleDateString('en-NZ',{day:'numeric',month:'short'})}</div></div><div class="wde-r">${hasSup?'<div class="wde-sdot"></div>':''}<div class="wde-cnt${has?' has':''}">${has?dd.locations.length+' loc':'-'}</div><button class="wde-edit-btn" onclick="editDay('${d}')">Edit</button></div></div>
    ${has?`<div class="wde-locs">${locNames.map(n=>`<span class="wde-lt">${n}</span>`).join('')}</div>`:'<div class="wde-empty">Nothing logged</div>'}
    ${supNames.length?`<div class="wde-sups">${supNames.map(n=>`<span class="wde-st">! ${n}</span>`).join('')}</div>`:''}
    ${dd.note?`<div class="wde-note">"${dd.note}"</div>`:''}`;
    c.appendChild(el);
  });
}
async function navWeek(d){weekOff+=d;await renderWeekView()}


/* --- 15. REPORT -------------------------------------- */
async function renderReport(){
  const dates=wkDates(repOff);
  const m=fd(dates[0]),sun=fd(dates[6]);
  document.getElementById('rvTitle').textContent=`${m.toLocaleDateString('en-NZ',{month:'short',day:'numeric'})} - ${sun.toLocaleDateString('en-NZ',{month:'short',day:'numeric',year:'numeric'})}`;
  await loadWk(dates);
  let dw=0,tl=0,sc=0,lines=['WORK LOCATION REPORT',
    `Week of ${m.toLocaleDateString('en-NZ',{month:'long',day:'numeric',year:'numeric'})} - ${sun.toLocaleDateString('en-NZ',{month:'long',day:'numeric',year:'numeric'})}`,
    '-'.repeat(44)];
  dates.forEach((d,i)=>{
    const dd=gd(d),locs=dd.locations||[];
    const supNeeded=Object.keys(dd.supplies||{}).filter(k=>dd.supplies[k]);
    const locNames=locs.map(id=>LOCS.find(l=>l.id===id)?.name||id);
    const supNames=supNeeded.map(k=>SUPS.find(s=>s.id===k)?.name||k);
    lines.push('');
    lines.push(fd(d).toLocaleDateString('en-NZ',{weekday:'long',day:'numeric',month:'long'}));
    if(locs.length){dw++;tl+=locs.length;locNames.forEach(n=>lines.push(`  * ${n}`));
      if(dd.note)lines.push(`  Note: ${dd.note}`);
      if(supNames.length){sc+=supNames.length;lines.push(`  ! Supplies needed: ${supNames.join(', ')}`)}}
    else lines.push('  - No locations logged');
  });
  lines.push('');lines.push('-'.repeat(44));
  lines.push(`Days worked: ${dw} / 7`);lines.push(`Total locations: ${tl}`);
  if(sc)lines.push(`Supply items flagged: ${sc}`);
  document.getElementById('rvText').textContent=lines.join('\n');
  document.getElementById('rvRange').textContent=`${m.toLocaleDateString('en-NZ',{weekday:'short',month:'short',day:'numeric'})} - ${sun.toLocaleDateString('en-NZ',{weekday:'short',month:'short',day:'numeric',year:'numeric'})}`;
  document.getElementById('rvStats').innerHTML=`<div class="rv-stat"><div class="rv-val">${dw}</div><div class="rv-lbl">Days worked</div></div><div class="rv-stat"><div class="rv-val">${tl}</div><div class="rv-lbl">Locations</div></div><div class="rv-stat"><div class="rv-val">${sc}</div><div class="rv-lbl">Supply alerts</div></div>`;
}
async function navRep(d){repOff+=d;await renderReport()}

/* --- REPORT SHARING & IMAGE EXPORT ------------------- */

// -- Share via native share sheet (WhatsApp, Messages, Email etc) --
async function shareRep(){
  const text = document.getElementById('rvText').textContent;
  const title = 'WorkTrace - Weekly Report';

  // Check if Web Share API is available (iOS Safari, Android Chrome)
  if(navigator.share){
    try{
      await navigator.share({ title, text });
      showToast('Report shared');
    } catch(e){
      // User cancelled - not an error
      if(e.name !== 'AbortError') showToast('Share failed','warn');
    }
  } else {
    // Fallback for desktop - copy to clipboard with instructions
    navigator.clipboard.writeText(text)
      .then(()=>showToast('Copied - paste into WhatsApp or Email'))
      .catch(()=>showToast('Select and copy manually'));
  }
}

// -- Build the hidden image card with current report data --
function buildRepImageCard(){
  // Range label
  const range = document.getElementById('rvRange').textContent;
  const imgRange = document.getElementById('repImgRange');
  if(imgRange) imgRange.textContent = range;

  // Stats row (3 stat boxes)
  const statsEl = document.getElementById('rvStats');
  const imgStats = document.getElementById('repImgStats');
  if(imgStats && statsEl){
    const vals = statsEl.querySelectorAll('.rv-val');
    const lbls = statsEl.querySelectorAll('.rv-lbl');
    const colors = ['#05D9B4','#4F8EF7','#F5A623'];
    imgStats.innerHTML = '';
    vals.forEach((v,i)=>{
      imgStats.innerHTML += `<div style="background:#111C2A;border-radius:8px;padding:10px;text-align:center;border-top:2px solid ${colors[i]||'#05D9B4'}">
        <div style="font-size:24px;font-weight:700;color:${colors[i]||'#05D9B4'};font-family:monospace;line-height:1">${v.textContent}</div>
        <div style="font-size:10px;color:#7A90A8;margin-top:4px">${lbls[i]?lbls[i].textContent:''}</div>
      </div>`;
    });
  }

  // Report body lines
  const body = document.getElementById('repImgBody');
  if(body){
    const lines = document.getElementById('rvText').textContent.split('\n');
    body.innerHTML = lines.map(line=>{
      if(!line.trim()) return '<div style="height:6px"></div>';
      const isHeader = line.startsWith('WORK') || line.startsWith('Week of') || line.startsWith('-');
      const isBullet = line.trim().startsWith('\u2022');
      const isWarning = line.trim().startsWith('\u26a0');
      const isDayName = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/.test(line.trim());
      const isTotal = line.startsWith('Days worked') || line.startsWith('Total') || line.startsWith('Supply');

      let color = '#7A90A8', weight = '400', size = '11px';
      if(isHeader){ color='#3D5166'; size='10px'; }
      else if(isDayName){ color='#EDF2F7'; weight='700'; size='12px'; }
      else if(isBullet){ color='#05D9B4'; }
      else if(isWarning){ color='#F5A623'; }
      else if(isTotal){ color='#EDF2F7'; weight='600'; }

      return `<div style="font-size:${size};color:${color};font-weight:${weight};font-family:monospace;line-height:1.7;white-space:pre-wrap">${line}</div>`;
    }).join('');
  }
}

// -- Generate PNG and trigger download / share --
async function saveRepImage(){
  const btn = document.getElementById('btnImage');
  if(btn){ btn.disabled=true; btn.textContent='Generating...'; }

  try{
    buildRepImageCard();
    const card = document.getElementById('repImageCard');

    // Briefly make visible for html2canvas
    card.style.left = '-9999px';
    card.style.top = '0';
    card.style.display = 'block';

    await new Promise(r=>setTimeout(r,100)); // let DOM paint

    const canvas = await html2canvas(card, {
      backgroundColor: '#0F1923',
      scale: 2,          // retina quality
      useCORS: true,
      logging: false,
      width: 380,
    });

    card.style.left = '-9999px'; // hide again

    const dataUrl = canvas.toDataURL('image/png');

    // Try native share with file (Android/iOS)
    if(navigator.share && navigator.canShare){
      try{
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], 'worktrace-report.png', {type:'image/png'});
        if(navigator.canShare({files:[file]})){
          await navigator.share({
            title: 'WorkTrace - Weekly Report',
            files: [file]
          });
          showToast('Image shared');
          if(btn){btn.disabled=false;btn.innerHTML='<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>Save Image';}
          return;
        }
      } catch(e){
        if(e.name==='AbortError'){
          if(btn){btn.disabled=false;btn.innerHTML='<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>Save Image';}
          return;
        }
      }
    }

    // Fallback - download link
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'worktrace-report-' + new Date().toISOString().slice(0,10) + '.png';
    a.click();
    showToast('Image saved to downloads');

  } catch(e){
    console.error('Image generation error:', e);
    showToast('Could not generate image','warn');
  }

  if(btn){
    btn.disabled=false;
    btn.innerHTML='<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>Save Image';
  }
}

function copyRep(){navigator.clipboard.writeText(document.getElementById('rvText').textContent).then(()=>showToast('Copied to clipboard')).catch(()=>showToast('Select and copy manually'))}


/* --- 16. THEME & SETTINGS ---------------------------- */
// -- THEME & SETTINGS ----------------------
function setThemeToggle(isLight){
  const t=isLight?'light':'dark';
  localStorage.setItem('wt_theme',t);
  document.body.classList.toggle('light',isLight);
  syncThemeToggle();
}
function syncThemeToggle(){
  const t=localStorage.getItem('wt_theme')||'dark';
  const tog=document.getElementById('themeToggle');
  if(tog) tog.checked=(t==='light');
  document.querySelectorAll('.acc-opt').forEach(el=>{
    const acc=localStorage.getItem('wt_accent')||'#05D9B4';
    el.classList.toggle('active-acc',el.dataset.color===acc);
  });
}
function setAccent(color,dim){
  localStorage.setItem('wt_accent',color);
  localStorage.setItem('wt_accent_dim',dim);
  document.documentElement.style.setProperty('--teal',color);
  document.documentElement.style.setProperty('--teal2',dim);
  document.documentElement.style.setProperty('--teal-bg',color+'18');
  document.documentElement.style.setProperty('--teal-bg2',color+'28');
  syncThemeToggle();
}
function loadSavedPrefs(){
  const t=localStorage.getItem('wt_theme')||'dark';
  document.body.classList.toggle('light',t==='light');
  const acc=localStorage.getItem('wt_accent');
  const dim=localStorage.getItem('wt_accent_dim');
  if(acc&&dim)setAccent(acc,dim);
}
loadSavedPrefs();


/* --- 17. ROLE SYSTEM --------------------------------- */
// -- ROLE SYSTEM// -- ROLE SYSTEM --------------------------
// -- ROLE SYSTEM --------------------------
// -- ROLES --------------------------------
// Add admin/employer emails below. These cannot be changed by the user.
// Everyone else is automatically 'employee'.
const ROLE_MAP={
  // 'admin@example.com':'admin',
  // 'employer@example.com':'employer',
};

function getRole(email){
  if(!email) return 'employee';
  // If user is logged in, use their company role (MY_ROLE takes priority)
  if(ME&&email.toLowerCase()===ME.email.toLowerCase()) return MY_ROLE;
  return ROLE_MAP[email.toLowerCase().trim()]||'employee';
}
function isManager(){
  if(!ME) return false;
  const result=MY_ROLE==='admin'||MY_ROLE==='employer';
  return result;
}


/* --- 18. SCHEDULE ------------------------------------ */
// -- SCHEDULE -----------------------------
let schOff=0, schAssignments=[], modalSelDays=new Set(), modalSelLocs=new Set();

async function loadSchedule(dates){
  if(!ME) return[];
  const mon=dates[0], sun=dates[6];
  let q=supabaseClient.from('schedules').select('*')
    .gte('work_date',mon).lte('work_date',sun);
  if(COMPANY) q=q.eq('company_id',COMPANY.id);
  if(!isManager()) q=q.eq('employee_email',ME.email);
  const{data,error}=await q;
  if(error){console.error('loadSchedule error:',error.message);return[];}
  return data||[];
}

async function renderSchedule(){
  const dates=wkDates(schOff);
  const mon=fd(dates[0]), sun=fd(dates[6]);
  document.getElementById('schNavTitle').textContent=
    mon.toLocaleDateString('en-NZ',{month:'short',day:'numeric'})+' - '+
    sun.toLocaleDateString('en-NZ',{month:'short',day:'numeric',year:'numeric'});

  const container=document.getElementById('schContent');
  container.innerHTML='<div class="sch-empty">Loading...</div>';

  const rows=await loadSchedule(dates);
  schAssignments=rows;

  if(isManager()){
    renderManagerSchedule(dates, rows);
  } else {
    renderEmployeeSchedule(dates, rows);
  }
}

function renderManagerSchedule(dates, rows){
  const container=document.getElementById('schContent');
  container.innerHTML='';

  // Header row
  const hd=document.createElement('div');
  hd.className='sch-head';
  hd.innerHTML=`<span class="sch-head-title">Team schedule</span><button class="btn-add-assign" onclick="openModal()">+ Assign</button>`;
  container.appendChild(hd);

  if(!rows.length){
    const em=document.createElement('div');
    em.className='sch-empty';
    em.textContent='No assignments yet - tap Assign to add one.';
    container.appendChild(em);
    return;
  }

  // Group by email
  const byEmail={};
  rows.forEach(r=>{
    if(!byEmail[r.employee_email]) byEmail[r.employee_email]={email:r.employee_email,days:{}};
    if(!byEmail[r.employee_email].days[r.work_date]) byEmail[r.employee_email].days[r.work_date]=[];
    byEmail[r.employee_email].days[r.work_date].push(...(r.locations||[]));
  });

  const DABB_MAP={'Mon':0,'Tue':1,'Wed':2,'Thu':3,'Fri':4,'Sat':5,'Sun':6};
  const avatarColors=['#05D9B4','#4F8EF7','#A78BFA','#F5A623','#FF5757','#34D399'];

  Object.values(byEmail).forEach((person,pi)=>{
    const card=document.createElement('div');
    card.className='person-card';
    const initials=person.email.substring(0,2).toUpperCase();
    const color=avatarColors[pi%avatarColors.length];
    const totalLocs=Object.values(person.days).flat().length;

    let daysHTML='';
    dates.forEach((d,i)=>{
      const locs=person.days[d]||[];
      const dayName=DABB[i];
      const dayDate=fd(d).getDate();
      daysHTML+=`<div class="person-day-block">
        <div class="person-day-lbl">${dayName} ${dayDate}</div>
        <div class="person-day-locs">
          ${locs.length?locs.map(l=>`<span class="person-loc-tag">${LOCS.find(x=>x.id===l)?.name||l}</span>`).join('')
            :'<span class="person-loc-tag empty">-</span>'}
        </div>
      </div>`;
    });

    card.innerHTML=`
      <div class="person-head">
        <div class="person-avatar" style="background:${color}22;color:${color}">${initials}</div>
        <div>
          <div class="person-name">${person.email.split('@')[0]}</div>
          <div class="person-email">${person.email}</div>
        </div>
        <div class="person-count">${totalLocs} loc</div>
      </div>
      <div class="person-day-blocks">${daysHTML}</div>
      <div style="padding:0 14px 10px">
        <button class="assign-del-btn" onclick="deletePersonSchedule('${person.email}')">x Remove all for this person</button>
      </div>`;
    container.appendChild(card);
  });
}

function renderEmployeeSchedule(dates, rows){
  const container=document.getElementById('schContent');
  container.innerHTML='';

  const hd=document.createElement('div');
  hd.className='sch-head';
  hd.innerHTML=`<span class="sch-head-title">My schedule</span><span class="sch-role-badge emp">Employee</span>`;
  container.appendChild(hd);

  if(!rows.length){
    const em=document.createElement('div');
    em.className='sch-empty';
    em.textContent='No schedule assigned yet. Check back later.';
    container.appendChild(em);
    return;
  }

  dates.forEach((d,i)=>{
    const dayRows=rows.filter(r=>r.work_date===d);
    const locs=dayRows.flatMap(r=>r.locations||[]);
    const has=locs.length>0;
    const el=document.createElement('div');
    el.className=`my-sch-day${has?' has':''}`;
    el.innerHTML=`
      <div class="my-sch-dayname">${DFULL[i]}</div>
      <div class="my-sch-date">${fd(d).toLocaleDateString('en-NZ',{day:'numeric',month:'short'})}</div>
      <div class="my-sch-locs">
        ${has?locs.map(l=>`<span class="person-loc-tag">${LOCS.find(x=>x.id===l)?.name||l}</span>`).join('')
          :'<span class="my-sch-empty">Nothing assigned</span>'}
      </div>`;
    container.appendChild(el);
  });
}

async function navSch(dir){schOff+=dir;await renderSchedule();}


/* --- 19. ASSIGNMENT MODAL ---------------------------- */
// Modal
function openModal(){
  const overlay=document.getElementById('assignModal');
  if(!overlay){showToast('Modal missing','warn');return;}
  modalSelDays=new Set();
  modalSelLocs=new Set();
  const emailEl=document.getElementById('assignEmail');
  if(emailEl) emailEl.value='';
  const dates=wkDates(schOff);
  const dc=document.getElementById('modalDays');
  if(dc) dc.innerHTML=DABB.map((d,i)=>{
    const dt=dates[i];
    const dateNum=fd(dt).getDate();
    return `<button class="modal-day-btn" onclick="toggleModalDay(this,'${dt}')" data-d="${dt}"><span class="modal-day-abbr">${d}</span><span style="font-size:10px;color:var(--text3);display:block;margin-top:2px">${dateNum}</span></button>`;
  }).join('');
  const lc=document.getElementById('modalLocs');
  if(lc) lc.innerHTML=LOCS.map(l=>`<button class="modal-loc-btn" onclick="toggleModalLoc(this,'${l.id}')">${l.name}</button>`).join('');
  overlay.style.cssText='display:flex;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.75);z-index:900;align-items:flex-end;justify-content:center';
  const sheet=overlay.querySelector('.modal-sheet');
  if(sheet) sheet.scrollTop=0;
}
function closeModal(){
  const m=document.getElementById('assignModal');
  if(m){m.style.display='none';m.classList.remove('open');}
}
function toggleModalDay(btn,d){
  if(modalSelDays.has(d)){modalSelDays.delete(d);btn.classList.remove('sel');}
  else{modalSelDays.add(d);btn.classList.add('sel');}
}
function toggleModalLoc(btn,id){
  if(modalSelLocs.has(id)){modalSelLocs.delete(id);btn.classList.remove('sel');}
  else{modalSelLocs.add(id);btn.classList.add('sel');}
}

async function saveAssignment(){
  const emailEl=document.getElementById('assignEmail');
  const email=emailEl?emailEl.value.trim().toLowerCase():'';
  if(!email){showToast('Enter an employee email','warn');return;}
  if(!modalSelDays.size){showToast('Select at least one day','warn');return;}
  if(!modalSelLocs.size){showToast('Select at least one location','warn');return;}
  const locs=[...modalSelLocs];
  const rows=[...modalSelDays].map(d=>({
    created_by:ME.id,
    company_id:COMPANY?COMPANY.id:null,
    employee_email:email,
    work_date:d,
    locations:locs
  }));
  try{
    const{error}=await supabaseClient.from('schedules').upsert(rows,{onConflict:'employee_email,work_date'});
    if(error){
      showToast('DB error: '+error.message,'warn');
      console.error('Schedule save error:',error);
      return;
    }
    closeModal();
    showToast('Schedule saved for '+email.split('@')[0]);
    await renderSchedule();
  }catch(e){
    showToast('Error - check console','warn');
    console.error(e);
  }
}

async function deletePersonSchedule(email){
  const dates=wkDates(schOff);
  const{error}=await supabaseClient.from('schedules').delete()
    .eq('employee_email',email).gte('work_date',dates[0]).lte('work_date',dates[6]);
  if(error){showToast('Error','warn');return;}
  showToast('Removed');
  await renderSchedule();
}

// Close modal on overlay click
document.addEventListener('DOMContentLoaded',function(){
  const m=document.getElementById('assignModal');
  if(m) m.addEventListener('click',function(e){
    if(e.target===m) closeModal();
  });
  const km=document.getElementById('keyModal');
  if(km) km.addEventListener('click',function(e){
    if(e.target===km) closeKeyModal();
  });
});

// -- EDIT FROM WEEK VIEW ----------------------
function editDay(dateStr){
  selDate=dateStr;
  weekOff=0;
  sv('log');
  loadDayUI(dateStr);
  window.scrollTo(0,0);
}

// Background animation removed


/* --- 20. REQUESTS SYSTEM ----------------------------- */
// -- REQUESTS SYSTEM ----------------------
let reqPriority='normal', reqSelSupplies=new Set(), reqTabActive='send';
let unreadCount=0;

function initReqUI(){
  // Populate location select
  const sel=document.getElementById('reqLocation');
  if(sel){
    sel.innerHTML='<option value="">Select a location...</option>';
    LOCS.forEach(l=>{ const o=document.createElement('option');o.value=l.id;o.textContent=l.name;sel.appendChild(o); });
  }
  // Populate supply chips
  const sc=document.getElementById('reqSupplyChips');
  if(sc){
    sc.innerHTML=SUPS.map(s=>`<div class="supply-chip" onclick="toggleReqSupply(this,'${s.id}')">${s.name}</div>`).join('');
  }
}

function toggleReqSupply(el,id){
  if(reqSelSupplies.has(id)){reqSelSupplies.delete(id);el.classList.remove('sel');}
  else{reqSelSupplies.add(id);el.classList.add('sel');}
}

function setPriority(p){
  reqPriority=p;
  document.getElementById('pchip-normal').classList.toggle('sel',p==='normal');
  document.getElementById('pchip-urgent').classList.toggle('sel',p==='urgent');
}

function switchReqTab(tab){
  reqTabActive=tab;
  ['send','inbox','sent'].forEach(t=>{
    document.getElementById('rtab-'+t).classList.toggle('on',t===tab);
    document.getElementById('req-panel-'+t).style.display=t===tab?'block':'none';
  });
  if(tab==='inbox') loadInbox();
  if(tab==='sent') loadSent();
}

async function sendRequest(){
  const locEl=document.getElementById('reqLocation');
  const loc=locEl?locEl.value:'';
  const note=document.getElementById('reqNote').value.trim();
  const supplies=[...reqSelSupplies];

  if(!loc){showToast('Select a location','warn');return;}
  if(!supplies.length&&!note){showToast('Add supplies or a note','warn');return;}

  const locName=LOCS.find(l=>l.id===loc)?.name||loc;
  const supplyNames=supplies.map(s=>SUPS.find(x=>x.id===s)?.name||s);

  try{
    const{error}=await supabaseClient.from('requests').insert({
      sender_id:ME.id,
      sender_email:ME.email,
      location_id:loc,
      location_name:locName,
      supplies:supplyNames,
      note:note||null,
      priority:reqPriority,
      status:'open'
    });
    if(error){showToast('Error: '+error.message,'warn');console.error(error);return;}
    // Reset form
    document.getElementById('reqNote').value='';
    document.getElementById('reqLocation').value='';
    reqSelSupplies.clear();
    document.querySelectorAll('.supply-chip').forEach(c=>c.classList.remove('sel'));
    setPriority('normal');
    showToast('Request sent to manager OK');
    switchReqTab('sent');
  }catch(e){showToast('Error sending','warn');console.error(e);}
}

async function loadInbox(){
  const el=document.getElementById('reqInboxList');
  if(!el) return;
  el.innerHTML='<div class="req-empty">Loading...</div>';
  try{
    const{data,error}=await supabaseClient.from('requests').select('*').order('created_at',{ascending:false}).limit(50);
    if(error){el.innerHTML='<div class="req-empty">Error loading</div>';return;}
    if(!data||!data.length){el.innerHTML='<div class="req-empty"><svg viewBox="0 0 24 24" fill="none"><path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>No requests yet</div>';return;}
    el.innerHTML='';
    const open=data.filter(r=>r.status==='open');
    unreadCount=open.length;
    updateReqBadge();
    data.forEach(r=>el.appendChild(buildReqCard(r,true)));
  }catch(e){el.innerHTML='<div class="req-empty">Error</div>';console.error(e);}
}

async function loadSent(){
  const el=document.getElementById('reqSentList');
  if(!el) return;
  el.innerHTML='<div class="req-empty">Loading...</div>';
  try{
    const{data,error}=await supabaseClient.from('requests').select('*').eq('sender_id',ME.id).order('created_at',{ascending:false}).limit(30);
    if(error){el.innerHTML='<div class="req-empty">Error loading</div>';return;}
    if(!data||!data.length){el.innerHTML='<div class="req-empty">No sent requests yet</div>';return;}
    el.innerHTML='';
    data.forEach(r=>el.appendChild(buildReqCard(r,false)));
  }catch(e){el.innerHTML='<div class="req-empty">Error</div>';console.error(e);}
}

function buildReqCard(r, showActions){
  const card=document.createElement('div');
  const isOpen=r.status==='open';
  const isUrgent=r.priority==='urgent';
  card.className='req-card'+(isUrgent?' urgent':isOpen?' unread':'');

  const timeStr=new Date(r.created_at).toLocaleDateString('en-NZ',{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
  const suppliesHTML=r.supplies&&r.supplies.length
    ?r.supplies.map(s=>`<span class="req-item-tag supply">${s}</span>`).join(''):'';
  const actionsHTML=showActions&&isManager()&&isOpen
    ?`<div class="req-actions">
        <button class="req-btn resolve" onclick="resolveRequest('${r.id}',this)">Mark resolved</button>
        <button class="req-btn dismiss" onclick="dismissRequest('${r.id}',this)">Dismiss</button>
      </div>`:'';

  card.innerHTML=`
    <div class="req-card-head">
      <div class="req-meta">
        <div class="req-sender">${r.sender_email.split('@')[0]}</div>
        <div class="req-time">${timeStr}</div>
      </div>
      <div class="req-badges">
        ${isUrgent?'<span class="req-priority urgent">URGENT</span>':'<span class="req-priority normal">Normal</span>'}
        <span class="req-status ${isOpen?'open':'done'}">${isOpen?'Open':'Done'}</span>
      </div>
    </div>
    <div class="req-body">
      <div style="margin-bottom:6px"><span class="req-location-tag">[pin] ${r.location_name||'-'}</span></div>
      ${suppliesHTML?`<div class="req-items">${suppliesHTML}</div>`:''}
      ${r.note?`<div class="req-message">"${r.note}"</div>`:''}
    </div>
    ${actionsHTML}`;
  return card;
}

async function resolveRequest(id, btn){
  btn.disabled=true; btn.textContent='Saving...';
  const{error}=await supabaseClient.from('requests').update({status:'done'}).eq('id',id);
  if(error){showToast('Error','warn');btn.disabled=false;btn.textContent='Mark resolved';return;}
  showToast('Marked as resolved');
  loadInbox();
}

async function dismissRequest(id, btn){
  btn.disabled=true;
  const{error}=await supabaseClient.from('requests').delete().eq('id',id);
  if(error){showToast('Error','warn');btn.disabled=false;return;}
  showToast('Dismissed');
  loadInbox();
}

async function checkUnread(){
  if(!ME||!isManager()) return;
  try{
    const{count}=await supabaseClient.from('requests').select('id',{count:'exact',head:true}).eq('status','open');
    unreadCount=count||0;
    updateReqBadge();
  }catch(e){}
}

function updateReqBadge(){
  const dot=document.getElementById('req-badge-dot');
  const badge=document.getElementById('reqUnreadBadge');
  if(dot) dot.style.display=unreadCount>0?'block':'none';
  if(badge){
    badge.style.display=unreadCount>0?'block':'none';
    badge.textContent=unreadCount+' open';
  }
}


/* --- 21. BOOT SEQUENCE ------------------------------- */
// -- BOOT ----------------------------------
let booted = false;

function boot(session) {
  if (booted) return;
  booted = true;
  if (session && session.user) {
    initApp(session.user);
  } else {
    hideLoader();
    hideApp();
    showAuth();
  }
}

// Hard timeout - always show something within 4 seconds no matter what
setTimeout(() => {
  if (!booted) {
    booted = true;
    hideLoader();
    hideApp();
    showAuth();
  }
}, 4000);

// 1. Try getSession first (fastest path)
try {
  sb.auth.getSession().then(({ data }) => {
    boot(data && data.session ? data.session : null);
  }).catch(() => boot(null));
} catch(e) {
  boot(null);
}

// 2. Listen for auth state changes - handles sign in AFTER boot
try {
  sb.auth.onAuthStateChange((event, session) => {
    if (!booted) {
      // First load - use boot()
      boot(session);
    } else if (event === 'SIGNED_IN' && session && session.user) {
      // User just signed in from login screen
      initApp(session.user);
    } else if (event === 'SIGNED_OUT') {
      // User signed out
      ME = null;
      cache = {};
      hideApp();
      showAuth();
    }
  });
} catch(e) {}
document.addEventListener('keydown',e=>{
  if(e.key!=='Enter')return;
  const siBox=document.getElementById('siBox');
  const suBox=document.getElementById('suBox');
  if(siBox&&siBox.style.display!=='none') doSignIn();
  else if(suBox&&suBox.style.display!=='none') doSignUpFull();
});
