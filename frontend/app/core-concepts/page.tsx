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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  BookOpen, History, Play, Loader2, CheckCircle, BrainCircuit, Mic, MicOff, ChevronRight, GraduationCap
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
    <div className="min-h-screen bg-background p-6 max-w-6xl mx-auto flex flex-col gap-6">
      
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-xl">
          <GraduationCap className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">CS Fundamentals</h1>
          <p className="text-muted-foreground">Master OS, DBMS, and Computer Networks</p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-border/50">
        <button 
          onClick={() => setActiveTab('guide')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'guide' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <div className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Study Guide</div>
        </button>
        <button 
          onClick={() => setActiveTab('quiz')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'quiz' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <div className="flex items-center gap-2"><BrainCircuit className="h-4 w-4" /> Active Quiz</div>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <div className="flex items-center gap-2"><History className="h-4 w-4" /> History</div>
        </button>
      </div>

      {/* CONTENT */}
      <div className="pt-4">
        {activeTab === 'guide' && (
          <div className="space-y-6">
            {loadingGuide ? (
              <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : guide ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(['os', 'dbms', 'cn'] as const).map(subj => {
                  const subjectName = subj === 'os' ? 'Operating Systems' : subj === 'dbms' ? 'Database Management' : 'Computer Networks'
                  return (
                    <Card key={subj} className="border-primary/10 shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{subjectName}</CardTitle>
                          <Badge variant="outline" className={
                            guide[subj].priority === 'High' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                            guide[subj].priority === 'Medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                            'bg-green-500/10 text-green-500 border-green-500/20'
                          }>
                            {guide[subj].priority} Priority
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {guide[subj].topics.map((topic: string, i: number) => (
                            <li key={i} className="flex justify-between items-center bg-muted/30 p-2 rounded-md">
                              <span className="text-sm font-medium">{topic}</span>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => startQuiz(subj, topic)}>
                                Quiz Me
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-xl">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Study Guide Found</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md">
                  We couldn't generate or load your study guide. Click the button below to generate a new one based on your target role.
                </p>
                <Button onClick={handleGenerateGuide} className="gap-2">
                  <Play className="h-4 w-4" /> Generate Study Guide
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="max-w-3xl mx-auto">
            {quizState === 'setup' && (
              <div className="text-center py-12 text-muted-foreground">
                {generatingQuestions ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p>Generating targeted questions for {quizTopic}...</p>
                  </div>
                ) : (
                  <p>Select a topic from the Study Guide to begin a quiz.</p>
                )}
              </div>
            )}

            {quizState === 'active' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
                    {quizSubject.toUpperCase()} - {quizTopic}
                  </Badge>
                  <span className="text-sm font-medium text-muted-foreground">
                    Question {currentQIndex + 1} of {questions.length}
                  </span>
                </div>

                <Card className="border-primary/20 shadow-md">
                  <CardContent className="p-6 space-y-6">
                    <div className="flex items-start gap-3">
                      <BrainCircuit className="h-6 w-6 text-primary mt-1" />
                      <h3 className="text-lg font-medium leading-relaxed">
                        {questions[currentQIndex]}
                      </h3>
                    </div>

                    <div className="space-y-3">
                      <div className="relative">
                        <Textarea 
                          placeholder="Type your answer here, or click the microphone to speak..."
                          className="min-h-[200px] text-base resize-y pb-8"
                          value={currentAnswer}
                          onChange={e => setCurrentAnswer(e.target.value)}
                          disabled={evaluating || isListening || transcribing}
                        />
                        {isListening && (
                          <div className="absolute bottom-3 left-3 text-sm text-muted-foreground italic flex items-center gap-2">
                            <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>
                            Recording audio...
                          </div>
                        )}
                        {transcribing && (
                          <div className="absolute bottom-3 left-3 text-sm text-primary flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Transcribing...
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <Button variant={isListening ? "destructive" : "outline"} onClick={toggleListening} disabled={evaluating || transcribing} className="gap-2">
                          {isListening ? <><MicOff className="h-4 w-4" /> Stop</> : <><Mic className="h-4 w-4" /> Speak</>}
                        </Button>

                        <Button onClick={submitAnswer} disabled={!currentAnswer.trim() || evaluating || isListening || transcribing} className="gap-2">
                          {evaluating ? <><Loader2 className="h-4 w-4 animate-spin" /> Evaluating</> : <>Submit <ChevronRight className="h-4 w-4" /></>}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {quizState === 'summary' && (
              <div className="space-y-6">
                <Card className="bg-green-500/10 border-green-500/30">
                  <CardContent className="p-6 text-center space-y-2">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <h2 className="text-2xl font-bold text-green-400">Quiz Complete!</h2>
                  </CardContent>
                </Card>
                
                {evaluations.map((ev, i) => (
                  <Card key={i} className="border-border/50">
                    <CardHeader className="pb-3 border-b border-border/30 bg-muted/20">
                      <div className="flex justify-between items-start gap-4">
                        <CardTitle className="text-base leading-snug">{ev.question}</CardTitle>
                        <Badge className={(ev.score || 0) >= 8 ? "bg-green-500/20 text-green-400" : (ev.score || 0) >= 5 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}>
                          {ev.score}/10
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      <div>
                        <span className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Your Answer</span>
                        <p className="text-sm italic text-muted-foreground bg-muted/30 p-3 rounded-lg">"{ev.answer}"</p>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-primary uppercase mb-1 block">Feedback</span>
                        <p className="text-sm">{ev.feedback}</p>
                      </div>
                      {ev.missing_points && ev.missing_points.length > 0 && (
                        <div>
                          <span className="text-xs font-bold text-orange-400 uppercase mb-1 block">Missing Points</span>
                          <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
                            {ev.missing_points.map((pt: string, idx: number) => <li key={idx}>{pt}</li>)}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            {loadingHistory ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No quiz history found.</div>
            ) : (
              history.map(item => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="space-x-2">
                        <Badge variant="secondary">{item.subject}</Badge>
                        <span className="text-sm font-medium text-muted-foreground">{item.topic}</span>
                      </div>
                      <span className="text-sm font-bold">Score: {item.score}/10</span>
                    </div>
                    <p className="text-sm font-medium mb-1">{item.question}</p>
                    <p className="text-xs text-muted-foreground mb-2">"{item.answer}"</p>
                    <p className="text-sm text-primary">{item.feedback}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

    </div>
  )
}
