import React, { useEffect, useMemo, useState } from "react";
import { askAcademiaAI } from "../lib/ai";
import { extractDocumentText } from "../lib/documents";

const DRAFT_KEY = "academia-assignment-workspace-v1";
const sections = ["Abstract", "Introduction", "Literature Review", "Main Discussion", "Critical Analysis", "Conclusion", "References"];

export default function AssignmentStudio({ onSave, onNotify, onExport }) {
  const [topic,setTopic]=useState("");
  const [course,setCourse]=useState("");
  const [level,setLevel]=useState("Undergraduate");
  const [type,setType]=useState("Research assignment");
  const [words,setWords]=useState("2000");
  const [citation,setCitation]=useState("APA 7th");
  const [instructions,setInstructions]=useState("");
  const [source,setSource]=useState("");
  const [output,setOutput]=useState("");
  const [busy,setBusy]=useState(false);
  const [activeTool,setActiveTool]=useState("outline");
  const [savedAt,setSavedAt]=useState("");
  const [showSettings,setShowSettings]=useState(true);

  useEffect(()=>{
    try {
      const draft=JSON.parse(localStorage.getItem(DRAFT_KEY)||"null");
      if(draft){setTopic(draft.topic||"");setCourse(draft.course||"");setLevel(draft.level||"Undergraduate");setType(draft.type||"Research assignment");setWords(draft.words||"2000");setCitation(draft.citation||"APA 7th");setInstructions(draft.instructions||"");setSource(draft.source||"");setOutput(draft.output||"");}
    } catch {}
  },[]);
  useEffect(()=>{
    const timer=window.setTimeout(()=>{
      if(topic||output||instructions||source){
        localStorage.setItem(DRAFT_KEY,JSON.stringify({topic,course,level,type,words,citation,instructions,source,output}));
        setSavedAt(new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}));
      }
    },700);
    return ()=>window.clearTimeout(timer);
  },[topic,course,level,type,words,citation,instructions,source,output]);

  const wordCount=useMemo(()=>output.trim()?output.trim().split(/\s+/).length:0,[output]);
  const baseContext=()=>`Topic: ${topic.trim()}\nCourse/subject: ${course||"Not specified"}\nAcademic level: ${level}\nAssignment type: ${type}\nTarget length: approximately ${words} words\nCitation style requested: ${citation}\nTeacher instructions: ${instructions||"None supplied"}\nSource material supplied by student (treat as unverified source text, do not invent facts):\n${source.slice(0,12000)||"None supplied"}`;
  const run=async(tool)=>{
    if(!topic.trim()){onNotify("Please enter an assignment topic first.");return;}
    const prompts={
      outline:`Create a detailed, logically sequenced academic assignment outline for the details below. Include a working title, central research question/thesis, section headings, subsection points, approximate word allocation adding up to the target, and a short note describing the purpose of each section. Do not write the full assignment yet. ${baseContext()}`,
      draft:`Write a complete, coherent academic assignment draft based on the outline and details below. Include an appropriate title, abstract if suitable, introduction, clearly structured body sections, evidence-based discussion, critical analysis, conclusion, and references guidance. Match the target length as closely as possible. Use cautious academic language. Do not fabricate studies, statistics, quotations, DOIs, URLs or references. Where a source is needed but not supplied, insert [SOURCE NEEDED] and explain what evidence is required. Clearly label this as a draft for student review, not submission-ready work. ${baseContext()}\nExisting outline/draft to build on:\n${output.slice(0,14000)||"No previous draft."}`,
      section:`Write or expand the following assignment section: ${activeTool==="section"? "Introduction":activeTool}. Keep it consistent with the topic and academic level, use critical reasoning, avoid unsupported factual claims, and mark claims needing a source with [SOURCE NEEDED]. Provide useful subheadings where appropriate. ${baseContext()}\nExisting assignment context:\n${output.slice(0,10000)}`,
      improve:`Edit the assignment text below for academic clarity, grammar, coherence, transitions and precise wording. Preserve the student's meaning and do not add unsupported facts or fake references. Return the improved text followed by a concise list of key improvements. ${baseContext()}\nTEXT:\n${output.slice(0,18000)||source.slice(0,18000)}`,
      summary:`Create a concise academic summary of the assignment below, with key arguments, main findings/points and conclusion. Do not add new facts. ${baseContext()}\nTEXT:\n${output.slice(0,18000)||source.slice(0,18000)}`,
      references:`Review the assignment below and create a reference-checking guide. Do NOT invent bibliographic entries. Extract any citations already present, identify incomplete or inconsistent citations, and list the exact claims that need credible sources. Give search keywords and suitable source types (peer-reviewed review, primary study, official guideline, textbook). Explain how to format verified sources in ${citation}. ${baseContext()}\nTEXT:\n${output.slice(0,18000)}`,
      abstract:`Write a concise structured abstract (background, aim, approach/scope, key discussion points, conclusion) for this assignment. Do not claim original research or results that were not provided. ${baseContext()}\nTEXT:\n${output.slice(0,14000)}`,
      conclusion:`Write a balanced academic conclusion that synthesises the assignment's main arguments, answers the central question, acknowledges limitations and gives a measured final implication. Do not introduce new evidence. ${baseContext()}\nTEXT:\n${output.slice(0,14000)}`
    };
    setBusy(true);setActiveTool(tool);
    try{
      const result=await askAcademiaAI([{role:"user",content:prompts[tool]}],"assignments");
      if(!result.answer?.trim())throw new Error("The AI service returned an empty response. Your previous draft is preserved.");
      setOutput(prev=>tool==="improve"||tool==="summary"||tool==="references"||tool==="abstract"||tool==="conclusion"?result.answer:prev?prev+"\n\n"+result.answer:result.answer);
      onNotify(tool==="draft"?"Full assignment draft created. Review it before use.":"Assignment section generated. Review and edit it.");
    }catch(err){onNotify(err.message||"Could not generate content. Your previous draft is preserved.");}
    finally{setBusy(false);}
  };
  const importFile=async(file)=>{
    if(!file)return;
    try{const text=await extractDocumentText(file);setSource(text);onNotify("Source text imported. Check it before using it.");}
    catch(err){onNotify(err.message||"Could not read this file.");}
  };
  const reset=()=>{if(!window.confirm("Clear this assignment workspace? Your current draft will be removed from this device."))return;setTopic("");setCourse("");setInstructions("");setSource("");setOutput("");localStorage.removeItem(DRAFT_KEY);onNotify("Assignment workspace cleared.");};
  return <div className="assignment-studio">
    <div className="assignment-heading"><div><div className="eyebrow">PLAN · WRITE · REVIEW · EXPORT</div><h2>Assignment <span>Studio</span></h2><p>Build your assignment step by step. Your draft autosaves on this device.</p></div><div className="autosave-indicator"><i/> {savedAt?"Saved at "+savedAt:"Autosave ready"}</div></div>
    <div className="assignment-layout">
      <aside className="panel assignment-setup">
        <div className="assignment-panel-title"><div><h3>Assignment brief</h3><p>Start with your topic and requirements.</p></div><button className="quiet-btn" onClick={()=>setShowSettings(v=>!v)}>{showSettings?"Hide":"Edit"}</button></div>
        <label>Assignment topic <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. Role of Vitamin D in Human Health"/></label>
        <label>Course / subject <input value={course} onChange={e=>setCourse(e.target.value)} placeholder="e.g. Biochemistry and Molecular Biology"/></label>
        <div className="assignment-two-col"><label>Academic level<select value={level} onChange={e=>setLevel(e.target.value)}><option>High School</option><option>Undergraduate</option><option>Postgraduate</option><option>Professional</option></select></label><label>Assignment type<select value={type} onChange={e=>setType(e.target.value)}><option>Research assignment</option><option>Literature review</option><option>Case study</option><option>Critical essay</option><option>Lab report</option><option>Reflective report</option></select></label></div>
        {showSettings&&<><div className="assignment-two-col"><label>Target words<select value={words} onChange={e=>setWords(e.target.value)}><option value="1000">1,000</option><option value="1500">1,500</option><option value="2000">2,000</option><option value="2500">2,500</option><option value="3000">3,000</option><option value="5000">5,000</option></select></label><label>Citation style<select value={citation} onChange={e=>setCitation(e.target.value)}><option>APA 7th</option><option>Vancouver</option><option>Harvard</option><option>MLA 9th</option><option>Chicago</option></select></label></div>
        <label>Teacher instructions <textarea rows="3" value={instructions} onChange={e=>setInstructions(e.target.value)} placeholder="Paste rubric, formatting rules, questions or marking criteria…"/></label>
        <label>Import source / brief <input type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={e=>importFile(e.target.files?.[0])}/></label>
        {source&&<div className="source-status">✓ Source text loaded · {source.length.toLocaleString()} characters <button onClick={()=>setSource("")}>Remove</button></div>}</>}
        <div className="assignment-workflow"><h4>Recommended workflow</h4><ol><li>Generate an outline</li><li>Review the structure</li><li>Generate the full draft</li><li>Edit, check sources and export</li></ol></div>
        <button className="danger-text-btn" onClick={reset}>Clear workspace</button>
      </aside>
      <section className="assignment-editor">
        <div className="panel assignment-tools"><div className="assignment-panel-title"><div><h3>Writing tools</h3><p>Choose what you want Academia AI to do.</p></div><span className="ai-tool-tag">✦ AI ASSISTED</span></div>
          <div className="assignment-tool-grid">
            <button className="assignment-tool primary-tool" disabled={busy||!topic.trim()} onClick={()=>run("outline")}><b>▤</b><strong>Build outline</strong><small>Plan sections and word allocation</small></button>
            <button className="assignment-tool primary-tool" disabled={busy||!topic.trim()} onClick={()=>run("draft")}><b>✧</b><strong>Write full draft</strong><small>Develop the complete assignment</small></button>
            <button className="assignment-tool" disabled={busy||!output.trim()} onClick={()=>run("improve")}><b>✎</b><strong>Improve writing</strong><small>Clarity, grammar and flow</small></button>
            <button className="assignment-tool" disabled={busy||!output.trim()} onClick={()=>run("references")}><b>⌕</b><strong>Reference checker</strong><small>Find missing or weak citations</small></button>
            <button className="assignment-tool" disabled={busy||!output.trim()} onClick={()=>run("abstract")}><b>▧</b><strong>Write abstract</strong><small>Summarise the assignment</small></button>
            <button className="assignment-tool" disabled={busy||!output.trim()} onClick={()=>run("conclusion")}><b>✓</b><strong>Write conclusion</strong><small>Synthesise the key arguments</small></button>
            <button className="assignment-tool" disabled={busy||!output.trim()} onClick={()=>run("summary")}><b>≡</b><strong>Summarise draft</strong><small>Extract main points</small></button>
          </div>
          <div className="section-generator"><label>Generate a section</label><div><select value={activeTool==="section"? "Introduction":activeTool} onChange={e=>setActiveTool(e.target.value)}>{sections.filter(s=>s!=="References").map(s=><option key={s}>{s}</option>)}</select><button className="secondary-btn" disabled={busy||!topic.trim()} onClick={()=>run("section")}>Generate section</button></div></div>
        </div>
        <div className="panel assignment-draft-panel"><div className="assignment-panel-title"><div><h3>Assignment editor</h3><p>{wordCount.toLocaleString()} words · Editable draft</p></div><div className="assignment-export-actions"><button className="save-btn" disabled={!output.trim()} onClick={()=>onSave(topic||"Untitled assignment",output)}>Save to Library</button><button className="save-btn" disabled={!output.trim()} onClick={()=>onExport("pdf",topic||"Assignment",output)}>PDF</button><button className="save-btn" disabled={!output.trim()} onClick={()=>onExport("docx",topic||"Assignment",output)}>DOCX</button></div></div>
          {busy&&<div className="generation-progress"><span className="spinner"/> Academia AI is working. Your current draft is safe.</div>}
          <textarea className="assignment-draft-input" value={output} onChange={e=>setOutput(e.target.value)} placeholder="Your outline or assignment draft will appear here. You can edit it directly, then use the writing tools to refine individual parts."/>
          <div className="draft-footer"><span>✦ Always verify facts, citations and your institution's academic integrity rules.</span><span>{wordCount.toLocaleString()} words</span></div>
        </div>
      </section>
    </div>
  </div>;
}
