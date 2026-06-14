'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  logDSAProblem, getDSAProgress, getDSAProblems,
  toggleRevision, updateProblemNotes, refreshDSAPlan
} from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Code2, Plus, Trophy, Target, TrendingUp, Loader2,
  CheckCircle, ExternalLink, RefreshCw, BookmarkPlus,
  Bookmark, AlertTriangle, PartyPopper, ChevronDown,
  History, Pencil, X
} from 'lucide-react'

const TOPICS = [
  'Arrays', 'Strings', 'Linked Lists', 'Stacks', 'Queues',
  'Trees', 'Graphs', 'Dynamic Programming', 'Recursion',
  'Binary Search', 'Sorting', 'Hashing', 'Heaps', 'Greedy'
]

const DIFFICULTIES = ['easy', 'medium', 'hard']

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-green-400 border-green-500/30 bg-green-500/10',
  medium: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  hard: 'text-red-400 border-red-500/30 bg-red-500/10',
}

// ── Types ────────────────────────────────────────────────────────────────────

interface TodayProblem {
  topic: string
  problem: string
  difficulty: string
  platform: string
  link: string
  why: string
}

interface WeekDayProblem {
  problem: string
  difficulty: string
  link: string
}

interface WeekDay {
  day: string
  topic: string
  count?: number
  difficulty?: string
  problems?: WeekDayProblem[]
}

interface DailyPlan {
  today: TodayProblem[]
  this_week: WeekDay[]
  focus_message: string
  tip: string
}

interface DSAProgress {
  total_solved: number
  easy_solved: number
  medium_solved: number
  hard_solved: number
  topic_scores: Record<string, number>
  weak_topics: string[]
  overall_score: number
  daily_plan?: DailyPlan
}

interface LoggedProblem {
  id: string
  problem_name: string
  topic: string
  difficulty: string
  platform: string
  time_taken_mins: number | null
  notes: string | null
  mistakes: string | null
  is_revision: boolean
  marked_for_revision: boolean
  created_at: string
}

type TabView = 'plan' | 'history'

// ── Main Component ───────────────────────────────────────────────────────────

export default function DSAPage() {
  const supabase = createClient()

  const [userId, setUserId] = useState('')
  const [progress, setProgress] = useState<DSAProgress | null>(null)
  const [problems, setProblems] = useState<LoggedProblem[]>([])
  const [loading, setLoading] = useState(true)
  const [logging, setLogging] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [activeTab, setActiveTab] = useState<TabView>('plan')

  // Toasts
  const [toast, setToast] = useState<{ type: 'success' | 'warning' | 'celebration'; message: string } | null>(null)

  // Form state
  const [topic, setTopic] = useState('Arrays')
  const [problemName, setProblemName] = useState('')
  const [difficulty, setDifficulty] = useState('easy')
  const [platform, setPlatform] = useState('LeetCode')
  const [timeTaken, setTimeTaken] = useState('')

  // Interactive calendar
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  // Checkbox state for today's problems
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set())

  // Notes editing
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [mistakesDraft, setMistakesDraft] = useState('')

  function showToast(type: 'success' | 'warning' | 'celebration', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [progressData, problemsData] = await Promise.all([
        getDSAProgress(user.id),
        getDSAProblems(user.id),
      ])

      setProgress(progressData)
      setProblems(problemsData)

      // Pre-check today's problems that are already logged
      const solvedNames = new Set(problemsData.map((p: LoggedProblem) => p.problem_name.toLowerCase().trim()))
      const todayProblems = progressData?.daily_plan?.today || []
      const alreadyDone = new Set<string>()
      todayProblems.forEach((p: TodayProblem) => {
        if (solvedNames.has(p.problem.toLowerCase().trim())) {
          alreadyDone.add(p.problem)
        }
      })
      setCompletedToday(alreadyDone)

      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleLog() {
    if (!problemName.trim()) return
    setLogging(true)
    try {
      const result = await logDSAProblem(
        userId, topic, problemName, difficulty, platform,
        timeTaken ? parseInt(timeTaken) : undefined
      )
      if (result.already_maxed) {
        showToast('warning', result.detail || `"${problemName}" already logged max times`)
      } else {
        setProgress(result.progress as unknown as DSAProgress)
        setProblemName('')
        setTimeTaken('')
        setShowForm(false)
        showToast('success', 'Problem logged! Progress updated.')
        // Refresh problems list
        const updated = await getDSAProblems(userId)
        setProblems(updated)
      }
    } catch (e) {
      console.error(e)
      showToast('warning', 'Failed to log problem')
    } finally {
      setLogging(false)
    }
  }

  async function handleCheckProblem(p: TodayProblem) {
    if (completedToday.has(p.problem)) return

    try {
      const result = await logDSAProblem(
        userId, p.topic, p.problem, p.difficulty, p.platform || 'LeetCode'
      )
      if (result.already_maxed) {
        // Already logged max times — just mark as checked visually
      } else if (result.progress) {
        setProgress(result.progress as unknown as DSAProgress)
        const updated = await getDSAProblems(userId)
        setProblems(updated)
      }

      setCompletedToday(prev => new Set(prev).add(p.problem))

      // Check if all today's problems are done
      const todayProblems = progress?.daily_plan?.today || []
      const newCompleted = new Set(completedToday).add(p.problem)
      if (todayProblems.length > 0 && todayProblems.every(tp => newCompleted.has(tp.problem))) {
        showToast('celebration', "All done for today! You're on fire! 🔥")
      } else {
        showToast('success', `✓ ${p.problem} logged!`)
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function handleCheckWeekProblem(prob: WeekDayProblem, dayTopic: string) {
    try {
      const result = await logDSAProblem(
        userId, dayTopic, prob.problem, prob.difficulty, 'LeetCode'
      )
      if (result.already_maxed) {
        showToast('warning', result.detail || `"${prob.problem}" already logged max times`)
      } else {
        if (result.progress) setProgress(result.progress as unknown as DSAProgress)
        const updated = await getDSAProblems(userId)
        setProblems(updated)
        showToast('success', `✓ ${prob.problem} logged!`)
      }
      setCompletedToday(prev => new Set(prev).add(prob.problem))
    } catch (e) {
      console.error(e)
    }
  }

  async function handleRefreshPlan() {
    setRefreshing(true)
    try {
      const result = await refreshDSAPlan(userId)
      if (result.progress) {
        setProgress(result.progress as unknown as DSAProgress)
        setCompletedToday(new Set())
        showToast('success', 'Fresh plan generated!')
      }
    } catch (e) {
      console.error(e)
      showToast('warning', 'Failed to refresh plan')
    } finally {
      setRefreshing(false)
    }
  }

  async function handleToggleRevision(problem: LoggedProblem) {
    try {
      await toggleRevision(userId, problem.id, !problem.marked_for_revision)
      setProblems(prev =>
        prev.map(p => p.id === problem.id ? { ...p, marked_for_revision: !p.marked_for_revision } : p)
      )
    } catch (e) {
      console.error(e)
    }
  }

  async function handleSaveNotes(problem: LoggedProblem) {
    try {
      await updateProblemNotes(userId, problem.id, notesDraft || undefined, mistakesDraft || undefined)
      setProblems(prev =>
        prev.map(p => p.id === problem.id ? { ...p, notes: notesDraft, mistakes: mistakesDraft } : p)
      )
      setEditingNotes(null)
      showToast('success', 'Notes saved!')
    } catch (e) {
      console.error(e)
    }
  }

  // ── Derived state ────────────────────────────────────────────────────────

  const solvedNamesSet = new Set(problems.map(p => p.problem_name.toLowerCase().trim()))

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const dailyPlan = progress?.daily_plan
  const topicScores = progress?.topic_scores ?? {}

  return (
    <div className="min-h-screen bg-background p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Code2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">DSA Mentor</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Track your practice and get a personalised daily plan
          </p>
        </div>
        <div className="flex gap-2">
          {dailyPlan && (
            <Button
              variant="outline"
              onClick={handleRefreshPlan}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Plan'}
            </Button>
          )}
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="h-4 w-4" />
            Log Problem
          </Button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-2 mb-4 p-3 rounded-lg text-sm transition-all ${
          toast.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' :
          toast.type === 'celebration' ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400' :
          'bg-orange-500/10 border border-orange-500/20 text-orange-400'
        }`}>
          {toast.type === 'success' && <CheckCircle className="h-4 w-4" />}
          {toast.type === 'celebration' && <PartyPopper className="h-4 w-4" />}
          {toast.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      {/* Log problem form */}
      {showForm && (
        <Card className="mb-6 border-primary/20">
          <CardHeader>
            <CardTitle className="text-sm">Log a Solved Problem</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Problem Name</Label>
                <Input
                  placeholder="e.g. Two Sum"
                  value={problemName}
                  onChange={e => setProblemName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Platform</Label>
                <Input
                  placeholder="LeetCode"
                  value={platform}
                  onChange={e => setPlatform(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Topic</Label>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map(t => (
                  <button
                    key={t}
                    onClick={() => setTopic(t)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      topic === t
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-accent text-muted-foreground'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="space-y-1.5">
                <Label>Difficulty</Label>
                <div className="flex gap-2">
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`text-xs px-3 py-1.5 rounded-full border capitalize transition-colors ${
                        difficulty === d
                          ? DIFFICULTY_COLORS[d]
                          : 'border-border hover:bg-accent text-muted-foreground'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Time taken (mins)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 25"
                  value={timeTaken}
                  onChange={e => setTimeTaken(e.target.value)}
                  className="w-32"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleLog} disabled={logging || !problemName.trim()}>
                {logging ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Logging...
                  </>
                ) : (
                  'Log Problem'
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg bg-accent/30 w-fit">
        <button
          onClick={() => setActiveTab('plan')}
          className={`text-sm px-4 py-1.5 rounded-md transition-colors ${
            activeTab === 'plan'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          📋 Daily Plan
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`text-sm px-4 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          Problem Log ({problems.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left — Stats + Topic scores */}
        <div className="space-y-4">

          {/* Overall score */}
          <Card>
            <CardContent className="pt-5">
              <div className="text-center mb-4">
                <p className="text-4xl font-bold text-primary">
                  {progress?.overall_score ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">DSA Score</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-green-400">{progress?.easy_solved ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Easy</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-yellow-400">{progress?.medium_solved ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Medium</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-400">{progress?.hard_solved ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Hard</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weak topics */}
          {(progress?.weak_topics?.length ?? 0) > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-yellow-500" /> Focus Areas
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {progress?.weak_topics?.map(t => (
                  <Badge
                    key={t}
                    variant="outline"
                    className="text-xs text-yellow-400 border-yellow-500/30"
                  >
                    {t}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Topic progress bars */}
          {Object.keys(topicScores).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Topic Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(topicScores)
                  .sort(([, a], [, b]) => b - a)
                  .map(([t, score]) => (
                    <div key={t} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{t}</span>
                        <span className="text-primary">{score}%</span>
                      </div>
                      <Progress value={score} className="h-1.5" />
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right — Plan or History */}
        <div className="lg:col-span-2 space-y-4">

          {/* ─── PLAN TAB ─────────────────────────────────────────── */}
          {activeTab === 'plan' && (
            <>
              {dailyPlan ? (
                <>
                  {/* Focus message */}
                  <Card className="border-primary/20 bg-primary/5">
                    <CardContent className="pt-4">
                      <p className="text-sm font-medium text-primary">
                        {dailyPlan.focus_message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        💡 {dailyPlan.tip}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Today's problems with checkboxes */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-yellow-500" /> Solve Today
                        <span className="text-xs text-muted-foreground ml-auto">
                          {completedToday.size}/{dailyPlan.today?.length || 0} done
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {dailyPlan.today?.map((p, i) => {
                        const isDone = completedToday.has(p.problem)
                        return (
                          <div
                            key={i}
                            className={`flex items-start justify-between p-3 rounded-lg border transition-all ${
                              isDone
                                ? 'border-green-500/20 bg-green-500/5 opacity-75'
                                : 'border-border hover:bg-accent/50'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Checkbox */}
                              <button
                                onClick={() => handleCheckProblem(p)}
                                disabled={isDone}
                                className={`mt-0.5 flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                                  isDone
                                    ? 'border-green-500 bg-green-500 text-white'
                                    : 'border-muted-foreground/30 hover:border-primary'
                                }`}
                              >
                                {isDone && <CheckCircle className="h-3.5 w-3.5" />}
                              </button>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                                    {p.problem}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs capitalize ${DIFFICULTY_COLORS[p.difficulty] ?? ''}`}
                                  >
                                    {p.difficulty}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {p.topic} · {p.platform}
                                </p>
                                <p className="text-xs text-muted-foreground italic">{p.why}</p>
                              </div>
                            </div>
                            <a
                              href={p.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0 ml-3 p-1.5 rounded-md hover:bg-accent transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                            </a>
                          </div>
                        )
                      })}

                      {/* All done celebration */}
                      {dailyPlan.today?.length > 0 &&
                        dailyPlan.today.every(p => completedToday.has(p.problem)) && (
                          <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                            <PartyPopper className="h-5 w-5" />
                            <span className="font-medium">All done for today! You&apos;re crushing it! 🔥</span>
                          </div>
                        )}
                    </CardContent>
                  </Card>

                  {/* Interactive weekly plan */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">This Week</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-7 gap-1">
                        {dailyPlan.this_week?.map((day, i) => {
                          const isExpanded = expandedDay === day.day
                          const problemCount = day.problems?.length || day.count || 0
                          return (
                            <button
                              key={i}
                              onClick={() => setExpandedDay(isExpanded ? null : day.day)}
                              className={`text-center p-2 rounded-lg border space-y-1 transition-all cursor-pointer ${
                                isExpanded
                                  ? 'border-primary bg-primary/10'
                                  : 'border-border hover:border-primary/50 hover:bg-accent/50'
                              }`}
                            >
                              <p className="text-xs font-medium text-muted-foreground">
                                {day.day.slice(0, 3)}
                              </p>
                              <p className="text-xs text-primary font-bold">{problemCount}</p>
                              <p className="text-[10px] text-muted-foreground leading-tight">
                                {day.topic.length > 8 ? day.topic.slice(0, 8) + '…' : day.topic}
                              </p>
                              {day.problems && (
                                <ChevronDown className={`h-3 w-3 mx-auto text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              )}
                            </button>
                          )
                        })}
                      </div>

                      {/* Expanded day detail */}
                      {expandedDay && (() => {
                        const day = dailyPlan.this_week?.find(d => d.day === expandedDay)
                        if (!day?.problems?.length) return null
                        return (
                          <div className="mt-3 p-4 rounded-lg border border-primary/20 bg-accent/30 space-y-2">
                            <p className="text-sm font-medium text-primary">
                              📅 {day.day} — {day.topic}
                            </p>
                            {day.problems.map((prob, j) => {
                              const isSolved = solvedNamesSet.has(prob.problem.toLowerCase().trim())
                              return (
                                <div key={j} className={`flex items-center gap-3 p-2 rounded-md transition-all ${
                                  isSolved ? 'opacity-60' : 'hover:bg-accent/50'
                                }`}>
                                  <button
                                    onClick={() => handleCheckWeekProblem(prob, day.topic)}
                                    disabled={isSolved}
                                    className={`flex-shrink-0 h-4.5 w-4.5 rounded border-2 flex items-center justify-center transition-all ${
                                      isSolved
                                        ? 'border-green-500 bg-green-500 text-white'
                                        : 'border-muted-foreground/30 hover:border-primary'
                                    }`}
                                    style={{ width: '18px', height: '18px' }}
                                  >
                                    {isSolved && <CheckCircle className="h-3 w-3" />}
                                  </button>
                                  <span className={`text-sm flex-1 ${isSolved ? 'line-through text-muted-foreground' : ''}`}>
                                    {prob.problem}
                                  </span>
                                  <Badge variant="outline" className={`text-xs capitalize ${DIFFICULTY_COLORS[prob.difficulty] ?? ''}`}>
                                    {prob.difficulty}
                                  </Badge>
                                  <a
                                    href={prob.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 rounded hover:bg-accent transition-colors"
                                  >
                                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                  </a>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })()}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="h-64 flex items-center justify-center">
                  <div className="text-center text-muted-foreground space-y-2">
                    <Code2 className="h-10 w-10 mx-auto opacity-20" />
                    <p className="text-sm">
                      Run the Copilot first to get your personalised DSA plan.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = '/copilot'}
                    >
                      Go to Copilot
                    </Button>
                  </div>
                </Card>
              )}
            </>
          )}

          {/* ─── HISTORY TAB ──────────────────────────────────────── */}
          {activeTab === 'history' && (
            <>
              {problems.length === 0 ? (
                <Card className="h-48 flex items-center justify-center">
                  <div className="text-center text-muted-foreground space-y-1">
                    <History className="h-8 w-8 mx-auto opacity-20" />
                    <p className="text-sm">No problems logged yet.</p>
                    <p className="text-xs">Start by checking off today&apos;s problems or use the Log button.</p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-2">
                  {/* Revision filter */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-muted-foreground">
                      {problems.length} problems logged · {problems.filter(p => p.marked_for_revision).length} marked for revision
                    </span>
                  </div>

                  {problems.map(problem => (
                    <Card key={problem.id} className={`transition-all ${
                      problem.marked_for_revision ? 'border-orange-500/30 bg-orange-500/5' : ''
                    }`}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{problem.problem_name}</span>
                              <Badge variant="outline" className={`text-xs capitalize ${DIFFICULTY_COLORS[problem.difficulty] ?? ''}`}>
                                {problem.difficulty}
                              </Badge>
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                {problem.topic}
                              </Badge>
                              {problem.is_revision && (
                                <Badge variant="outline" className="text-xs text-blue-400 border-blue-500/30">
                                  Revision
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{problem.platform}</span>
                              {problem.time_taken_mins && <span>{problem.time_taken_mins}m</span>}
                              <span>{new Date(problem.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                            </div>

                            {/* Notes display */}
                            {(problem.notes || problem.mistakes) && editingNotes !== problem.id && (
                              <div className="mt-2 space-y-1">
                                {problem.notes && (
                                  <p className="text-xs text-muted-foreground">
                                    📝 {problem.notes}
                                  </p>
                                )}
                                {problem.mistakes && (
                                  <p className="text-xs text-red-400/80">
                                    ⚠️ {problem.mistakes}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Notes editor */}
                            {editingNotes === problem.id && (
                              <div className="mt-2 space-y-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">Notes</Label>
                                  <Input
                                    placeholder="What did you learn?"
                                    value={notesDraft}
                                    onChange={e => setNotesDraft(e.target.value)}
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs text-red-400">Mistakes</Label>
                                  <Input
                                    placeholder="What went wrong?"
                                    value={mistakesDraft}
                                    onChange={e => setMistakesDraft(e.target.value)}
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" className="h-7 text-xs" onClick={() => handleSaveNotes(problem)}>
                                    Save
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingNotes(null)}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 ml-3">
                            <button
                              onClick={() => {
                                if (editingNotes === problem.id) {
                                  setEditingNotes(null)
                                } else {
                                  setEditingNotes(problem.id)
                                  setNotesDraft(problem.notes || '')
                                  setMistakesDraft(problem.mistakes || '')
                                }
                              }}
                              className="p-1.5 rounded-md hover:bg-accent transition-colors"
                              title="Edit notes"
                            >
                              {editingNotes === problem.id ? (
                                <X className="h-3.5 w-3.5 text-muted-foreground" />
                              ) : (
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              )}
                            </button>
                            <button
                              onClick={() => handleToggleRevision(problem)}
                              className={`p-1.5 rounded-md hover:bg-accent transition-colors ${
                                problem.marked_for_revision ? 'text-orange-400' : 'text-muted-foreground'
                              }`}
                              title={problem.marked_for_revision ? 'Unmark revision' : 'Mark for revision'}
                            >
                              {problem.marked_for_revision ? (
                                <Bookmark className="h-3.5 w-3.5 fill-current" />
                              ) : (
                                <BookmarkPlus className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}