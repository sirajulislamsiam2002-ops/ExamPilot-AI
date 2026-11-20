export const translations = {
  en: {
    greeting: "Good evening", subtitle: "Ready to make today count?", dashboard: "Home", student: "Student", teacher: "Teacher", genie: "ExamGenie",
    overview: "Your overview", studyTime: "Study time", streak: "Day streak", courses: "Courses", progress: "Overall progress", upcoming: "Upcoming exam",
    quickActions: "Quick actions", practice: "Practice quiz", notes: "My notes", timetable: "Study plan", seeAll: "See all", studentTitle: "Student portal",
    teacherTitle: "Teacher portal", assignments: "Assignments", dueSoon: "Due soon", learners: "Active learners", assessments: "Assessments", tools: "Teaching tools",
    askGenie: "Ask ExamGenie anything...", send: "Send", online: "Your AI study companion", demo: "Demo mode",
    genieWelcome: "Hi! I'm ExamGenie.", genieIntro: "I can help you understand topics, make study plans and practise for exams. What are we learning today?",
    demoText: "Sample experience — connect an AI service to enable live answers.", language: "বাংলা", viewSchedule: "View schedule", continueLearning: "Continue learning",
    recentActivity: "Recent activity", completed: "Completed", pending: "Pending", createQuiz: "Create quiz", classNotes: "Class notes", welcomeBack: "Welcome back"
  },
  bn: {
    greeting: "শুভ সন্ধ্যা", subtitle: "আজকের পড়াশোনা শুরু করতে প্রস্তুত?", dashboard: "হোম", student: "শিক্ষার্থী", teacher: "শিক্ষক", genie: "ExamGenie",
    overview: "তোমার পড়াশোনার সারাংশ", studyTime: "পড়ার সময়", streak: "টানা দিন", courses: "কোর্স", progress: "সামগ্রিক অগ্রগতি", upcoming: "আসন্ন পরীক্ষা",
    quickActions: "দ্রুত কাজ", practice: "অনুশীলন", notes: "আমার নোট", timetable: "পড়ার রুটিন", seeAll: "সব দেখো", studentTitle: "শিক্ষার্থী পোর্টাল",
    teacherTitle: "শিক্ষক পোর্টাল", assignments: "অ্যাসাইনমেন্ট", dueSoon: "শিগগির জমা", learners: "সক্রিয় শিক্ষার্থী", assessments: "মূল্যায়ন", tools: "শিক্ষক টুলস",
    askGenie: "ExamGenie-কে প্রশ্ন করো...", send: "পাঠাও", online: "তোমার AI পড়াশোনার সঙ্গী", demo: "ডেমো মোড",
    genieWelcome: "হ্যালো! আমি ExamGenie।", genieIntro: "কোনো বিষয় বুঝতে, পড়ার পরিকল্পনা করতে ও পরীক্ষার অনুশীলনে আমি সাহায্য করতে পারি। আজ কী পড়ব?",
    demoText: "এটি নমুনা অভিজ্ঞতা—সরাসরি AI উত্তর পেতে AI সার্ভিস যুক্ত করতে হবে।", language: "English", viewSchedule: "রুটিন দেখো", continueLearning: "পড়া চালিয়ে যাও",
    recentActivity: "সাম্প্রতিক কার্যক্রম", completed: "সম্পন্ন", pending: "বাকি", createQuiz: "কুইজ তৈরি", classNotes: "ক্লাস নোট", welcomeBack: "আবার স্বাগতম"
  }
} as const;
export type Language = keyof typeof translations;