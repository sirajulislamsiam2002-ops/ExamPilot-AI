import React,{useEffect,useMemo,useState} from "react";
import {supabase,isSupabaseConfigured} from "../lib/supabase";

const localKey="academia-studio-notes";
export default function NotesStudio({onNotify}){
 const [notes,setNotes]=useState(()=>{try{return JSON.parse(localStorage.getItem(localKey)||"[]");}catch{return [];}});
 const [active,setActive]=useState(null),[search,setSearch]=useState(""),[showArchived,setShowArchived]=useState(false);
 const [busy,setBusy]=useState(false),[syncLabel,setSyncLabel]=useState(isSupabaseConfigured?"Cloud sync":"Saved on this device");
 const visible=useMemo(()=>notes.filter(n=>(showArchived?n.archived:!n.archived)&&((n.title||"").toLowerCase().includes(search.toLowerCase())||(n.content||"").toLowerCase().includes(search.toLowerCase())||(n.labels||[]).join(" ").toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||new Date(b.updated_at||b.updatedAt||0)-new Date(a.updated_at||a.updatedAt||0)),[notes,search,showArchived]);
 const persistLocal=(next)=>{setNotes(next);localStorage.setItem(localKey,JSON.stringify(next));};
 const load=async()=>{
  if(!isSupabaseConfigured)return;
  const {data,error}=await supabase.from("student_notes").select("*").order("pinned",{ascending:false}).order("updated_at",{ascending:false});
  if(error){setSyncLabel("Local backup · cloud unavailable");return;}
  setNotes(data||[]);localStorage.setItem(localKey,JSON.stringify(data||[]));setSyncLabel("Synced to cloud");
 };
 useEffect(()=>{load();},[]);
 const create=async()=>{
  const draft={id:crypto.randomUUID(),title:"Untitled note",content:"",labels:[],pinned:false,archived:false,updated_at:new Date().toISOString()};
  if(isSupabaseConfigured){setBusy(true);const {data,error}=await supabase.from("student_notes").insert({title:draft.title,content:""}).select().single();setBusy(false);if(error){onNotify?.(error.message);return;}draft.id=data.id;draft.created_at=data.created_at;draft.updated_at=data.updated_at;}
  persistLocal([draft,...notes]);setActive(draft.id);
 };
 const update=async(id,patch)=>{
  const current=notes.find(n=>n.id===id);if(!current)return;
  const next={...current,...patch,updated_at:new Date().toISOString()};
  persistLocal(notes.map(n=>n.id===id?next:n));
  if(isSupabaseConfigured){
   const payload={};for(const key of ["title","content","labels","pinned","archived"])if(key in patch)payload[key]=patch[key];
   const {error}=await supabase.from("student_notes").update({...payload,updated_at:next.updated_at}).eq("id",id);
   if(error)setSyncLabel("Local backup · sync error");else setSyncLabel("All changes saved");
  }
 };
 const remove=async(id)=>{
  if(!window.confirm("Delete this note permanently?"))return;
  if(isSupabaseConfigured){const {error}=await supabase.from("student_notes").delete().eq("id",id);if(error){onNotify?.(error.message);return;}}
  persistLocal(notes.filter(n=>n.id!==id));if(active===id)setActive(null);
 };
 const selected=notes.find(n=>n.id===active);
 return <div className="notes-studio">
  <div className="eyebrow">CAPTURE · ORGANISE · REMEMBER</div><h1>Notes <span>Studio.</span></h1><p className="page-intro">Quick academic notes, revision checklists and ideas—all in one private space.</p>
  <div className="notes-layout"><aside className="panel notes-sidebar">
   <button className="primary-btn" onClick={create} disabled={busy}>＋ New note</button>
   <input className="notes-search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search notes…"/>
   <div className="notes-tabs"><button className={!showArchived?"active":""} onClick={()=>setShowArchived(false)}>Notes</button><button className={showArchived?"active":""} onClick={()=>setShowArchived(true)}>Archive</button></div>
   <div className="notes-list">{visible.map(n=><button key={n.id} className={"note-list-item "+(active===n.id?"active":"")} onClick={()=>setActive(n.id)}><span className="note-list-title">{n.pinned?"📌 ":""}{n.title||"Untitled note"}</span><small>{new Date(n.updated_at||n.updatedAt||Date.now()).toLocaleDateString()} · {(n.content||"").slice(0,58)||"No content yet"}</small></button>)}{visible.length===0&&<p className="muted notes-empty">No notes found. Create a new note to get started.</p>}</div>
  </aside>
  <section className="panel note-editor">{!selected?<div className="empty-state"><div>✎</div><b>Select a note</b><span>Or create a new note to capture an idea.</span></div>:<>
   <div className="note-editor-actions"><span className="notes-sync">{syncLabel}</span><button className="save-btn" onClick={()=>update(selected.id,{pinned:!selected.pinned})}>{selected.pinned?"Unpin":"Pin"}</button><button className="save-btn" onClick={()=>update(selected.id,{archived:!selected.archived})}>{selected.archived?"Restore":"Archive"}</button><button className="delete-link" onClick={()=>remove(selected.id)}>Delete</button></div>
   <input className="note-title-input" value={selected.title} onChange={e=>update(selected.id,{title:e.target.value})} placeholder="Note title"/>
   <textarea className="note-content-input" value={selected.content} onChange={e=>update(selected.id,{content:e.target.value})} placeholder={"Start writing…\n\nTip: use [ ] and [x] to build a simple checklist."}/>
   <input className="note-label-input" value={(selected.labels||[]).join(", ")} onChange={e=>update(selected.id,{labels:e.target.value.split(",").map(x=>x.trim()).filter(Boolean)})} placeholder="Labels, separated by commas"/>
   <div className="note-editor-foot">Autosaves as you type · Private to your account</div>
  </>}</section></div>
 </div>;
}
