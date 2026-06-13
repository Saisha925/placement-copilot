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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  MessageSquare, History, Play, Loader2, CheckCircle, BrainCircuit, Mic, MicOff, ChevronRight
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
    <div className="min-h-screen bg-background p-6 max-w-6xl mx-auto flex gap-6">
      
      {/* LEFT SIDEBAR: History */}
      <div className="w-1/3 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <History className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">History</h2>
        </div>
        
        {loadingHistory ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : history.length === 0 ? (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No past interviews found. Start your first session!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {history.map(item => (
              <Card key={item.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {item.round_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm font-medium">Score: {item.overall_score}/10</span>
                    <span className="text-xs">{renderStars(item.overall_score)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT MAIN AREA */}
      <div className="w-2/3">
        {sessionState === 'setup' && (
          <Card className="border-primary/20 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Mic className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Mock Interview</CardTitle>
                  <CardDescription>Test yourself with AI-powered questions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Target Role</Label>
                <Input 
                  value={targetRole} 
                  onChange={e => setTargetRole(e.target.value)} 
                  placeholder="e.g. Software Engineer"
                />
              </div>
              
              <div className="space-y-3">
                <Label>Select Round Type</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(['HR / Behavioral', 'Technical', 'System Design'] as RoundType[]).map(type => (
                    <div 
                      key={type}
                      onClick={() => setRoundType(type)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all text-center ${
                        roundType === type 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <span className={`text-sm font-medium ${roundType === type ? 'text-primary' : 'text-muted-foreground'}`}>
                        {type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Experience Level</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(['Student / Fresher', 'Early Career', 'Mid Level', 'Senior'] as ExperienceLevel[]).map(level => (
                    <div 
                      key={level}
                      onClick={() => setExperienceLevel(level)}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all text-center ${
                        experienceLevel === level 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <span className={`text-xs font-medium ${experienceLevel === level ? 'text-primary' : 'text-muted-foreground'}`}>
                        {level}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                className="w-full h-12 text-md gap-2 mt-4" 
                onClick={startInterview}
                disabled={generatingQuestions || !targetRole}
              >
                {generatingQuestions ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Preparing Interview...</>
                ) : (
                  <><Play className="h-5 w-5" /> Start Session</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {sessionState === 'active' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">
                {roundType} Round
              </Badge>
              <span className="text-sm font-medium text-muted-foreground">
                Question {currentQIndex + 1} of {questions.length}
              </span>
            </div>

            <Card className="border-primary/20 shadow-md">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <BrainCircuit className="h-6 w-6 text-primary mt-1" />
                    <h3 className="text-lg font-medium leading-relaxed">
                      {questions[currentQIndex]}
                    </h3>
                  </div>
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
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        Recording audio...
                      </div>
                    )}
                    {transcribing && (
                      <div className="absolute bottom-3 left-3 text-sm text-primary flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Transcribing with AI...
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <Button
                      variant={isListening ? "destructive" : "outline"}
                      onClick={toggleListening}
                      disabled={evaluating || transcribing}
                      className="gap-2"
                    >
                      {isListening ? (
                        <><MicOff className="h-4 w-4" /> Stop Recording</>
                      ) : (
                        <><Mic className="h-4 w-4" /> Start Speaking</>
                      )}
                    </Button>

                    <Button 
                      onClick={submitAnswer} 
                      disabled={!currentAnswer.trim() || evaluating || isListening || transcribing}
                      className="gap-2"
                    >
                      {evaluating ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Evaluating...</>
                      ) : (
                        <>Submit Answer <ChevronRight className="h-4 w-4" /></>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {sessionState === 'summary' && (
          <div className="space-y-6">
            <Card className="bg-green-500/10 border-green-500/30">
              <CardContent className="p-6 text-center space-y-2">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <h2 className="text-2xl font-bold text-green-400">Interview Complete!</h2>
                <p className="text-muted-foreground">Great job. Review your detailed feedback below.</p>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {qaList.map((qa, i) => (
                <Card key={i} className="border-border/50">
                  <CardHeader className="pb-3 border-b border-border/30 bg-muted/20">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-muted-foreground uppercase">Question {i + 1}</span>
                        <CardTitle className="text-base leading-snug">{qa.question}</CardTitle>
                      </div>
                      <Badge className={
                        (qa.evaluation?.score || 0) >= 8 ? "bg-green-500/20 text-green-400" : 
                        (qa.evaluation?.score || 0) >= 5 ? "bg-yellow-500/20 text-yellow-400" : 
                        "bg-red-500/20 text-red-400"
                      }>
                        {qa.evaluation?.score}/10
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <span className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Your Answer</span>
                      <p className="text-sm italic text-muted-foreground bg-muted/30 p-3 rounded-lg">
                        "{qa.answer}"
                      </p>
                    </div>
                    
                    <div>
                      <span className="text-xs font-bold text-primary uppercase mb-1 block">Feedback</span>
                      <p className="text-sm leading-relaxed">{qa.evaluation?.feedback}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      {qa.evaluation?.strengths && qa.evaluation.strengths.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-xs font-bold text-green-400 uppercase">Strengths</span>
                          <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
                            {qa.evaluation.strengths.map((s, idx) => <li key={idx}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                      {qa.evaluation?.improvements && qa.evaluation.improvements.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-xs font-bold text-orange-400 uppercase">To Improve</span>
                          <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
                            {qa.evaluation.improvements.map((s, idx) => <li key={idx}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    {qa.communication && (
                      <div className="mt-4 pt-4 border-t border-border/30">
                        <span className="text-xs font-bold text-blue-400 uppercase mb-2 block">Communication Analysis</span>
                        <div className="flex gap-4 mb-2">
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">Clarity: {qa.communication.clarity_score}/10</Badge>
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20">Confidence: {qa.communication.confidence_score}/10</Badge>
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">{qa.communication.feedback}</p>
                        {qa.communication.filler_words_detected?.length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <span className="font-semibold text-orange-300">Filler words detected: </span> 
                            {qa.communication.filler_words_detected.join(", ")}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={() => setSessionState('setup')}>
                Start Another Session
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
