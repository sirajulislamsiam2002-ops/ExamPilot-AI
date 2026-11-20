import React,{useEffect,useMemo,useState} from "react";
import {supabase} from "../lib/supabase";

export default function TeacherGrading({exam,onNotify}){
 const [attempts,setAttempts]=useState([]),[questions,setQuestions]=useState([]),[names,setNames]=useState({});
 const [scores,setScores]=useState({}),[feedback,setFeedback]=useState({}),[busy,setBusy]=useState("");
 const [error,setError]=useState("");
 const writtenTotal=useMemo(()=>questions.filter(q=>q.question_type!=="mcq").reduce((n,q)=>n+Number(q.marks||0),0),[questions]);
 const load=async()=>{
  setError("");
  const [{data:a,error:ae},{data:q,error:qe}]=await Promise.all([
   supabase.from("exam_attempts").select("id,student_id,status,answers,auto_score,manual_score,score,total_marks,feedback,submitted_at,evaluated_at").eq("exam_id",exam.id).in("status",["submitted","evaluated"]).order("submitted_at",{ascending:false}),
   supabase.from("exam_questions").select("id,prompt,question_type,marks,question_order").eq("exam_id",exam.id).order("question_order")
  ]);
  if(ae||qe){setError(ae?.message||qe?.message);return;}
  setAttempts(a||[]);setQuestions(q||[]);
  const ids=[...new Set((a||[]).map(x=>x.student_id))];
  if(ids.length){const {data:p}=await supabase.from("profiles").select("id,display_name").in("id",ids);setNames(Object.fromEntries((p||[]).map(x=>[x.id,x.display_name||"Student"])));}
 };
 useEffect(()=>{load();},[exam.id]);
 const evaluate=async(a)=>{
  const manual=Number(scores[a.id]??a.manual_score??0);
  if(!Number.isFinite(manual)||manual<0||manual>writtenTotal){onNotify?.("Manual marks must be between 0 and "+writtenTotal);return;}
  setBusy(a.id);
  const {data,error:e}=await supabase.rpc("evaluate_exam_attempt",{p_attempt_id:a.id,p_manual_score:manual,p_feedback:feedback[a.id]??a.feedback??""});
  setBusy("");
  if(e){onNotify?.(e.message);return;}
  onNotify?.("Student result evaluated: "+data.score+" / "+data.total_marks);
  await load();
 };
 return <section className="teacher-grading">
  <div className="teacher-grading-head"><div><h3>Submitted answers & evaluation</h3><p>MCQs are auto-marked. Review short and written responses below.</p></div><button className="save-btn" onClick={load}>Refresh</button></div>
  {error&&<div className="exam-error">{error}</div>}
  {attempts.length===0?<p className="muted">No submitted attempts yet.</p>:attempts.map(a=><article className="grading-attempt" key={a.id}>
   <div className="grading-student-head"><div><b>{names[a.student_id]||"Student"}</b><small>{a.status} · {a.submitted_at?new Date(a.submitted_at).toLocaleString():""}</small></div><div className="grading-auto-score">MCQ: {a.auto_score??0} marks</div></div>
   <div className="grading-answers">{questions.map((q,i)=><div className="grading-answer" key={q.id}><b>{i+1}. {q.prompt}</b><small>{q.question_type} · {q.marks} marks</small><p>{a.answers?.[q.id]?.answer||"No answer provided"}</p></div>)}</div>
   <div className="grading-controls"><label>Manual marks (max {writtenTotal})<input type="number" min="0" max={writtenTotal} step="0.5" value={scores[a.id]??a.manual_score??""} onChange={e=>setScores(v=>({...v,[a.id]:e.target.value}))}/></label><label>Teacher feedback<textarea rows="2" value={feedback[a.id]??a.feedback??""} onChange={e=>setFeedback(v=>({...v,[a.id]:e.target.value}))} placeholder="Feedback for the student"/></label><button className="primary-btn" disabled={busy===a.id} onClick={()=>evaluate(a)}>{busy===a.id?"Saving…":a.status==="evaluated"?"Update evaluation":"Evaluate & publish result"}</button></div>
   {a.status==="evaluated"&&<div className="grading-result">Final result: <b>{a.score} / {a.total_marks}</b></div>}
  </article>)}
 </section>;
}
