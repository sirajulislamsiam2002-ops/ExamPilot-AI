import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import StudentExam from "./StudentExam";

export default function ClassroomStudio({ onNotify }) {
  const [user,setUser]=useState(null);
  const [profile,setProfile]=useState(null);
  const [classrooms,setClassrooms]=useState([]);
  const [members,setMembers]=useState([]);
  const [selected,setSelected]=useState("");
  const [exams,setExams]=useState([]);
  const [name,setName]=useState("");
  const [description,setDescription]=useState("");
  const [code,setCode]=useState("");
  const [approval,setApproval]=useState(true);
  const [invite,setInvite]=useState("");
  const [examTitle,setExamTitle]=useState("");
  const [selectedExamId,setSelectedExamId]=useState("");
  const [questions,setQuestions]=useState([]);
  const [questionType,setQuestionType]=useState("mcq");
  const [questionPrompt,setQuestionPrompt]=useState("");
  const [questionOptions,setQuestionOptions]=useState("");
  const [correctAnswer,setCorrectAnswer]=useState("");
  const [duration,setDuration]=useState(30);
  const [busy,setBusy]=useState(false);
  const [joinLink,setJoinLink]=useState("");
  const [examToTake,setExamToTake]=useState(null);
  const isTeacher=profile?.role==="teacher"||profile?.role==="admin";

  const load=async()=>{
    const {data:{user:current}}=await supabase.auth.getUser();
    setUser(current);
    if(!current)return;
    const {data:p}=await supabase.from("profiles").select("display_name,role").eq("id",current.id).maybeSingle();
    setProfile(p||{role:"student"});
    if(p?.role==="teacher"||p?.role==="admin"){
      const {data,error}=await supabase.from("classrooms").select("*").order("created_at",{ascending:false});
      if(error)onNotify(error.message);else setClassrooms(data||[]);
    }else{
      const {data,error}=await supabase.from("classroom_members").select("id,status,joined_at,classrooms(id,name,description,classroom_code,teacher_id,is_active)").eq("student_id",current.id).order("joined_at",{ascending:false});
      if(error)onNotify(error.message);else setClassrooms((data||[]).map(m=>({...m.classrooms,membership_status:m.status,membership_id:m.id})).filter(Boolean));
    }
  };
  useEffect(()=>{load();},[]);
  useEffect(()=>{
    const token=new URLSearchParams(window.location.search).get("join");
    if(token){setJoinLink(token);}
  },[]);
  useEffect(()=>{
    if(!selected){setMembers([]);setExams([]);return;}
    const run=async()=>{
      if(isTeacher){
        const {data}=await supabase.from("classroom_members").select("id,status,joined_at,student_id").eq("classroom_id",selected).order("joined_at",{ascending:false});
        const ids=(data||[]).map(m=>m.student_id);
        const {data:people}=ids.length?await supabase.from("profiles").select("id,display_name").in("id",ids):{data:[]};
        const names=new Map((people||[]).map(p=>[p.id,p.display_name]));
        setMembers((data||[]).map(m=>({...m,display_name:names.get(m.student_id)||"Student"})));
      }
      const {data}=await supabase.from("classroom_exams").select("id,title,status,starts_at,ends_at,duration_minutes,created_at").eq("classroom_id",selected).order("created_at",{ascending:false});
      setExams(data||[]);
    };
    run();
  },[selected,isTeacher]);

  const createClassroom=async(e)=>{
    e.preventDefault();if(!name.trim())return;
    setBusy(true);
    const {data,error}=await supabase.from("classrooms").insert({teacher_id:user.id,name:name.trim(),description,approval_required:approval}).select().single();
    setBusy(false);
    if(error){onNotify(error.message);return;}
    setClassrooms(prev=>[data,...prev]);setSelected(data.id);setName("");setDescription("");
    onNotify("Classroom created successfully.");
  };
  const joinClassroom=async(e)=>{
    e.preventDefault();if(!code.trim()&&!joinLink.trim())return;
    setBusy(true);
    const {data,error}=await supabase.rpc("join_classroom",{p_code:code.trim()||null,p_invite_token:joinLink.trim()||null});
    setBusy(false);
    if(error){onNotify(error.message);return;}
    setCode("");setJoinLink("");window.history.replaceState({}, "", window.location.pathname);
    onNotify(data?.[0]?.membership_status==="approved"?"Classroom joined.":"Join request sent for teacher approval.");
    await load();
  };
  const reviewMember=async(memberId,status)=>{
    const {error}=await supabase.from("classroom_members").update({status,reviewed_at:new Date().toISOString()}).eq("id",memberId);
    if(error)onNotify(error.message);else{onNotify(status==="approved"?"Student approved.":"Join request rejected.");const {data}=await supabase.from("classroom_members").select("id,status,joined_at,student_id").eq("classroom_id",selected).order("joined_at",{ascending:false});setMembers(data||[]);}
  };
  const shareInvite=async(classroom)=>{
    const {data,error}=await supabase.rpc("get_classroom_invite",{p_classroom_id:classroom.id});
    if(error){onNotify(error.message);return;}
    const link=window.location.origin+window.location.pathname+"?join="+data;
    try{await navigator.clipboard.writeText(link);onNotify("Invitation link copied.");}catch{setInvite(link);onNotify("Invitation link is shown below.");}
    setInvite(link);
  };
  useEffect(()=>{if(!selectedExamId){setQuestions([]);return;}supabase.from("exam_questions").select("id,question_order,question_type,prompt,options,marks").eq("exam_id",selectedExamId).order("question_order").then(({data})=>setQuestions(data||[]));},[selectedExamId]);
  const createQuestion=async(e)=>{
    e.preventDefault();if(!selectedExamId||!questionPrompt.trim())return;
    const options=questionType==="mcq"?questionOptions.split("\n").map(x=>x.trim()).filter(Boolean):[];
    if(questionType==="mcq"&&options.length<2){onNotify("Add at least two options, one per line.");return;}
    const {data,error}=await supabase.from("exam_questions").insert({exam_id:selectedExamId,question_order:questions.length+1,question_type:questionType,prompt:questionPrompt.trim(),options,marks:1}).select().single();
    if(error){onNotify(error.message);return;}
    if(correctAnswer.trim()){const {error:keyError}=await supabase.from("exam_answer_keys").insert({question_id:data.id,answer_key:{answer:correctAnswer.trim()}});if(keyError){onNotify("Question saved, but answer key could not be saved: "+keyError.message);}}
    setQuestions(prev=>[...prev,data]);setQuestionPrompt("");setQuestionOptions("");setCorrectAnswer("");onNotify("Question added to exam.");
  };
  const createExam=async(e)=>{
    e.preventDefault();if(!selected||!examTitle.trim())return;
    const classroom=classrooms.find(c=>c.id===selected);
    const {data,error}=await supabase.from("classroom_exams").insert({classroom_id:selected,teacher_id:user.id,title:examTitle.trim(),duration_minutes:Number(duration),status:"draft"}).select().single();
    if(error){onNotify(error.message);return;}
    setExams(prev=>[data,...prev]);setExamTitle("");onNotify("Exam draft created. Add questions before publishing.");
  };
  const publishExam=async(exam)=>{
    const {error}=await supabase.from("classroom_exams").update({status:"published"}).eq("id",exam.id);
    if(error)onNotify(error.message);else{setExams(prev=>prev.map(x=>x.id===exam.id?{...x,status:"published"}:x));onNotify("Exam published.");}
  };

  if(!user)return <div className="panel classroom-panel"><h3>Sign in required</h3><p>Please sign in to use Classroom and Exam Portal.</p></div>;
  return <div className="classroom-wrap">
    <div className="eyebrow">CONNECT · TEACH · LEARN</div>
    <h1>{isTeacher?"Teacher":"Student"} <span>Classroom Portal.</span></h1>
    <p className="page-intro">Create classrooms, join with a code or invitation link, and manage classroom exams.</p>
    <div className="classroom-columns">
      <section className="panel classroom-panel">
        {isTeacher?<><h3>Create a classroom</h3><form onSubmit={createClassroom} className="classroom-form">
          <label>Classroom name<input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Molecular Biology – Batch 2026" required/></label>
          <label>Description<textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Course details and instructions"/></label>
          <label className="check-line"><input type="checkbox" checked={approval} onChange={e=>setApproval(e.target.checked)}/> Require teacher approval for students</label>
          <button className="primary-btn" disabled={busy}>{busy?"Creating…":"＋ Create classroom"}</button>
        </form></>:<><h3>Join a classroom</h3><form onSubmit={joinClassroom} className="classroom-form">
          <label>Classroom code<input value={code} onChange={e=>setCode(e.target.value)} placeholder="Enter classroom code"/></label>
          <div className="or-line">OR</div>
          <label>Invitation link token<input value={joinLink} onChange={e=>setJoinLink(e.target.value)} placeholder="Open a teacher invitation link or paste its token"/></label>
          <button className="primary-btn" disabled={busy||(!code.trim()&&!joinLink.trim())}>{busy?"Joining…":"Join classroom"}</button>
        </form></>}
        <div className="classroom-list-head"><h3>{isTeacher?"Your classrooms":"My classrooms"}</h3><span>{classrooms.length}</span></div>
        {classrooms.length===0?<div className="empty-state compact"><b>No classrooms yet.</b><span>{isTeacher?"Create your first classroom above.":"Join using a classroom code or invitation link."}</span></div>:classrooms.map(c=><button key={c.id} className={"classroom-list-item "+(selected===c.id?"selected":"")} onClick={()=>setSelected(c.id)}><span className="classroom-avatar">▦</span><span><b>{c.name}</b><small>{isTeacher?"Code: "+c.classroom_code:(c.membership_status||"member").toUpperCase()}</small></span><span>→</span></button>)}
      </section>
      <section className="panel classroom-panel classroom-detail">
        {!selected?<div className="empty-state"><div>▦</div><b>Select a classroom</b><span>Classroom details, members and exams will appear here.</span></div>:<>
          {(()=>{const c=classrooms.find(x=>x.id===selected);if(!c)return null;return <div className="classroom-detail-head"><div><div className="eyebrow">CLASSROOM</div><h2>{c.name}</h2><p>{c.description||"No description provided."}</p></div>{isTeacher&&<button className="save-btn" onClick={()=>shareInvite(c)}>Copy invitation link</button>}</div>})()}
          {isTeacher&&<div className="class-code-card"><small>CLASSROOM CODE</small><strong>{classrooms.find(c=>c.id===selected)?.classroom_code}</strong><span>Share this code or the invitation link with your students.</span></div>}
          {invite&&<div className="invite-output"><small>Invitation link</small><code>{invite}</code><button className="text-link" onClick={()=>navigator.clipboard?.writeText(invite)}>Copy link</button></div>}
          {isTeacher&&<><div className="classroom-list-head"><h3>Student requests & members</h3><span>{members.length}</span></div>{members.length===0?<p className="muted">No students have joined yet.</p>:members.map(m=><div className="member-row" key={m.id}><div><b>{m.display_name||"Student"}</b><small>{m.status}</small></div>{m.status==="pending"&&<div className="member-actions"><button onClick={()=>reviewMember(m.id,"approved")}>Approve</button><button onClick={()=>reviewMember(m.id,"rejected")}>Reject</button></div>}</div>)}
          <form className="create-exam-form" onSubmit={createExam}><h3>Create an exam</h3><label>Exam title<input value={examTitle} onChange={e=>setExamTitle(e.target.value)} placeholder="e.g. Cell Biology Midterm" required/></label><label>Duration (minutes)<input type="number" min="1" max="360" value={duration} onChange={e=>setDuration(e.target.value)}/></label><button className="primary-btn">＋ Create exam draft</button></form></>}
          <div className="classroom-list-head"><h3>{isTeacher?"Classroom exams":"Available exams"}</h3><span>{exams.length}</span></div>
          {exams.length===0?<p className="muted">No exams have been added yet.</p>:exams.map(exam=><div className={"exam-row "+(selectedExamId===exam.id?"active":"")} key={exam.id} onClick={()=>{if(isTeacher)setSelectedExamId(exam.id);else if(exam.status==="published")setExamToTake(exam);}}><div><b>{exam.title}</b><small>{exam.duration_minutes} min · {exam.status}</small></div>{isTeacher&&exam.status==="draft"&&<button disabled={selectedExamId!==exam.id||questions.length===0} onClick={(e)=>{e.stopPropagation();publishExam(exam);}}>Publish</button>}{!isTeacher&&exam.status==="published"&&<span className="exam-ready">Available</span>}</div>)}
          {isTeacher&&selectedExamId&&<div className="question-editor">
            <h3>Questions ({questions.length})</h3>
            {questions.map((q,i)=><div className="question-preview" key={q.id}><b>{i+1}. {q.prompt}</b><small>{q.question_type.toUpperCase()} · {q.marks} mark(s)</small>{q.options?.length>0&&<ul>{q.options.map((op,j)=><li key={j}>{op}</li>)}</ul>}</div>)}
            <form onSubmit={createQuestion} className="create-exam-form">
              <h3>Add a question</h3>
              <label>Question type<select value={questionType} onChange={e=>setQuestionType(e.target.value)}><option value="mcq">Multiple choice</option><option value="short">Short answer</option><option value="written">Written answer</option></select></label>
              <label>Question prompt<textarea value={questionPrompt} onChange={e=>setQuestionPrompt(e.target.value)} placeholder="Write the question…" required/></label>
              {questionType==="mcq"&&<label>Options (one per line)<textarea value={questionOptions} onChange={e=>setQuestionOptions(e.target.value)} placeholder={"Option A\\nOption B\\nOption C"}/></label>}
              <label>Answer key (private to teacher)<textarea value={correctAnswer} onChange={e=>setCorrectAnswer(e.target.value)} placeholder="Correct answer or marking guidance"/></label>
              <button className="primary-btn">＋ Add question</button>
            </form>
          </div>}
        </>}
      </section>
    </div>
    {examToTake&&<StudentExam exam={examToTake} onClose={()=>setExamToTake(null)} onNotify={onNotify}/>}
    <p className="classroom-note">Student exam sessions include a server-validated timer and automatic answer saving. MCQ scoring is automatic; written answers are evaluated by the teacher.</p>
  </div>;
}
