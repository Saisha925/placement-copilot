'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  logDSAProblem, getDSAProgress, getDSAProblems,
  toggleRevision, updateProblemNotes, refreshDSAPlan
} from '@/lib/api'
import { PageTransition } from '@/components/shared/PageTransition'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  easy: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  medium: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
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

  const solvedNamesSet = new Set(problems.map(p => p.problem_name.toLowerCase().trim()))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  const dailyPlan = progress?.daily_plan
  const topicScores = progress?.topic_scores ?? {}

  return (
    <PageTransition className="p-6 max-w-5xl mx-auto space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Code2 className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">DSA Mentor</h1>
          </div>
          <p className="text-zinc-400 text-sm mt-3 max-w-xl">
            Track your practice, view your AI-generated daily plan, and log solved problems to improve your topic mastery over time.
          </p>
        </div>
        <div className="flex gap-3">
          {dailyPlan && (
            <button
              onClick={handleRefreshPlan}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium text-zinc-300"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Plan
            </button>
          )}
          <button 
            onClick={() => setShowForm(!showForm)} 
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors shadow-[0_0_15px_rgba(99,102,241,0.3)]"
          >
            <Plus className="h-4 w-4" /> Log Problem
          </button>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`flex items-center gap-2 p-4 rounded-xl border text-sm font-medium shadow-lg z-50 ${
              toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
              toast.type === 'celebration' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
              'bg-orange-500/10 border-orange-500/30 text-orange-400'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="h-4 w-4" />}
            {toast.type === 'celebration' && <PartyPopper className="h-4 w-4" />}
            {toast.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-6 border border-indigo-500/30 bg-[#0a0a0a]/90 shadow-[0_0_30px_rgba(99,102,241,0.1)] mb-8">
              <h3 className="text-[13px] font-semibold text-zinc-300 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" /> Log a Solved Problem
              </h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400 uppercase tracking-widest">Problem Name</Label>
                    <Input
                      placeholder="e.g. Two Sum"
                      value={problemName}
                      onChange={e => setProblemName(e.target.value)}
                      className="bg-black/50 border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400 uppercase tracking-widest">Platform</Label>
                    <Input
                      placeholder="LeetCode"
                      value={platform}
                      onChange={e => setPlatform(e.target.value)}
                      className="bg-black/50 border-white/10 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400 uppercase tracking-widest">Topic</Label>
                  <div className="flex flex-wrap gap-2">
                    {TOPICS.map(t => (
                      <button
                        key={t}
                        onClick={() => setTopic(t)}
                        className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                          topic === t
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                            : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400 uppercase tracking-widest">Difficulty</Label>
                    <div className="flex gap-2">
                      {DIFFICULTIES.map(d => (
                        <button
                          key={d}
                          onClick={() => setDifficulty(d)}
                          className={`text-[11px] px-4 py-1.5 rounded-full border capitalize transition-all ${
                            difficulty === d
                              ? DIFFICULTY_COLORS[d]
                              : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2 flex-1 max-w-[200px]">
                    <Label className="text-xs text-zinc-400 uppercase tracking-widest">Time (mins)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 25"
                      value={timeTaken}
                      onChange={e => setTimeTaken(e.target.value)}
                      className="bg-black/50 border-white/10 text-white"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={handleLog} 
                    disabled={logging || !problemName.trim()}
                    className="flex items-center justify-center gap-2 px-6 py-2 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {logging ? <><Loader2 className="h-4 w-4 animate-spin" /> Logging...</> : 'Log Problem'}
                  </button>
                  <button 
                    onClick={() => setShowForm(false)}
                    className="px-6 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-[#0a0a0a]/50 p-1.5 rounded-xl border border-white/5 w-fit">
        <button
          onClick={() => setActiveTab('plan')}
          className={`text-[13px] px-6 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'plan'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          Daily Plan
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`text-[13px] px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
            activeTab === 'history'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <History className="w-4 h-4" /> Log History ({problems.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column - Stats */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="glass-card p-6 border border-white/5 bg-[#0a0a0a]/80 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full pointer-events-none"></div>
            <div className="text-center mb-6 relative z-10">
              <p className="text-[11px] text-zinc-500 uppercase tracking-widest mb-1">Overall DSA Score</p>
              <p className="text-5xl font-bold text-white tracking-tighter">
                {progress?.overall_score ?? 0}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center relative z-10 border-t border-white/5 pt-4">
              <div>
                <p className="text-lg font-medium text-emerald-400">{progress?.easy_solved ?? 0}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Easy</p>
              </div>
              <div>
                <p className="text-lg font-medium text-amber-400">{progress?.medium_solved ?? 0}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Medium</p>
              </div>
              <div>
                <p className="text-lg font-medium text-red-400">{progress?.hard_solved ?? 0}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Hard</p>
              </div>
            </div>
          </div>

          {(progress?.weak_topics?.length ?? 0) > 0 && (
            <div className="glass-card p-6 border border-amber-500/20 bg-[#0a0a0a]/80 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[50px] rounded-full pointer-events-none"></div>
              <h3 className="text-[11px] font-semibold text-amber-500/80 uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
                <Target className="w-4 h-4" /> Focus Areas
              </h3>
              <div className="flex flex-wrap gap-2 relative z-10">
                {progress?.weak_topics?.map(t => (
                  <span key={t} className="px-3 py-1 text-[11px] text-amber-400 border border-amber-500/20 bg-amber-500/5 rounded-full">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {Object.keys(topicScores).length > 0 && (
            <div className="glass-card p-6 border border-white/5 bg-[#0a0a0a]/80">
              <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-5 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Mastery by Topic
              </h3>
              <div className="space-y-4">
                {Object.entries(topicScores)
                  .sort(([, a], [, b]) => b - a)
                  .map(([t, score]) => (
                    <div key={t} className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-medium">
                        <span className="text-zinc-400">{t}</span>
                        <span className="text-indigo-400">{score}%</span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${score}%` }}
                          transition={{ duration: 1 }}
                          className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] rounded-full"
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Plan/History */}
        <div className="lg:col-span-8">
          
          <AnimatePresence mode="wait">
            {activeTab === 'plan' && (
              <motion.div
                key="plan"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {dailyPlan ? (
                  <>
                    <div className="glass-card p-6 border border-indigo-500/20 bg-indigo-500/5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                      <div className="relative z-10 space-y-2">
                        <p className="text-[13px] font-medium text-indigo-300 leading-relaxed">
                          {dailyPlan.focus_message}
                        </p>
                        <p className="text-[12px] text-indigo-400/70 italic flex items-start gap-2">
                          <span className="text-amber-400">💡</span> {dailyPlan.tip}
                        </p>
                      </div>
                    </div>

                    <div className="glass-card p-6 border border-white/5 bg-[#0a0a0a]/80">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-[13px] font-semibold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-amber-500" /> Today's Goals
                        </h3>
                        <span className="text-[11px] font-medium px-3 py-1 bg-white/5 rounded-full text-zinc-400">
                          {completedToday.size} / {dailyPlan.today?.length || 0} completed
                        </span>
                      </div>

                      <div className="space-y-3">
                        {dailyPlan.today?.map((p, i) => {
                          const isDone = completedToday.has(p.problem)
                          return (
                            <motion.div
                              key={i}
                              whileHover={{ scale: 1.01 }}
                              className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-300 ${
                                isDone
                                  ? 'border-emerald-500/30 bg-emerald-500/5 opacity-80'
                                  : 'border-white/5 bg-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/5'
                              }`}
                            >
                              <button
                                onClick={() => handleCheckProblem(p)}
                                disabled={isDone}
                                className={`mt-0.5 shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                                  isDone
                                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                                    : 'border-zinc-600 hover:border-indigo-400 hover:bg-indigo-500/20'
                                }`}
                              >
                                {isDone && <CheckCircle className="w-4 h-4" />}
                              </button>
                              
                              <div className="flex-1 space-y-1.5">
                                <div className="flex items-center gap-3">
                                  <span className={`text-[15px] font-medium ${isDone ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                                    {p.problem}
                                  </span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${DIFFICULTY_COLORS[p.difficulty] || ''}`}>
                                    {p.difficulty}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-zinc-500 uppercase tracking-wider">
                                  <span>{p.topic}</span>
                                  <span>•</span>
                                  <span>{p.platform}</span>
                                </div>
                                <p className="text-[12px] text-zinc-400 italic pt-1">{p.why}</p>
                              </div>

                              <a
                                href={p.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </motion.div>
                          )
                        })}

                        {dailyPlan.today?.length > 0 && dailyPlan.today.every(p => completedToday.has(p.problem)) && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center justify-center gap-3 p-5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)] mt-6"
                          >
                            <PartyPopper className="w-6 h-6" />
                            <span className="font-semibold text-sm">All daily goals smashed! Amazing work! 🔥</span>
                          </motion.div>
                        )}
                      </div>
                    </div>

                    <div className="glass-card p-6 border border-white/5 bg-[#0a0a0a]/80">
                      <h3 className="text-[13px] font-semibold text-zinc-300 uppercase tracking-widest mb-6">Upcoming Plan</h3>
                      
                      <div className="grid grid-cols-7 gap-2">
                        {dailyPlan.this_week?.map((day, i) => {
                          const isExpanded = expandedDay === day.day
                          const problemCount = day.problems?.length || day.count || 0
                          return (
                            <button
                              key={i}
                              onClick={() => setExpandedDay(isExpanded ? null : day.day)}
                              className={`flex flex-col items-center p-3 rounded-xl border transition-all duration-300 ${
                                isExpanded
                                  ? 'border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                  : 'border-white/5 bg-white/5 hover:border-indigo-500/30 hover:bg-white/10'
                              }`}
                            >
                              <span className="text-[11px] font-medium text-zinc-500 mb-1">{day.day.slice(0, 3)}</span>
                              <span className="text-[16px] font-bold text-indigo-400 mb-2">{problemCount}</span>
                              <span className="text-[9px] text-zinc-400 text-center leading-tight truncate w-full">
                                {day.topic.length > 8 ? day.topic.slice(0, 8) + '..' : day.topic}
                              </span>
                              {day.problems && (
                                <ChevronDown className={`w-3 h-3 mt-2 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180 text-indigo-400' : ''}`} />
                              )}
                            </button>
                          )
                        })}
                      </div>

                      <AnimatePresence>
                        {expandedDay && (() => {
                          const day = dailyPlan.this_week?.find(d => d.day === expandedDay)
                          if (!day?.problems?.length) return null
                          return (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-4 p-5 rounded-xl border border-indigo-500/20 bg-[#0a0a0a] space-y-3 shadow-inner">
                                <p className="text-[12px] font-medium text-indigo-400 uppercase tracking-wider mb-4">
                                  {day.day} — {day.topic}
                                </p>
                                {day.problems.map((prob, j) => {
                                  const isSolved = solvedNamesSet.has(prob.problem.toLowerCase().trim())
                                  return (
                                    <div key={j} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                                      isSolved ? 'border-white/5 bg-black/50 opacity-50' : 'border-white/10 bg-white/5 hover:bg-white/10'
                                    }`}>
                                      <button
                                        onClick={() => handleCheckWeekProblem(prob, day.topic)}
                                        disabled={isSolved}
                                        className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                          isSolved ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-600 hover:border-indigo-400'
                                        }`}
                                      >
                                        {isSolved && <CheckCircle className="w-3 h-3" />}
                                      </button>
                                      <span className={`flex-1 text-[13px] font-medium ${isSolved ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                                        {prob.problem}
                                      </span>
                                      <span className={`text-[9px] px-2 py-0.5 rounded-full border capitalize ${DIFFICULTY_COLORS[prob.difficulty] || ''}`}>
                                        {prob.difficulty}
                                      </span>
                                      <a
                                        href={prob.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 transition-colors"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    </div>
                                  )
                                })}
                              </div>
                            </motion.div>
                          )
                        })()}
                      </AnimatePresence>
                    </div>
                  </>
                ) : (
                  <div className="glass-card p-12 border border-white/5 bg-[#0a0a0a]/80 flex flex-col items-center justify-center text-center">
                    <div className="p-4 rounded-full bg-white/5 border border-white/10 mb-6 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                      <Code2 className="w-10 h-10 text-zinc-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No Plan Generated</h3>
                    <p className="text-[13px] text-zinc-400 max-w-md mb-8">
                      Run the placement copilot agent to analyze your profile and generate a highly personalized DSA learning schedule.
                    </p>
                    <button
                      onClick={() => window.location.href = '/copilot'}
                      className="px-6 py-3 rounded-lg bg-indigo-500 text-white font-medium shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all"
                    >
                      Initialize Copilot
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {problems.length === 0 ? (
                  <div className="glass-card p-12 border border-white/5 bg-[#0a0a0a]/80 text-center">
                    <History className="w-12 h-12 mx-auto text-zinc-700 mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No problems logged</h3>
                    <p className="text-[13px] text-zinc-500">Solve today's goals or manually log problems to build history.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-zinc-500 mb-4">
                      <span>Total Logged: <strong className="text-white">{problems.length}</strong></span>
                      <span>Marked for Revision: <strong className="text-amber-400">{problems.filter(p => p.marked_for_revision).length}</strong></span>
                    </div>

                    {problems.map((problem, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={problem.id} 
                        className={`glass-card p-5 border transition-all ${
                          problem.marked_for_revision 
                            ? 'border-amber-500/30 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.05)]' 
                            : 'border-white/5 bg-[#0a0a0a]/80'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                              <span className="text-[15px] font-semibold text-white">{problem.problem_name}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${DIFFICULTY_COLORS[problem.difficulty] || ''}`}>
                                {problem.difficulty}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-zinc-400">
                                {problem.topic}
                              </span>
                              {problem.is_revision && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400">
                                  Revision
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-[11px] text-zinc-500 uppercase tracking-widest mb-3">
                              <span>{problem.platform}</span>
                              {problem.time_taken_mins && <span>{problem.time_taken_mins} min</span>}
                              <span>{new Date(problem.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>

                            {/* Notes display */}
                            {(problem.notes || problem.mistakes) && editingNotes !== problem.id && (
                              <div className="bg-black/40 rounded-lg p-3 space-y-2 border border-white/5">
                                {problem.notes && (
                                  <p className="text-[12px] text-zinc-300 flex gap-2 leading-relaxed">
                                    <span className="text-indigo-400">📝</span> {problem.notes}
                                  </p>
                                )}
                                {problem.mistakes && (
                                  <p className="text-[12px] text-red-300 flex gap-2 leading-relaxed">
                                    <span className="text-red-500">⚠️</span> {problem.mistakes}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Notes editor */}
                            <AnimatePresence>
                              {editingNotes === problem.id && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-3 space-y-3 bg-black/50 p-4 rounded-xl border border-white/10 overflow-hidden"
                                >
                                  <div className="space-y-1.5">
                                    <Label className="text-[10px] text-zinc-400 uppercase tracking-widest">Notes & Insights</Label>
                                    <Input
                                      placeholder="What optimization did you learn?"
                                      value={notesDraft}
                                      onChange={e => setNotesDraft(e.target.value)}
                                      className="bg-black/50 border-white/10 text-[13px] text-white"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-[10px] text-red-400 uppercase tracking-widest">Mistakes & Pitfalls</Label>
                                    <Input
                                      placeholder="What edge case did you miss?"
                                      value={mistakesDraft}
                                      onChange={e => setMistakesDraft(e.target.value)}
                                      className="bg-black/50 border-red-500/20 focus:border-red-500/50 text-[13px] text-white"
                                    />
                                  </div>
                                  <div className="flex gap-2 pt-2">
                                    <button 
                                      onClick={() => handleSaveNotes(problem)}
                                      className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-[12px] font-medium rounded-md transition-colors"
                                    >
                                      Save Notes
                                    </button>
                                    <button 
                                      onClick={() => setEditingNotes(null)}
                                      className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 text-[12px] font-medium rounded-md transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <div className="flex flex-col gap-2 ml-4 shrink-0">
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
                              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
                              title="Edit notes"
                            >
                              {editingNotes === problem.id ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleToggleRevision(problem)}
                              className={`p-2 rounded-lg transition-colors ${
                                problem.marked_for_revision 
                                  ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' 
                                  : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                              }`}
                              title={problem.marked_for_revision ? 'Unmark revision' : 'Mark for revision'}
                            >
                              {problem.marked_for_revision ? <Bookmark className="w-4 h-4 fill-current" /> : <BookmarkPlus className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  )
}