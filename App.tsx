import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { Language, translations } from "./src/i18n";

type Tab = "home" | "student" | "teacher" | "genie";
type Message = { id: number; text: string; from: "user" | "genie" };
const C = { navy:"#111B3C", navy2:"#1D2B57", purple:"#7657E8", pale:"#F0ECFF", bg:"#F5F6FB", white:"#FFFFFF", text:"#18213D", muted:"#8991A8", line:"#E9EBF3", green:"#24A879", orange:"#F2A64A", blue:"#4A83E8" };

function Icon({ symbol, color=C.navy, bg=C.pale }: {symbol:string;color?:string;bg?:string}) {
  return <View style={[s.iconBox,{backgroundColor:bg}]}><Text style={{color,fontSize:19,fontWeight:"800"}}>{symbol}</Text></View>;
}
function Progress({value,color=C.purple}:{value:number;color?:string}) {
  return <View style={s.progressTrack}><View style={[s.progressFill,{width:`${value}%`,backgroundColor:color}]}/></View>;
}
function Section({title,right}:{title:string;right?:string}) {
  return <View style={s.sectionRow}><Text style={s.sectionTitle}>{title}</Text>{right ? <Text style={s.link}>{right}</Text> : null}</View>;
}

export default function App() {
  const [tab,setTab]=useState<Tab>("home");
  const [language,setLanguage]=useState<Language>("en");
  const [draft,setDraft]=useState("");
  const [messages,setMessages]=useState<Message[]>([]);
  const t=translations[language];
  const send=()=>{
    const value=draft.trim(); if(!value)return;
    setMessages(old=>[...old,{id:Date.now(),text:value,from:"user"},{id:Date.now()+1,text:language==="bn"?"দারুণ প্রশ্ন! এটি এখন ডেমো উত্তর। লাইভ AI চালু করতে নিরাপদ backend ও AI API যুক্ত করতে হবে।":"Great question! This is a demo reply. Connect a secure backend and AI API to enable live AI answers.",from:"genie"}]);
    setDraft("");
  };
  const coming=(name:string)=>Alert.alert(name,language==="bn"?"এই ফিচারটি পরবর্তী সংস্করণে যুক্ত করা হবে।":"This feature will be added in a future update.");
  const nav:[Tab,string,string][]=[["home","⌂",t.dashboard],["student","▤",t.student],["teacher","▣",t.teacher],["genie","✦",t.genie]];
  return <SafeAreaView style={s.safe}>
    <ExpoStatusBar style="light" backgroundColor={C.navy}/><StatusBar barStyle="light-content" backgroundColor={C.navy}/>
    <View style={s.header}>
      <View style={s.brandRow}><View style={s.brandMark}><Text style={s.brandMarkText}>E</Text></View><View><Text style={s.brand}>ExamPilot AI</Text><Text style={s.byline}>Created & Developed By Sirajul Islam</Text></View></View>
      <Pressable onPress={()=>setLanguage(language==="en"?"bn":"en")} style={s.lang}><Text style={s.langText}>{t.language}</Text></Pressable>
    </View>
    <KeyboardAvoidingView style={s.body} behavior={Platform.OS==="ios"?"padding":undefined}>
      {tab==="home" && <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.greetRow}><View style={{flex:1}}><Text style={s.eyebrow}>{t.greeting} 👋</Text><Text style={s.pageTitle}>{t.welcomeBack}</Text><Text style={s.subtitle}>{t.subtitle}</Text></View><View style={s.avatar}><Text style={s.avatarText}>S</Text></View></View>
        <View style={s.hero}><Text style={s.heroKicker}>✦ EXAMPILOT AI</Text><Text style={s.heroTitle}>{language==="bn"?"তোমার লক্ষ্য, তোমার গতি।":"Your goals. Your pace."}</Text><Text style={s.heroSub}>{language==="bn"?"প্রতিদিন একটু একটু করে এগিয়ে যাও।":"Make progress, one focused session at a time."}</Text><Pressable style={s.heroBtn} onPress={()=>setTab("genie")}><Text style={s.heroBtnText}>{t.continueLearning}  →</Text></Pressable><Text style={s.heroStar}>✦</Text></View>
        <Section title={t.overview}/>
        <View style={s.stats}><View style={s.stat}><Icon symbol="◷" color={C.blue} bg="#EAF1FF"/><Text style={s.statValue}>12.5h</Text><Text style={s.statLabel}>{t.studyTime}</Text><Text style={s.statHint}>↗ 8% this week</Text></View><View style={s.stat}><Icon symbol="♨" color={C.orange} bg="#FFF3E4"/><Text style={s.statValue}>7 {language==="bn"?"দিন":"days"}</Text><Text style={s.statLabel}>{t.streak}</Text><Text style={s.statHint}>🔥 Keep it up</Text></View></View>
        <Section title={t.progress} right="68%"/>
        <View style={s.card}><View style={s.inlineBetween}><Text style={s.cardTitle}>{language==="bn"?"সাপ্তাহিক লক্ষ্য":"Weekly learning goal"}</Text><Text style={s.percent}>68%</Text></View><Progress value={68}/><Text style={s.mutedSmall}>{language==="bn"?"এই সপ্তাহে ৫ দিনের মধ্যে ৩ দিন সম্পন্ন":"3 of 5 study days completed"}</Text></View>
        <Section title={t.upcoming} right={t.seeAll}/>
        <View style={s.examCard}><View style={s.examIcon}><Text style={{fontSize:22}}>📘</Text></View><View style={{flex:1}}><Text style={s.cardTitle}>{language==="bn"?"মলিকিউলার বায়োলজি":"Molecular Biology"}</Text><Text style={s.mutedSmall}>Nov 28, 2026  •  10:00 AM</Text><Text style={s.examTag}>{language==="bn"?"৮ দিন বাকি":"8 days left"}</Text></View><Text style={s.arrow}>›</Text></View>
        <Section title={t.quickActions}/>
        <View style={s.actions}>{[[ "✎",t.practice,"#EAF1FF",C.blue],[ "▤",t.notes,"#F0ECFF",C.purple],[ "◷",t.timetable,"#E8F7F1",C.green]].map(([ico,label,bg,color])=><Pressable key={label} style={s.action} onPress={()=>coming(label)}><Icon symbol={ico as string} bg={bg as string} color={color as string}/><Text style={s.actionText}>{label}</Text></Pressable>)}</View>
        <Text style={s.footer}>ExamPilot AI  •  Created & Developed By Sirajul Islam</Text>
      </ScrollView>}
      {tab==="student" && <ScrollView contentContainerStyle={s.content}>
        <Text style={s.eyebrow}>{t.welcomeBack}</Text><Text style={s.pageTitle}>{t.studentTitle}</Text><Text style={s.subtitle}>{language==="bn"?"তোমার কোর্স ও অ্যাসাইনমেন্ট এক জায়গায়":"Track courses, assignments and your learning progress."}</Text>
        <View style={s.stats}><View style={s.stat}><Icon symbol="▤"/><Text style={s.statValue}>04</Text><Text style={s.statLabel}>{t.courses}</Text></View><View style={s.stat}><Icon symbol="✓" color={C.green} bg="#E8F7F1"/><Text style={s.statValue}>08</Text><Text style={s.statLabel}>{t.completed}</Text></View></View>
        <Section title={t.courses} right={t.seeAll}/>
        {[["Biochemistry","72%",72,C.purple],["Molecular Biology","54%",54,C.blue],["Genetics","86%",86,C.green]].map(([name,pct,val,color])=><View key={name} style={s.card}><View style={s.inlineBetween}><Text style={s.cardTitle}>{name}</Text><Text style={s.percent}>{pct}</Text></View><Progress value={val as number} color={color as string}/><Text style={s.mutedSmall}>{language==="bn"?"কোর্সের অগ্রগতি":"Course progress"}</Text></View>)}
        <Section title={t.assignments} right={t.dueSoon}/><View style={s.examCard}><Icon symbol="▧"/><View style={{flex:1}}><Text style={s.cardTitle}>Cell Signaling Report</Text><Text style={s.mutedSmall}>Due Nov 24 • Biochemistry</Text></View><Text style={s.statusPending}>{t.pending}</Text></View>
        <Pressable style={s.primaryBtn} onPress={()=>coming(t.viewSchedule)}><Text style={s.primaryText}>{t.viewSchedule}</Text></Pressable>
      </ScrollView>}
      {tab==="teacher" && <ScrollView contentContainerStyle={s.content}>
        <Text style={s.eyebrow}>{t.welcomeBack}</Text><Text style={s.pageTitle}>{t.teacherTitle}</Text><Text style={s.subtitle}>{language==="bn"?"ক্লাস ও শিক্ষার্থীদের পরিচালনা করো":"Manage classes, learners and assessments."}</Text>
        <View style={s.stats}><View style={s.stat}><Icon symbol="♙" color={C.blue} bg="#EAF1FF"/><Text style={s.statValue}>128</Text><Text style={s.statLabel}>{t.learners}</Text></View><View style={s.stat}><Icon symbol="▣"/><Text style={s.statValue}>06</Text><Text style={s.statLabel}>{t.assessments}</Text></View></View>
        <Section title={t.tools}/><View style={s.toolGrid}>{[[ "✦",t.createQuiz ],[ "▤",t.classNotes ],[ "✓",t.assessments ],[ "◷",t.timetable ]].map(([ico,label])=><Pressable key={label} style={s.tool} onPress={()=>coming(label)}><Icon symbol={ico}/><Text style={s.toolText}>{label}</Text><Text style={s.arrow}>›</Text></Pressable>)}</View>
        <Section title={t.recentActivity}/><View style={s.card}><Text style={s.cardTitle}>Class 10 — Biology</Text><Text style={s.mutedSmall}>{language==="bn"?"১২ জন শিক্ষার্থী কুইজ সম্পন্ন করেছে":"12 students completed the latest quiz."}</Text><Progress value={78} color={C.green}/><Text style={s.mutedSmall}>78% {t.completed}</Text></View>
      </ScrollView>}
      {tab==="genie" && <View style={s.chatPage}>
        <View style={s.chatHeading}><View style={s.genieBadge}><Text style={{fontSize:24,color:C.white}}>✦</Text></View><View style={{flex:1}}><Text style={s.pageTitle}>ExamGenie</Text><Text style={s.subtitle}>{t.online}</Text></View><View style={s.demoPill}><Text style={s.demoText}>{t.demo}</Text></View></View>
        <View style={s.notice}><Text style={s.noticeText}>ⓘ {t.demoText}</Text></View>
        <ScrollView style={s.chatScroll} contentContainerStyle={{paddingBottom:18}}>{messages.length===0?<View style={s.welcomeCard}><Text style={s.welcomeIcon}>✦</Text><Text style={s.welcomeTitle}>{t.genieWelcome}</Text><Text style={s.welcomeBody}>{t.genieIntro}</Text></View>:messages.map(m=><View key={m.id} style={[s.message,{alignSelf:m.from==="user"?"flex-end":"flex-start",backgroundColor:m.from==="user"?C.navy:C.white}]}><Text style={{color:m.from==="user"?C.white:C.text,lineHeight:21}}>{m.text}</Text></View>)}</ScrollView>
        <View style={s.composer}><TextInput value={draft} onChangeText={setDraft} placeholder={t.askGenie} placeholderTextColor={C.muted} style={s.input} multiline/><Pressable style={s.sendBtn} onPress={send}><Text style={s.sendText}>➤</Text></Pressable></View>
      </View>}
    </KeyboardAvoidingView>
    <View style={s.bottomNav}>{nav.map(([key,ico,label])=><Pressable key={key} style={s.navItem} onPress={()=>setTab(key)}><Text style={[s.navIcon,{color:tab===key?C.purple:C.muted}]}>{ico}</Text><Text style={[s.navLabel,{color:tab===key?C.purple:C.muted,fontWeight:tab===key?"800":"600"}]}>{label}</Text>{tab===key?<View style={s.navDot}/>:null}</Pressable>)}</View>
  </SafeAreaView>;
}

const s=StyleSheet.create({
 safe:{flex:1,backgroundColor:C.bg},header:{height:72,backgroundColor:C.navy,paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
 brandRow:{flexDirection:"row",alignItems:"center",gap:10},brandMark:{width:38,height:38,borderRadius:13,backgroundColor:C.purple,alignItems:"center",justifyContent:"center"},brandMarkText:{fontSize:23,color:C.white,fontWeight:"900"},brand:{fontSize:17,color:C.white,fontWeight:"900",letterSpacing:.2},byline:{fontSize:9,color:"#C2C9E0",marginTop:2},lang:{borderWidth:1,borderColor:"#465174",borderRadius:18,paddingHorizontal:12,paddingVertical:7},langText:{color:C.white,fontSize:12,fontWeight:"700"},
 body:{flex:1},content:{padding:18,paddingBottom:30},greetRow:{flexDirection:"row",alignItems:"center",marginBottom:18},eyebrow:{fontSize:12,color:C.purple,fontWeight:"800",letterSpacing:.5},pageTitle:{fontSize:25,fontWeight:"900",color:C.text,marginTop:4},subtitle:{fontSize:12,color:C.muted,marginTop:5,lineHeight:18},avatar:{width:46,height:46,borderRadius:16,backgroundColor:"#E6E0FF",alignItems:"center",justifyContent:"center"},avatarText:{fontSize:19,color:C.purple,fontWeight:"900"},
 hero:{backgroundColor:C.navy,borderRadius:22,padding:20,marginBottom:22,overflow:"hidden"},heroKicker:{color:"#BDB2FF",fontSize:10,fontWeight:"900",letterSpacing:1.4},heroTitle:{fontSize:23,color:C.white,fontWeight:"900",marginTop:12,maxWidth:"82%"},heroSub:{fontSize:12,color:"#C6CDE2",marginTop:7,maxWidth:"80%"},heroBtn:{alignSelf:"flex-start",marginTop:18,backgroundColor:C.purple,paddingHorizontal:15,paddingVertical:11,borderRadius:12},heroBtnText:{color:C.white,fontSize:12,fontWeight:"800"},heroStar:{position:"absolute",right:18,top:42,fontSize:70,color:"#3C4772"},
 sectionRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:7,marginBottom:12},sectionTitle:{fontSize:15,color:C.text,fontWeight:"900"},link:{fontSize:11,color:C.purple,fontWeight:"800"},stats:{flexDirection:"row",gap:12,marginBottom:18},stat:{flex:1,backgroundColor:C.white,borderRadius:18,padding:14,borderWidth:1,borderColor:C.line},iconBox:{width:38,height:38,borderRadius:12,alignItems:"center",justifyContent:"center"},statValue:{fontSize:22,fontWeight:"900",color:C.text,marginTop:9},statLabel:{fontSize:11,color:C.muted,marginTop:2},statHint:{fontSize:10,color:C.green,marginTop:7,fontWeight:"700"},
 card:{backgroundColor:C.white,borderRadius:17,padding:15,marginBottom:11,borderWidth:1,borderColor:C.line},inlineBetween:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:11},cardTitle:{fontSize:13,color:C.text,fontWeight:"800"},percent:{fontSize:13,color:C.purple,fontWeight:"900"},progressTrack:{height:7,borderRadius:8,backgroundColor:"#ECEEF5",overflow:"hidden"},progressFill:{height:7,borderRadius:8},mutedSmall:{fontSize:10,color:C.muted,marginTop:8},
 examCard:{backgroundColor:C.white,borderRadius:17,padding:14,flexDirection:"row",alignItems:"center",gap:12,borderWidth:1,borderColor:C.line,marginBottom:16},examIcon:{width:44,height:44,borderRadius:14,backgroundColor:"#EEF2FF",alignItems:"center",justifyContent:"center"},examTag:{fontSize:10,color:C.orange,fontWeight:"800",marginTop:5},arrow:{fontSize:24,color:C.muted},actions:{flexDirection:"row",gap:10},action:{flex:1,backgroundColor:C.white,borderRadius:16,padding:12,alignItems:"center",gap:8,borderWidth:1,borderColor:C.line},actionText:{fontSize:10,color:C.text,fontWeight:"800",textAlign:"center"},footer:{fontSize:9,color:C.muted,textAlign:"center",marginTop:25},
 primaryBtn:{backgroundColor:C.purple,borderRadius:14,padding:14,alignItems:"center",marginTop:8},primaryText:{color:C.white,fontWeight:"800",fontSize:13},statusPending:{fontSize:10,color:C.orange,fontWeight:"800"},
 toolGrid:{gap:10,marginBottom:20},tool:{backgroundColor:C.white,borderRadius:15,padding:13,flexDirection:"row",alignItems:"center",gap:12,borderWidth:1,borderColor:C.line},toolText:{flex:1,fontSize:12,color:C.text,fontWeight:"800"},
 chatPage:{flex:1,padding:16},chatHeading:{flexDirection:"row",alignItems:"center",gap:12,marginBottom:15},genieBadge:{width:46,height:46,borderRadius:16,backgroundColor:C.purple,alignItems:"center",justifyContent:"center"},demoPill:{backgroundColor:"#FFF3E4",paddingHorizontal:10,paddingVertical:6,borderRadius:20},demoText:{fontSize:9,color:"#A66B1B",fontWeight:"800"},notice:{backgroundColor:"#F0ECFF",borderRadius:12,padding:11,marginBottom:14},noticeText:{fontSize:10,color:"#5F4AB6",lineHeight:15},chatScroll:{flex:1},welcomeCard:{backgroundColor:C.white,borderRadius:20,padding:22,marginTop:28,alignItems:"center",borderWidth:1,borderColor:C.line},welcomeIcon:{fontSize:35,color:C.purple},welcomeTitle:{fontSize:18,color:C.text,fontWeight:"900",marginTop:10},welcomeBody:{fontSize:12,color:C.muted,textAlign:"center",lineHeight:19,marginTop:8},message:{maxWidth:"85%",padding:13,borderRadius:16,marginVertical:5},composer:{flexDirection:"row",alignItems:"center",gap:9,backgroundColor:C.white,borderRadius:18,padding:8,borderWidth:1,borderColor:C.line,marginTop:12},input:{flex:1,minHeight:40,maxHeight:90,paddingHorizontal:9,color:C.text,fontSize:13},sendBtn:{width:42,height:42,borderRadius:14,backgroundColor:C.purple,alignItems:"center",justifyContent:"center"},sendText:{color:C.white,fontSize:19,fontWeight:"900"},
 bottomNav:{height:67,backgroundColor:C.white,borderTopWidth:1,borderTopColor:C.line,flexDirection:"row",justifyContent:"space-around",alignItems:"center",paddingBottom:3},navItem:{flex:1,alignItems:"center",justifyContent:"center",height:60,gap:2},navIcon:{fontSize:20},navLabel:{fontSize:9},navDot:{width:4,height:4,borderRadius:2,backgroundColor:C.purple,marginTop:1}
});