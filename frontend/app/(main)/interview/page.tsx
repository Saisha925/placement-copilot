'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import {
  generateInterviewQuestions,
  evaluateAnswer,
  getInterviewHistory,
  saveInterviewResult,
  transcribeAudio,
  analyzeCommunication
} from '@/lib/api'
import { PageTransition } from '@/components/shared/PageTransition'
import { motion, AnimatePresence } from 'framer-motion'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  History, Play, Loader2, CheckCircle, BrainCircuit, Mic, MicOff, ChevronRight, Sparkles, AlertCircle
} from 'lucide-react'

type SessionState = 'setup' | 'active' | 'summary'
type RoundType = 'HR / Behavioral' | 'Technical' | 'System Design'
type ExperienceLevel = 'Student / Fresher' | 'Early Career' | 'Mid Level' | 'Senior'

interface QA {
  question: string
  answer: string
  evaluation?: {
    score: number
    feedback: string
    strengths: string[]
    improvements: string[]
  }
  communication?: {
    clarity_score: number
    confidence_score: number
    filler_words_detected: string[]
    feedback: string
  }
}

interface InterviewHistoryItem {
  id: string
  round_type: string
  overall_score: number
  feedback: string
  created_at: string
}

export default function InterviewPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState('')
  const [history, setHistory] = useState<InterviewHistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  // Session state
  const [sessionState, setSessionState] = useState<SessionState>('setup')
  const [targetRole, setTargetRole] = useState('Software Engineer')
  const [roundType, setRoundType] = useState<RoundType>('Technical')
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('Student / Fresher')
  
  // Active session
  const [questions, setQuestions] = useState<string[]>([])
  const [qaList, setQaList] = useState<QA[]>([])
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [currentAnswer, setCurrentAnswer] = useState('')
  
  // Loading states
  const [generatingQuestions, setGeneratingQuestions] = useState(false)
  const [evaluating, setEvaluating] = useState(false)

  // Speech Recognition states (MediaRecorder)
  const [isListening, setIsListening] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      try {
        const hist = await getInterviewHistory(user.id)
        setHistory(hist)
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingHistory(false)
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const toggleListening = async () => {
    if (isListening && mediaRecorder) {
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop()
      }
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
            alert("Transcription failed. Please try again.")
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
        alert("Microphone access is required to use this feature.")
      }
    }
  }

  async function startInterview() {
    if (!targetRole) return
    setGeneratingQuestions(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const data = await generateInterviewQuestions(
        user.id,
        '',
        targetRole,
        roundType,
        experienceLevel
      )
      
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions)
        setQaList(data.questions.map((q: string) => ({ question: q, answer: '' })))
        setCurrentQIndex(0)
        setSessionState('active')
      }
    } catch (e) {
      console.error(e)
      alert("Failed to generate questions. Please try again.")
    } finally {
      setGeneratingQuestions(false)
    }
  }

  async function submitAnswer() {
    if (!currentAnswer.trim() || evaluating) return
    setEvaluating(true)

    const currentQ = questions[currentQIndex]
    
    try {
      const [evaluation, communication] = await Promise.all([
        evaluateAnswer(currentQ, currentAnswer, targetRole),
        analyzeCommunication(currentAnswer)
      ])
      
      const newQaList = [...qaList]
      newQaList[currentQIndex] = {
        question: currentQ,
        answer: currentAnswer,
        evaluation,
        communication
      }
      setQaList(newQaList)

      // Auto advance or finish
      if (currentQIndex < questions.length - 1) {
        setCurrentQIndex(prev => prev + 1)
        setCurrentAnswer('')
      } else {
        // Finish session
        finishSession(newQaList)
      }

    } catch (e) {
      console.error(e)
      alert("Evaluation failed. Please try again.")
    } finally {
      setEvaluating(false)
    }
  }

  async function finishSession(completedQaList: QA[]) {
    // Calculate overall score
    const scores = completedQaList.map(qa => qa.evaluation?.score || 0)
    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    
    // Generate simple aggregate feedback
    const feedback = `Completed ${completedQaList.length} questions for the ${roundType} round. Overall score: ${overallScore}/10.`

    try {
      await saveInterviewResult(userId, targetRole, roundType, completedQaList, overallScore, feedback)
      // Refresh history
      const hist = await getInterviewHistory(userId)
      setHistory(hist)
    } catch (e) {
      console.error("Failed to save history:", e)
    }

    setSessionState('summary')
  }

  function renderStars(score: number) {
    return "⭐".repeat(Math.ceil(score / 2)) + "☆".repeat(5 - Math.ceil(score / 2))
  }

  // ── Render Views ─────────────────────────────────────────────────────────

  return (
    <PageTransition className="w-full max-w-7xl mx-auto mt-6 flex flex-col gap-8 pb-16 px-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
              <Mic className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">AI Mock Interviews</h1>
          </div>
          <p className="text-zinc-400 text-sm mt-3 max-w-xl">
            Simulate realistic interview conditions with speech-to-text. Get real-time feedback on your technical knowledge and communication clarity.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT SIDEBAR: History */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-card p-6 border border-white/5 bg-[#0a0a0a]/80 relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-48 h-48 bg-fuchsia-500/5 blur-[80px] rounded-full pointer-events-none"></div>
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className="text-[13px] font-semibold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                <History className="w-4 h-4 text-fuchsia-400" /> Session History
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 bg-white/5 rounded-full text-zinc-500">
                {history.length} Sessions
              </span>
            </div>
            
            {loadingHistory ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-fuchsia-500" /></div>
            ) : history.length === 0 ? (
              <div className="p-8 border border-dashed border-white/10 rounded-xl text-center flex flex-col items-center justify-center text-zinc-500">
                <History className="h-8 w-8 mb-3 opacity-20" />
                <p className="text-[13px]">No past interviews found.</p>
                <p className="text-[11px] mt-1">Start your first session on the right!</p>
              </div>
            ) : (
              <div className="space-y-3 relative z-10 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {history.map((item, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={item.id} 
                    className="p-4 rounded-xl border border-white/5 bg-black/40 hover:bg-white/5 hover:border-fuchsia-500/30 transition-all group"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-fuchsia-400 px-2 py-0.5 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-full">
                        {item.round_type}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {new Date(item.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[13px] font-medium text-white flex items-center gap-2">
                        Score <strong className="text-fuchsia-400">{item.overall_score}/10</strong>
                      </span>
                      <span className="text-[10px] tracking-widest">{renderStars(item.overall_score)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT MAIN AREA */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            
            {/* Setup State */}
            {sessionState === 'setup' && (
              <motion.div 
                key="setup"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="glass-card p-8 border border-fuchsia-500/20 bg-[#0a0a0a]/90 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/5 blur-[100px] rounded-full pointer-events-none"></div>
                
                <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-6 relative z-10">
                  <div className="p-4 bg-fuchsia-500/10 rounded-2xl border border-fuchsia-500/20 shadow-[0_0_20px_rgba(249,115,22,0.15)]">
                    <Sparkles className="h-6 w-6 text-fuchsia-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Configure Session</h3>
                    <p className="text-[13px] text-zinc-400 mt-1">Set your parameters to generate tailored interview questions.</p>
                  </div>
                </div>

                <div className="space-y-8 relative z-10">
                  <div className="space-y-3">
                    <Label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Target Role</Label>
                    <Input 
                      value={targetRole} 
                      onChange={e => setTargetRole(e.target.value)} 
                      placeholder="e.g. Software Engineer, Product Manager"
                      className="bg-black/50 border-white/10 text-white focus:border-fuchsia-500/50"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Select Round Type</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {(['HR / Behavioral', 'Technical', 'System Design'] as RoundType[]).map(type => (
                        <div 
                          key={type}
                          onClick={() => setRoundType(type)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all text-center flex items-center justify-center ${
                            roundType === type 
                              ? 'border-fuchsia-500 bg-fuchsia-500/10 shadow-[0_0_15px_rgba(249,115,22,0.15)]' 
                              : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                          }`}
                        >
                          <span className={`text-[13px] font-bold ${roundType === type ? 'text-fuchsia-400' : 'text-zinc-400'}`}>
                            {type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Experience Level</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {(['Student / Fresher', 'Early Career', 'Mid Level', 'Senior'] as ExperienceLevel[]).map(level => (
                        <div 
                          key={level}
                          onClick={() => setExperienceLevel(level)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all text-center flex items-center justify-center ${
                            experienceLevel === level 
                              ? 'border-fuchsia-500 bg-fuchsia-500/10 shadow-[0_0_15px_rgba(249,115,22,0.15)]' 
                              : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                          }`}
                        >
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${experienceLevel === level ? 'text-fuchsia-400' : 'text-zinc-500'}`}>
                            {level}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      onClick={startInterview}
                      disabled={generatingQuestions || !targetRole}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-fuchsia-500 text-black font-bold rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] disabled:opacity-50 disabled:pointer-events-none transition-all duration-300"
                    >
                      {generatingQuestions ? (
                        <><Loader2 className="h-5 w-5 animate-spin" /> Preparing AI Interviewer...</>
                      ) : (
                        <><Play className="h-5 w-5 fill-current" /> Start Interview Session</>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Active Session State */}
            {sessionState === 'active' && (
              <motion.div 
                key="active"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col gap-4"
              >
                <div className="flex justify-between items-center px-2">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-fuchsia-400 px-3 py-1 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-full">
                    {roundType} Round
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentQIndex) / questions.length) * 100}%` }}
                        className="h-full bg-fuchsia-500"
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
                      <BrainCircuit className="h-6 w-6 text-fuchsia-400" />
                    </div>
                    <h3 className="text-[18px] font-medium leading-relaxed text-white">
                      {questions[currentQIndex]}
                    </h3>
                  </div>

                  <div className="flex-1 flex flex-col relative mb-8">
                    <Textarea 
                      placeholder="Type your answer here, or click the microphone to speak naturally..."
                      className="flex-1 min-h-[250px] text-[15px] resize-y pb-12 bg-black/50 border-white/10 text-zinc-300 focus:border-fuchsia-500/50 leading-relaxed rounded-xl p-5"
                      value={currentAnswer}
                      onChange={e => setCurrentAnswer(e.target.value)}
                      disabled={evaluating || isListening || transcribing}
                    />
                    
                    {isListening && (
                      <div className="absolute bottom-4 left-4 text-[12px] font-bold text-fuchsia-400 uppercase tracking-widest flex items-center gap-3 bg-black/80 px-3 py-1.5 rounded-lg border border-fuchsia-500/30">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-fuchsia-500"></span>
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
                      className="flex items-center gap-2 px-6 py-2.5 bg-white text-black font-bold text-[13px] rounded-lg shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:pointer-events-none transition-all"
                    >
                      {evaluating ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Evaluating...</>
                      ) : (
                        <>Submit Answer <ChevronRight className="h-4 w-4" /></>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Summary State */}
            {sessionState === 'summary' && (
              <motion.div 
                key="summary"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="glass-card p-10 border border-emerald-500/30 bg-emerald-500/10 text-center relative overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-emerald-500/20 blur-[100px] rounded-full pointer-events-none"></div>
                  <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto mb-6 relative z-10" />
                  <h2 className="text-3xl font-bold text-white mb-2 relative z-10">Interview Complete!</h2>
                  <p className="text-[14px] text-emerald-200/70 relative z-10">Incredible work. Review your detailed AI evaluation and communication metrics below.</p>
                </div>

                <div className="space-y-6">
                  {qaList.map((qa, i) => (
                    <div key={i} className="glass-card border border-white/10 bg-[#0a0a0a]/80 overflow-hidden">
                      <div className="p-6 border-b border-white/5 bg-black/40 flex justify-between items-start gap-4">
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-widest px-2.5 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20">
                            Question {i + 1}
                          </span>
                          <h3 className="text-[15px] font-medium text-white leading-snug">{qa.question}</h3>
                        </div>
                        <div className={`shrink-0 px-4 py-1.5 rounded-full font-bold text-[13px] border ${
                          (qa.evaluation?.score || 0) >= 8 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]" : 
                          (qa.evaluation?.score || 0) >= 5 ? "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]" : 
                          "bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                        }`}>
                          {qa.evaluation?.score}/10
                        </div>
                      </div>
                      
                      <div className="p-6 space-y-8">
                        <div>
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">Your Answer</span>
                          <div className="text-[14px] leading-relaxed text-zinc-300 bg-white/5 p-4 rounded-xl border border-white/5 relative">
                            <span className="absolute -top-3 -left-2 text-4xl text-white/10 font-serif">"</span>
                            {qa.answer}
                            <span className="absolute -bottom-6 -right-2 text-4xl text-white/10 font-serif">"</span>
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-[10px] font-bold text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                            <BrainCircuit className="w-3.5 h-3.5 text-white/50" /> AI Feedback
                          </span>
                          <p className="text-[14px] leading-relaxed text-zinc-400">{qa.evaluation?.feedback}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {qa.evaluation?.strengths && qa.evaluation.strengths.length > 0 && (
                            <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-4 block">Strengths</span>
                              <ul className="list-disc pl-4 text-[13px] text-emerald-100/80 space-y-2 marker:text-emerald-500">
                                {qa.evaluation.strengths.map((s, idx) => <li key={idx}>{s}</li>)}
                              </ul>
                            </div>
                          )}
                          {qa.evaluation?.improvements && qa.evaluation.improvements.length > 0 && (
                            <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-500/5">
                              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-4 block">Areas to Improve</span>
                              <ul className="list-disc pl-4 text-[13px] text-amber-100/80 space-y-2 marker:text-amber-500">
                                {qa.evaluation.improvements.map((s, idx) => <li key={idx}>{s}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                        
                        {qa.communication && (
                          <div className="pt-6 border-t border-white/5">
                            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <Mic className="w-3.5 h-3.5" /> Communication Analysis
                            </span>
                            <div className="flex flex-wrap gap-4 mb-4">
                              <div className="px-4 py-2 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-widest text-zinc-400">Clarity</span>
                                <span className="text-[13px] font-bold text-sky-400">{qa.communication.clarity_score}/10</span>
                              </div>
                              <div className="px-4 py-2 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-widest text-zinc-400">Confidence</span>
                                <span className="text-[13px] font-bold text-fuchsia-400">{qa.communication.confidence_score}/10</span>
                              </div>
                            </div>
                            <p className="text-[13px] leading-relaxed text-zinc-400 bg-white/5 p-4 rounded-xl border border-white/5">
                              {qa.communication.feedback}
                            </p>
                            {qa.communication.filler_words_detected?.length > 0 && (
                              <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                <div>
                                  <span className="text-[11px] font-bold text-red-400 uppercase tracking-widest block mb-1">Filler Words Detected</span> 
                                  <span className="text-[13px] text-zinc-400">{qa.communication.filler_words_detected.join(", ")}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center pt-8 pb-4">
                  <button 
                    onClick={() => setSessionState('setup')}
                    className="px-8 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-[13px] uppercase tracking-widest transition-all"
                  >
                    Start Another Session
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  )
}
