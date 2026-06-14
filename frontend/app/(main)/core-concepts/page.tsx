'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import {
  generateCSGuide,
  generateCSQuestions,
  evaluateCSAnswer,
  getCSHistory,
  saveCSHistory,
  transcribeAudio
} from '@/lib/api'
import { PageTransition } from '@/components/shared/PageTransition'
import { motion, AnimatePresence } from 'framer-motion'
import { Textarea } from '@/components/ui/textarea'
import {
  BookOpen, History, Play, Loader2, CheckCircle, BrainCircuit, Mic, MicOff, ChevronRight, GraduationCap, ChevronDown
} from 'lucide-react'

type Tab = 'guide' | 'quiz' | 'history'

export default function CoreConceptsPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState('')
  const [targetRole, setTargetRole] = useState('Software Engineer')
  const [activeTab, setActiveTab] = useState<Tab>('guide')

  // Guide State
  const [guide, setGuide] = useState<any>(null)
  const [loadingGuide, setLoadingGuide] = useState(false)

  // Quiz State
  const [quizState, setQuizState] = useState<'setup' | 'active' | 'summary'>('setup')
  const [quizSubject, setQuizSubject] = useState<'os' | 'dbms' | 'cn'>('os')
  const [quizTopic, setQuizTopic] = useState('')
  const [questions, setQuestions] = useState<string[]>([])
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [evaluations, setEvaluations] = useState<any[]>([])
  
  const [generatingQuestions, setGeneratingQuestions] = useState(false)
  const [evaluating, setEvaluating] = useState(false)

  // STT State
  const [isListening, setIsListening] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])

  // History State
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      try {
        const hist = await getCSHistory(user.id)
        setHistory(hist)
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingHistory(false)
      }
      
      handleGenerateGuide()
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleGenerateGuide() {
    setLoadingGuide(true)
    try {
      const g = await generateCSGuide(targetRole)
      setGuide(g)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingGuide(false)
    }
  }

  async function startQuiz(subject: 'os'|'dbms'|'cn', topic: string) {
    setQuizSubject(subject)
    setQuizTopic(topic)
    setActiveTab('quiz')
    setQuizState('setup')
    setGeneratingQuestions(true)
    
    try {
      const qs = await generateCSQuestions(subject.toUpperCase(), topic)
      setQuestions(qs)
      setEvaluations([])
      setCurrentQIndex(0)
      setCurrentAnswer('')
      setQuizState('active')
    } catch (e) {
      console.error(e)
      alert("Failed to generate questions.")
    } finally {
      setGeneratingQuestions(false)
    }
  }

  // ── STT ─────────────────────────────────────────────────────────────
  const toggleListening = async () => {
    if (isListening && mediaRecorder) {
      if (mediaRecorder.state !== 'inactive') mediaRecorder.stop()
      setIsListening(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const recorder = new MediaRecorder(stream)
        audioChunksRef.current = []

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data)
        }

        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          setTranscribing(true)
          try {
            const res = await transcribeAudio(audioBlob)
            if (res.text) {
              setCurrentAnswer(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + res.text)
            }
          } catch (e) {
            console.error("Transcription failed", e)
          } finally {
            setTranscribing(false)
          }
          stream.getTracks().forEach(track => track.stop())
        }

        recorder.start()
        setMediaRecorder(recorder)
        setIsListening(true)
      } catch (e) {
        console.error("Mic access denied", e)
        alert("Microphone access is required.")
      }
    }
  }

  async function submitAnswer() {
    if (!currentAnswer.trim() || evaluating) return
    setEvaluating(true)

    const currentQ = questions[currentQIndex]
    
    try {
      const evaluation = await evaluateCSAnswer(currentQ, currentAnswer)
      const newEvals = [...evaluations, { question: currentQ, answer: currentAnswer, ...evaluation }]
      setEvaluations(newEvals)

      // Save to history async
      saveCSHistory(userId, quizSubject.toUpperCase(), quizTopic, currentQ, currentAnswer, evaluation.score, evaluation.feedback, evaluation.missing_points).catch(console.error)

      if (currentQIndex < questions.length - 1) {
        setCurrentQIndex(prev => prev + 1)
        setCurrentAnswer('')
      } else {
        setQuizState('summary')
        // Refresh history
        getCSHistory(userId).then(setHistory)
      }
    } catch (e) {
      console.error(e)
      alert("Evaluation failed.")
    } finally {
      setEvaluating(false)
    }
  }

  function renderStars(score: number) {
    return "⭐".repeat(Math.ceil(score / 2)) + "☆".repeat(5 - Math.ceil(score / 2))
  }

  return (
    <PageTransition className="w-full max-w-7xl mx-auto mt-6 flex flex-col gap-8 pb-16 px-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <GraduationCap className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">CS Fundamentals</h1>
          </div>
          <p className="text-zinc-400 text-sm mt-3 max-w-xl">
            Master OS, DBMS, and Computer Networks. Follow your AI study guide and solidify your knowledge with targeted vocal quizzes.
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 p-1.5 rounded-xl border border-white/5 bg-[#0a0a0a]/50 w-fit">
        <button 
          onClick={() => setActiveTab('guide')}
          className={`px-6 py-2 rounded-lg text-[13px] font-medium transition-all flex items-center gap-2 ${
            activeTab === 'guide' 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <BookOpen className="h-4 w-4" /> Study Guide
        </button>
        <button 
          onClick={() => setActiveTab('quiz')}
          className={`px-6 py-2 rounded-lg text-[13px] font-medium transition-all flex items-center gap-2 ${
            activeTab === 'quiz' 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <BrainCircuit className="h-4 w-4" /> Active Quiz
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`px-6 py-2 rounded-lg text-[13px] font-medium transition-all flex items-center gap-2 ${
            activeTab === 'history' 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <History className="h-4 w-4" /> History
        </button>
      </div>

      {/* CONTENT */}
      <AnimatePresence mode="wait">
        
        {/* GUIDE TAB */}
        {activeTab === 'guide' && (
          <motion.div 
            key="guide"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {loadingGuide ? (
              <div className="flex justify-center items-center min-h-[40vh]">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              </div>
            ) : guide ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {(['os', 'dbms', 'cn'] as const).map((subj, idx) => {
                  const subjectName = subj === 'os' ? 'Operating Systems' : subj === 'dbms' ? 'Database Management' : 'Computer Networks'
                  const colorClass = 
                    subj === 'os' ? 'text-sky-400 border-sky-500/20 bg-sky-500/5 shadow-[0_0_20px_rgba(14,165,233,0.1)]' : 
                    subj === 'dbms' ? 'text-amber-400 border-amber-500/20 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 
                    'text-fuchsia-400 border-fuchsia-500/20 bg-fuchsia-500/5 shadow-[0_0_20px_rgba(217,70,239,0.1)]'
                  const glowClass = 
                    subj === 'os' ? 'bg-sky-500/10' : 
                    subj === 'dbms' ? 'bg-amber-500/10' : 
                    'bg-fuchsia-500/10'

                  return (
                    <motion.div 
                      key={subj} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`glass-card p-6 border relative overflow-hidden group ${colorClass}`}
                    >
                      <div className={`absolute top-0 right-0 w-48 h-48 blur-[80px] rounded-full pointer-events-none transition-all duration-500 opacity-50 group-hover:opacity-100 ${glowClass}`}></div>
                      
                      <div className="flex justify-between items-start mb-6 relative z-10">
                        <h3 className="text-xl font-bold text-white">{subjectName}</h3>
                        <span className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full border ${
                          guide[subj].priority === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                          guide[subj].priority === 'Medium' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                          'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}>
                          {guide[subj].priority} Priority
                        </span>
                      </div>
                      
                      <div className="space-y-3 relative z-10">
                        {guide[subj].topics.map((topic: string, i: number) => (
                          <div key={i} className="flex justify-between items-center bg-black/40 border border-white/5 p-3.5 rounded-xl hover:bg-white/5 transition-colors">
                            <span className="text-[13px] font-medium text-zinc-300">{topic}</span>
                            <button 
                              className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2"
                              onClick={() => startQuiz(subj, topic)}
                            >
                              Quiz <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="glass-card border border-white/5 bg-[#0a0a0a]/50 flex flex-col items-center justify-center p-16 text-center">
                <div className="p-5 rounded-full bg-white/5 border border-white/10 mb-6 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                  <BookOpen className="h-12 w-12 text-zinc-600" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No Study Guide Found</h3>
                <p className="text-[13px] text-zinc-400 mb-8 max-w-md">
                  We couldn't generate or load your study guide. Click the button below to generate a new AI-powered guide based on your target role.
                </p>
                <button 
                  onClick={handleGenerateGuide} 
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-black font-bold rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all"
                >
                  <Play className="h-4 w-4 fill-current" /> Generate Study Guide
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* QUIZ TAB */}
        {activeTab === 'quiz' && (
          <motion.div 
            key="quiz"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-4xl mx-auto"
          >
            {quizState === 'setup' && (
              <div className="glass-card border border-white/5 bg-[#0a0a0a]/80 flex flex-col items-center justify-center p-16 text-center">
                {generatingQuestions ? (
                  <div className="flex flex-col items-center gap-6">
                    <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
                    <div>
                      <p className="text-lg font-bold text-white mb-1">Generating Interview Questions</p>
                      <p className="text-[13px] text-zinc-400">Tailoring deep-dive questions for {quizTopic}...</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="p-5 rounded-full bg-white/5 border border-white/10 mb-6">
                      <BrainCircuit className="h-12 w-12 text-zinc-600" />
                    </div>
                    <p className="text-lg font-bold text-white mb-2">Ready to test your knowledge?</p>
                    <p className="text-[13px] text-zinc-400">Go back to the Study Guide tab and select a specific topic to begin a quiz.</p>
                  </div>
                )}
              </div>
            )}

            {quizState === 'active' && (
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center px-2">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
                    {quizSubject.toUpperCase()} - {quizTopic}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentQIndex) / questions.length) * 100}%` }}
                        className="h-full bg-emerald-500"
                      />
                    </div>
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest ml-2">
                      Question {currentQIndex + 1} / {questions.length}
                    </span>
                  </div>
                </div>

                <div className="glass-card p-8 border border-white/10 bg-[#0a0a0a]/90 relative overflow-hidden flex flex-col min-h-[500px]">
                  <div className="flex items-start gap-4 mb-8">
                    <div className="p-3 bg-white/5 border border-white/10 rounded-xl shrink-0 mt-1">
                      <BrainCircuit className="h-6 w-6 text-emerald-400" />
                    </div>
                    <h3 className="text-[18px] font-medium leading-relaxed text-white">
                      {questions[currentQIndex]}
                    </h3>
                  </div>

                  <div className="flex-1 flex flex-col relative mb-8">
                    <Textarea 
                      placeholder="Type your answer here, or click the microphone to speak naturally..."
                      className="flex-1 min-h-[250px] text-[15px] resize-y pb-12 bg-black/50 border-white/10 text-zinc-300 focus:border-emerald-500/50 leading-relaxed rounded-xl p-5"
                      value={currentAnswer}
                      onChange={e => setCurrentAnswer(e.target.value)}
                      disabled={evaluating || isListening || transcribing}
                    />
                    
                    {isListening && (
                      <div className="absolute bottom-4 left-4 text-[12px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-3 bg-black/80 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Recording audio...
                      </div>
                    )}
                    {transcribing && (
                      <div className="absolute bottom-4 left-4 text-[12px] font-bold text-sky-400 uppercase tracking-widest flex items-center gap-2 bg-black/80 px-3 py-1.5 rounded-lg border border-sky-500/30">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Transcribing with AI...
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <button
                      onClick={toggleListening}
                      disabled={evaluating || transcribing}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-[12px] uppercase tracking-widest transition-all ${
                        isListening 
                          ? "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]" 
                          : "bg-white/5 text-zinc-300 border border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {isListening ? (
                        <><MicOff className="h-4 w-4" /> Stop Recording</>
                      ) : (
                        <><Mic className="h-4 w-4" /> Start Speaking</>
                      )}
                    </button>

                    <button 
                      onClick={submitAnswer} 
                      disabled={!currentAnswer.trim() || evaluating || isListening || transcribing}
                      className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-black font-bold text-[13px] rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:bg-emerald-400 disabled:opacity-50 disabled:pointer-events-none transition-all"
                    >
                      {evaluating ? (
                        <><Loader2 className="h-4 w-4 animate-spin text-black" /> Evaluating...</>
                      ) : (
                        <>Submit Answer <ChevronRight className="h-4 w-4" /></>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {quizState === 'summary' && (
              <div className="space-y-6">
                <div className="glass-card p-10 border border-emerald-500/30 bg-emerald-500/10 text-center relative overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-emerald-500/20 blur-[100px] rounded-full pointer-events-none"></div>
                  <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto mb-6 relative z-10" />
                  <h2 className="text-3xl font-bold text-white mb-2 relative z-10">Quiz Complete!</h2>
                  <p className="text-[14px] text-emerald-200/70 relative z-10">Check your detailed AI evaluations below.</p>
                </div>
                
                {evaluations.map((ev, i) => (
                  <div key={i} className="glass-card border border-white/10 bg-[#0a0a0a]/80 overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-black/40 flex justify-between items-start gap-4">
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                          Question {i + 1}
                        </span>
                        <h3 className="text-[15px] font-medium text-white leading-snug">{ev.question}</h3>
                      </div>
                      <div className={`shrink-0 px-4 py-1.5 rounded-full font-bold text-[13px] border ${
                        (ev.score || 0) >= 8 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]" : 
                        (ev.score || 0) >= 5 ? "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]" : 
                        "bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                      }`}>
                        {ev.score}/10
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-6">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">Your Answer</span>
                        <div className="text-[14px] leading-relaxed text-zinc-300 bg-white/5 p-4 rounded-xl border border-white/5 relative">
                          <span className="absolute -top-3 -left-2 text-4xl text-white/10 font-serif">"</span>
                          {ev.answer}
                          <span className="absolute -bottom-6 -right-2 text-4xl text-white/10 font-serif">"</span>
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                          <BrainCircuit className="w-3.5 h-3.5 text-white/50" /> AI Feedback
                        </span>
                        <p className="text-[14px] leading-relaxed text-zinc-400">{ev.feedback}</p>
                      </div>

                      {ev.missing_points && ev.missing_points.length > 0 && (
                        <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-500/5">
                          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-4 block">Missing Points to Cover Next Time</span>
                          <ul className="list-disc pl-4 text-[13px] text-amber-100/80 space-y-2 marker:text-amber-500">
                            {ev.missing_points.map((pt: string, idx: number) => <li key={idx}>{pt}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <motion.div 
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 max-w-4xl mx-auto w-full"
          >
            {loadingHistory ? (
              <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>
            ) : history.length === 0 ? (
              <div className="glass-card border border-white/5 bg-[#0a0a0a]/50 flex flex-col items-center justify-center p-16 text-center">
                <History className="h-12 w-12 text-zinc-700 mb-4" />
                <p className="text-lg font-medium text-zinc-300">No Quiz History Yet</p>
                <p className="text-[13px] text-zinc-500 mt-2">Take a quiz from the study guide to build your history.</p>
              </div>
            ) : (
              history.map((item, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={item.id} 
                  className="glass-card p-6 border border-white/5 bg-[#0a0a0a]/80"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/30">
                        {item.subject}
                      </span>
                      <span className="text-[13px] font-medium text-zinc-400">{item.topic}</span>
                    </div>
                    <span className={`text-[12px] font-bold px-3 py-1 rounded-full border ${
                      item.score >= 8 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                      item.score >= 5 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                      'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}>
                      Score: {item.score}/10
                    </span>
                  </div>
                  
                  <p className="text-[14px] font-medium text-white mb-3">{item.question}</p>
                  
                  <div className="bg-black/50 border border-white/5 p-4 rounded-xl space-y-4">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Answer</span>
                      <p className="text-[13px] text-zinc-400 italic">"{item.answer}"</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Feedback</span>
                      <p className="text-[13px] text-emerald-300/80">{item.feedback}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  )
}
