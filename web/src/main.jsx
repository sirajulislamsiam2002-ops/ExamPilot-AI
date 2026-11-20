import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import { askAcademiaAI } from "./lib/ai";
import { extractDocumentText, uploadPrivateDocument, exportPdf, exportDocx, exportPptx } from "./lib/documents";

const modules = [
  { id:"dashboard", label:"Dashboard", icon:"▦", group:"WORKSPACE", desc:"Your academic command center" },
  { id:"genie", label:"Academia AI", icon:"✧", group:"WORKSPACE", desc:"Ask, explore and understand" },
  { id:"exams", label:"Exam Center", icon:"▤", group:"LEARNING", desc:"Create and practise exams" },
  { id:"assignments", label:"Assignment Studio", icon:"✎", group:"LEARNING", desc:"Plan and write better assignments" },
  { id:"presentations", label:"Presentation Studio", icon:"▥", group:"CREATE", desc:"Turn ideas into presentations" },
  { id:"library", label:"My Library", icon:"▣", group:"CREATE", desc:"Your saved academic materials" },
];
const starterPrompts = ["Explain a difficult concept simply","Create 10 MCQs on molecular biology","Make a 7-day study plan"];
const initialLibrary = JSON.parse(localStorage.getItem("academia-library") || "[]");

function App(){
 const [active,setActive]=useState("dashboard");
 const [query,setQuery]=useState("");
 const [topic,setTopic]=useState("");
 const [level,setLevel]=useState("Undergraduate");
 const [output,setOutput]=useState("");
 const [library,setLibrary]=useState(initialLibrary);
 const [toast,setToast]=useState("");
 const [busy,setBusy]=useState(false);
 const current=modules.find(m=>m.id===active);
 const savedCount=library.length;
 const notify=(msg)=>{setToast(msg);window.setTimeout(()=>setToast(""),2600)};
 const save=()=>{if(!output.trim())return;const next=[{id:Date.now(),title:topic||current.label,kind:current.label,content:output,date:new Date().toLocaleDateString()},...library];setLibrary(next);localStorage.setItem("academia-library",JSON.stringify(next));notify("Saved to My Library on this device.")};
 const generate=()=>{
   const subject=topic.trim()||"your selected topic";
   const result=active==="exams"
    ? `PRACTICE EXAM: ${subject}\nLevel: ${level}\n\n1. Which statement best describes the central concept of ${subject}?\n   A. A foundational definition\n   B. An unrelated process\n   C. A secondary outcome\n   D. None of the above\n\n2. Which of the following would be the best way to investigate ${subject}?\n   A. Compare relevant evidence\n   B. Ignore controls\n   C. Use an unsupported assumption\n   D. Skip analysis\n\n3. Explain one important application of ${subject}.\n\nAnswer key: 1. Review the core definition. 2. A. 3. Answers should include a relevant example.\n\nNote: This is a starter template, not a verified subject-specific exam.`
    : active==="assignments"
    ? `ASSIGNMENT OUTLINE: ${subject}\n\n1. Introduction\n   • Define the topic and establish its academic context.\n2. Background and key concepts\n   • Explain the major terms, principles and relevant literature.\n3. Main discussion\n   • Organise the discussion into clear, evidence-led sections.\n4. Critical analysis\n   • Compare findings, discuss limitations and identify gaps.\n5. Conclusion\n   • Summarise the central findings and implications.\n6. References\n   • Add verified sources in the citation style required by your institution.\n\nThis is an editable outline. Add verified research and citations before submission.`
    : active==="presentations"
    ? `PRESENTATION PLAN: ${subject}\n\nSlide 1 — Title and presenter\nSlide 2 — Learning objectives\nSlide 3 — Background and context\nSlide 4 — Core concepts\nSlide 5 — Evidence, examples or case study\nSlide 6 — Analysis and implications\nSlide 7 — Key takeaways\nSlide 8 — References and questions\n\nSpeaker notes: Keep each slide focused on one message and support factual claims with reliable sources.`
    : `STUDY GUIDE: ${subject}\n\n• Start with a clear definition and learning objective.\n• Break the topic into 3–5 smaller concepts.\n• Connect each concept to a practical example.\n• Test understanding with retrieval practice.\n• Review mistakes and revisit weak areas.\n\nSuggested next step: write a short explanation of the topic from memory, then compare it with your course materials.`;
   setOutput(result);notify("A starter draft has been created.");
 };
 const sendPrompt=(text)=>{setQuery(text);setActive("genie")};
 const askAI=async()=>{if(!query.trim())return;const question=query;setBusy(true);setOutput("");try{const result=await askAcademiaAI([{role:"user",content:question}],"ai");setOutput(result.answer||"No response was returned.");setQuery("");}catch(err){setOutput(err.message||"AI service is not configured yet.");}finally{setBusy(false);}};
 const handleDocument=async(file)=>{if(!file)return;setBusy(true);try{const text=await extractDocumentText(file);setTopic(file.name);setOutput("IMPORTED DOCUMENT: "+file.name+"\\n\\n"+text);if(isSupabaseConfigured){await uploadPrivateDocument(file);notify("Document extracted and uploaded to your private cloud storage.");}else notify("Document text extracted. Connect your account to enable private cloud storage.");}catch(err){notify(err.message||"Could not read this document.");}finally{setBusy(false);}};
 const exportCurrent=async(kind)=>{try{if(kind==="pdf")await exportPdf(topic||current.label,output);else if(kind==="docx")await exportDocx(topic||current.label,output);else await exportPptx(topic||current.label,output);notify(kind.toUpperCase()+" export started.");}catch(err){notify(err.message||"Export failed.");}};
 return <div className="app-shell">
  <aside className="sidebar">
   <div className="brand"><div className="brand-mark">A</div><div><strong>Academia Studio</strong><small>Created & Developed By Sirajul Islam</small></div></div>
   <div className="workspace-label">YOUR ACADEMIC SPACE</div>
   {["WORKSPACE","LEARNING","CREATE"].map(group=><div className="nav-group" key={group}><p>{group}</p>{modules.filter(m=>m.group===group).map(m=><button key={m.id} className={active===m.id?"nav-item active":"nav-item"} onClick={()=>{setActive(m.id);setOutput("")}}><span className="nav-icon">{m.icon}</span>{m.label}{m.id==="library"&&savedCount>0?<em>{savedCount}</em>:null}</button>)}</div>)}
   <div className="sidebar-bottom"><div className="upgrade-card"><div className="spark">✦</div><b>Make room for big ideas.</b><span>AI-powered academic productivity, all in one place.</span><button onClick={()=>notify("Plans and billing will be enabled after account and payment setup.")}>Explore plans <span>→</span></button></div><div className="profile"><div className="avatar">S</div><div><b>Workspace owner</b><small>Free workspace · Local preview</small></div><span className="dots">···</span></div></div>
  </aside>
  <nav className="mobile-nav">{modules.map(m=><button key={m.id} className={active===m.id?"mobile-nav-item active":"mobile-nav-item"} onClick={()=>{setActive(m.id);setOutput("");}}><span>{m.icon}</span><small>{m.label==="Assignment Studio"?"Assign.":m.label==="Presentation Studio"?"Slides":m.label==="Exam Center"?"Exams":m.label==="Dashboard"?"Home":m.label==="Academia AI"?"AI":"Library"}</small></button>)}</nav>
  <main className="main-area">
   <header className="topbar"><div className="crumb">Academia Studio <span>/</span> <b>{current.label}</b></div><div className="top-actions"><span className="status-dot"></span><span className="status-text">Workspace preview</span><button className="help-btn" onClick={()=>notify("Help center will be added in a later release.")}>? Help</button><div className="avatar small">S</div></div></header>
   <section className="page">
    {active==="dashboard"&&<><div className="welcome-row"><div><div className="eyebrow">YOUR ACADEMIC COMMAND CENTER</div><h1>Make today a <span>learning win.</span></h1><p>Everything you need to study smarter, create confidently and stay organised.</p></div><div className="date-chip">✦ &nbsp; Your workspace</div></div>
      <div className="hero-banner"><div className="hero-content"><div className="hero-kicker">✧ INTRODUCING YOUR AI WORKSPACE</div><h2>Big academic goals.<br/>One focused space.</h2><p>Plan your study, practise for exams and turn ideas into polished academic work.</p><button onClick={()=>setActive("genie")}>Explore Academia AI <span>→</span></button></div><div className="hero-art"><div className="orb orb-one"></div><div className="orb orb-two"></div><div className="hero-document"><div className="doc-top">✦ &nbsp; ACADEMIA AI</div><div className="doc-line wide"></div><div className="doc-line"></div><div className="doc-line short"></div><div className="doc-chart"><i></i><i></i><i></i><i></i><i></i><i></i></div></div></div></div>
      <div className="section-heading"><div><h3>Your studios</h3><p>Choose a workspace and get started.</p></div><span className="muted">6 workspaces</span></div>
      <div className="studio-grid">{modules.map((m,i)=><button className="studio-card" key={m.id} onClick={()=>setActive(m.id)}><div className={"studio-icon tone-"+i}>{m.icon}</div><div className="card-arrow">↗</div><h4>{m.label}</h4><p>{m.desc}</p><span className="open-label">Open workspace <b>→</b></span></button>)}</div>
      <div className="bottom-grid"><div className="panel"><div className="panel-title"><div><h3>Quick start</h3><p>Jump into a task.</p></div><span>✦</span></div>{starterPrompts.map((p,i)=><button className="prompt-row" key={p} onClick={()=>sendPrompt(p)}><span>{["✧","▤","◷"][i]}</span>{p}<b>→</b></button>)}</div><div className="panel progress-panel"><div className="panel-title"><div><h3>Your library</h3><p>Your saved work, close at hand.</p></div><span>▣</span></div><div className="library-count">{savedCount.toString().padStart(2,"0")} <small>saved drafts</small></div><button className="text-link" onClick={()=>setActive("library")}>Open My Library →</button></div></div>
    </>}
    {active==="genie"&&<><div className="eyebrow">THINK, LEARN, DISCOVER</div><h1>Meet <span>Academia AI.</span></h1><p className="page-intro">Your academic thinking partner for explanations, ideas and study support.</p><div className="ai-layout"><div className="ai-main"><div className="ai-welcome"><div className="ai-symbol">✧</div><h2>What are we learning today?</h2><p>Ask a question or choose a starting point below.</p><div className="prompt-chips">{starterPrompts.map(p=><button key={p} onClick={()=>setQuery(p)}>{p}</button>)}</div></div><div className="ask-box"><textarea value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ask anything about your studies..." rows="3"/><div><span>AI answers require a secure provider connection.</span><button onClick={askAI} disabled={!query.trim()||busy}>{busy?"Thinking…":"Send"} <b>↑</b></button></div></div></div><aside className="side-note"><h3>Ways to use Academia AI</h3><p>✦ &nbsp; Break down complex topics</p><p>✦ &nbsp; Brainstorm assignment ideas</p><p>✦ &nbsp; Build a revision plan</p><p>✦ &nbsp; Practise explaining concepts</p><div className="notice">Preview mode: live AI is not connected yet. No question is sent to an AI service.</div></aside></div></>}
    {["exams","assignments","presentations"].includes(active)&&<><div className="eyebrow">ACADEMIC CREATION WORKSPACE</div><h1>{current.label}</h1><p className="page-intro">{current.desc}. Create a structured starting draft you can edit and develop.</p><div className="builder-layout"><div className="panel builder-form"><h3>Set up your draft</h3><label>Topic or subject<input value={topic} onChange={e=>setTopic(e.target.value)} placeholder={active==="exams"?"e.g. Molecular Biology":active==="assignments"?"e.g. Cell Signaling":"e.g. CRISPR-Cas9"} /></label><label>Academic level<select value={level} onChange={e=>setLevel(e.target.value)}><option>High School</option><option>Undergraduate</option><option>Postgraduate</option><option>Professional</option></select></label><label>Import a document<input type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={e=>handleDocument(e.target.files?.[0])}/></label><button className="primary-btn" onClick={generate} disabled={busy}>✦ &nbsp; {busy?"Working…":"Generate starter draft"}</button><p className="form-foot">This creates a local template. It is not a live AI-generated or academically verified result.</p></div><div className="panel output-panel"><div className="output-head"><div><h3>Draft preview</h3><p>Your generated content appears here.</p></div>{output&&<div className="output-actions"><button className="save-btn" onClick={save}>＋ Save</button><button className="save-btn" onClick={()=>exportCurrent("pdf")}>PDF</button><button className="save-btn" onClick={()=>exportCurrent("docx")}>DOCX</button>{active==="presentations"&&<button className="save-btn" onClick={()=>exportCurrent("pptx")}>PPTX</button>}</div>}</div>{output?<pre>{output}</pre>:<div className="empty-state"><div>✧</div><b>Your workspace is ready</b><span>Enter a topic and generate a starter draft to see it here.</span></div>}</div></div></>}
    {active==="library"&&<><div className="eyebrow">YOUR PERSONAL COLLECTION</div><h1>My <span>Library.</span></h1><p className="page-intro">Your saved drafts are stored in this browser on this device.</p>{library.length===0?<div className="panel empty-library"><div>▣</div><h3>Your library is waiting.</h3><p>Save a draft from Exam Center, Assignment Studio or Presentation Studio to keep it here.</p><button className="primary-btn" onClick={()=>setActive("assignments")}>Create your first draft →</button></div>:<div className="saved-grid">{library.map(item=><article className="panel saved-card" key={item.id}><div className="saved-meta">{item.kind}<span>{item.date}</span></div><h3>{item.title}</h3><pre>{item.content.slice(0,500)}{item.content.length>500?"…":""}</pre><button className="text-link" onClick={()=>{setOutput(item.content);setTopic(item.title);notify("Draft loaded into preview.")}}>Preview draft →</button><button className="delete-link" onClick={()=>{const next=library.filter(x=>x.id!==item.id);setLibrary(next);localStorage.setItem("academia-library",JSON.stringify(next));notify("Draft removed from this device.")}}>Delete</button></article>)}</div>}</>}
    {output&&active==="genie"&&<div className="panel ai-response"><div className="output-head"><h3>Workspace response</h3><button className="save-btn" onClick={save}>＋ Save</button></div><pre>{output}</pre></div>}
    <footer className="footer">Academia Studio <span>·</span> Created & Developed By Sirajul Islam <span>·</span> Built for better learning</footer>
   </section>
  </main>
  {toast&&<div className="toast">{toast}</div>}
 </div>
}
function AuthGate(){
 const [session,setSession]=useState(null),[loading,setLoading]=useState(isSupabaseConfigured),[mode,setMode]=useState("signin"),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[fullName,setFullName]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 React.useEffect(()=>{
  if(!isSupabaseConfigured){setLoading(false);return;}
  supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false);});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next));
  return ()=>subscription.unsubscribe();
 },[]);
 const submit=async(e)=>{e.preventDefault();setBusy(true);setMessage("");try{
  if(mode==="signup"){const {error}=await supabase.auth.signUp({email,password,options:{data:{full_name:fullName}}});if(error)throw error;setMessage("Account created. Check your email to confirm your address.");}
  else if(mode==="reset"){const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});if(error)throw error;setMessage("Password reset link sent. Check your inbox.");}
  else {const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;}
 }catch(err){setMessage(err.message||"Could not complete the request.");}finally{setBusy(false);}};
 if(!isSupabaseConfigured)return <App/>;
 if(loading)return <div className="auth-screen"><div className="auth-card">Loading your secure workspace…</div></div>;
 if(session)return <><App/><button className="signout-fab" onClick={()=>supabase.auth.signOut()}>Sign out</button></>;
 return <div className="auth-screen"><div className="auth-card"><div className="brand-mark auth-mark">A</div><div className="eyebrow">YOUR ACADEMIC WORLD, POWERED BY AI</div><h1>Academia <span>Studio.</span></h1><p className="auth-copy">Sign in to access your academic workspace and keep your work synced.</p><form onSubmit={submit}>{mode==="signup"&&<label>Full name<input required value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your name"/></label>}<label>Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>{mode!=="reset"&&<label>Password<input required minLength="8" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters"/></label>}<button className="primary-btn" disabled={busy}>{busy?"Please wait…":mode==="signup"?"Create account":mode==="reset"?"Send reset link":"Sign in"}</button></form>{message&&<div className="auth-message">{message}</div>}<div className="auth-links">{mode==="signin"?<><button onClick={()=>setMode("signup")}>Create an account</button><button onClick={()=>setMode("reset")}>Forgot password?</button></>:<button onClick={()=>{setMode("signin");setMessage("");}}>Back to sign in</button>}</div><small>Created & Developed By Sirajul Islam</small></div></div>;
}

createRoot(document.getElementById("root")).render(<AuthGate/>);
