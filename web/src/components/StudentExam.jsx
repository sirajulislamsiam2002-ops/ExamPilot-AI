import React,{useCallback,useEffect,useMemo,useState} from "react";
import {supabase} from "../lib/supabase";

export default function StudentExam({exam,onClose,onNotify}){
  const [attempt,setAttempt]=useState(null);
  const [questions,setQuestions]=useState([]);
  const [answers,setAnswers]=useState({});
  const [remaining,setRemaining]=useState(0);
  const [busy,setBusy]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [submitted,setSubmitted]=useState(false);

  const deadline=useMemo(()=>{
    if(!attempt?.started_at)return null;
    const started=new Date(attempt.started_at).getTime();
    const timerEnd=started+Number(exam.duration_minutes)*60000;
    const scheduleEnd=exam.ends_at?new Date(exam.ends_at).getTime():Infinity;
    return Math.min(timerEnd,scheduleEnd);
  },[attempt,exam.duration_minutes,exam.ends_at]);

  const saveAnswers=useCallback(async(next)=>{
    if(!attempt?.attempt_id||attempt.status!=="in_progress")return;
    setSaving(true);
    const {data,error:saveError}=await supabase.rpc("save_exam_attempt",{p_attempt_id:attempt.attempt_id,p_answers:next});
    setSaving(false);
    if(saveError){setError(saveError.message);return;}
    if(data?.status==="submitted"){setAttempt(prev=>({...prev,status:"submitted"}));setSubmitted(true);}
  },[attempt]);

  const submit=useCallback(async()=>{
    if(!attempt?.attempt_id||attempt.status!=="in_progress")return;
    setBusy(true);
    const {data,error:submitError}=await supabase.rpc("save_exam_attempt",{p_attempt_id:attempt.attempt_id,p_answers:answers});
    if(submitError){setBusy(false);setError(submitError.message);return;}
    if(data?.status==="submitted"){setAttempt(prev=>({...prev,status:"submitted"}));setSubmitted(true);setBusy(false);return;}
    const {data:result,error:resultError}=await supabase.rpc("submit_exam_attempt",{p_attempt_id:attempt.attempt_id});
    setBusy(false);
    if(resultError){setError(resultError.message);return;}
    setAttempt(prev=>({...prev,...result}));setSubmitted(true);
    onNotify?.("Your exam has been submitted.");
  },[attempt,answers,onNotify]);

  useEffect(()=>{
    let alive=true;
    (async()=>{
      setBusy(true);setError("");
      const {data:started,error:startError}=await supabase.rpc("start_exam_attempt",{p_exam_id:exam.id});
      if(startError){if(alive){setError(startError.message);setBusy(false);}return;}
      const {data:items,error:questionError}=await supabase.from("exam_questions")
        .select("id,question_order,question_type,prompt,options,marks")
        .eq("exam_id",exam.id).order("question_order");
      if(questionError){if(alive){setError(questionError.message);setBusy(false);}return;}
      if(alive){
        setAttempt(started);setAnswers(started.answers||{});setQuestions(items||[]);
        setSubmitted(started.status!=="in_progress");setBusy(false);
      }
    })();
    return()=>{alive=false;};
  },[exam.id]);

  useEffect(()=>{
    if(!deadline||submitted||attempt?.status!=="in_progress")return;
    const tick=()=>{
      const seconds=Math.max(0,Math.floor((deadline-Date.now())/1000));
      setRemaining(seconds);
      if(seconds===0)submit();
    };
    tick();const id=setInterval(tick,1000);return()=>clearInterval(id);
  },[deadline,submitted,attempt?.status,submit]);

  useEffect(()=>{
    if(!attempt?.attempt_id||attempt.status!=="in_progress"||submitted)return;
    const id=setTimeout(()=>saveAnswers(answers),900);
    return()=>clearTimeout(id);
  },[answers,attempt?.attempt_id,attempt?.status,submitted,saveAnswers]);

  const updateAnswer=(id,value)=>setAnswers(prev=>({...prev,[id]:{answer:value}}));
  const formatTime=(n)=>String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");

  if(busy&&!attempt)return <section className="panel student-exam-panel"><p>Preparing your exam securely…</p></section>;
  if(error&&!attempt)return <section className="panel student-exam-panel"><div className="exam-error">{error}</div><button className="save-btn" onClick={onClose}>Back to classroom</button></section>;

  return <section className="panel student-exam-panel">
    <div className="student-exam-top"><div><div className="eyebrow">SECURE EXAM SESSION</div><h2>{exam.title}</h2><p>{questions.length} questions · {exam.duration_minutes} minutes</p></div>
      {attempt?.status==="in_progress"&&<div className={"exam-countdown "+(remaining<300?"urgent":"")}><small>TIME LEFT</small><strong>{formatTime(remaining)}</strong></div>}
    </div>
    {attempt?.status!=="in_progress"?<div className="exam-submitted-state"><div className="exam-success-icon">✓</div><h3>Exam submitted</h3><p>Your answers are safely recorded. MCQ marks are calculated automatically; written answers may need teacher evaluation.</p>{attempt?.status==="evaluated"&&<div className="exam-score"><b>{attempt.score} / {attempt.total_marks}</b><span>Final result</span>{attempt.feedback&&<p>{attempt.feedback}</p>}</div>}<button className="primary-btn" onClick={onClose}>Return to classroom</button></div>:
      <><div className="exam-save-status">{saving?"Saving your answers…":"Your answers are auto-saved"} <span>·</span> Do not close this page before submission.</div>
      <div className="student-question-list">{questions.map((q,i)=><article className="student-question" key={q.id}><div className="student-question-meta"><b>Question {i+1}</b><span>{q.marks} mark(s) · {q.question_type}</span></div><h3>{q.prompt}</h3>
        {q.question_type==="mcq"?<div className="student-options">{(q.options||[]).map((option,index)=><label key={index} className={answers[q.id]?.answer===option?"chosen":""}><input type="radio" name={"q-"+q.id} checked={answers[q.id]?.answer===option} onChange={()=>updateAnswer(q.id,option)}/><span>{option}</span></label>)}</div>:
          <textarea rows={q.question_type==="written"?6:3} value={answers[q.id]?.answer||""} onChange={e=>updateAnswer(q.id,e.target.value)} placeholder="Write your answer here…"/>}
      </article>)}</div>
      <div className="student-exam-footer"><span>{Object.values(answers).filter(a=>String(a?.answer||"").trim()).length} answered</span><button className="primary-btn" disabled={busy} onClick={()=>{if(window.confirm("Submit your exam now? You cannot edit answers after submission."))submit();}}>{busy?"Submitting…":"Submit exam"}</button></div></>}
  </section>;
}
