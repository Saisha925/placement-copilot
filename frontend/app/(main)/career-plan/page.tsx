'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageTransition } from '@/components/shared/PageTransition'
import { motion, AnimatePresence } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar, Target, AlertTriangle, CheckCircle,
  Clock, ChevronRight, Sparkles, ArrowLeft,
  ExternalLink, Code2, Mic, ArrowRight, FolderGit2,
  Sun, Moon, Flame, Zap, Timer, History, Plus
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { fetchCompletedPlanTopics, togglePlanTopic, getActiveCareerPlan, getCareerPlanHistory, activateCareerPlan } from '@/lib/api'
import { Checkbox } from '@/components/ui/checkbox'

// ── Types ────────────────────────────────────────────────────────────────────

interface Resource {
  title: string
  type: string
  url: string
  platform: string
}

interface DayTask {
  task: string
  category: string
  priority: string
  topics?: string[]
  resources?: Resource[]
}

interface DayPlan {
  day_number: number
  date: string
  day_label: string
  morning: DayTask
  evening: DayTask
  resources?: Resource[]
}

interface WeekPlan {
  week: number
  focus_area: string
  start_date?: string
  end_date?: string
  days?: DayPlan[]
  daily_tasks?: DayTask[]
  weekly_tasks?: DayTask[]
  milestone: string
  estimated_daily_hours?: number
}

interface Phase {
  phase: number
  label: string
  start_date: string
  end_date: string
  weeks: WeekPlan[]
}

interface CareerPlan {
  format?: 'days' | 'weeks' | 'weekly_summary' | 'legacy'
  days?: DayPlan[]
  weeks?: WeekPlan[]
  total_days?: number
  intensity?: string
  start_date?: string
  end_date?: string
  executive_summary: string
  phases?: Phase[]
  plan_30_day?: WeekPlan[]
  plan_60_day?: WeekPlan[]
  plan_90_day?: WeekPlan[]
  key_priorities: string[]
  risk_areas: string[]
  daily_schedule: {
    morning: string
    evening: string
    weekend: string
  }
}

interface CopilotResult {
  readiness_score: number
  career_plan: CareerPlan
  resume_analysis?: {
    ats_score: number
    missing_skills: string[]
    strengths: string[]
  }
  skill_gap?: {
    readiness_percentage: number
    missing_required: string[]
    dsa_priority_topics: string[]
  }
}

// ── Style maps ───────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  dsa: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  fundamentals: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  projects: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  interview: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  resume: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-red-400',
  medium: 'text-amber-400',
  low: 'text-emerald-400',
}

const INTENSITY_CONFIG: Record<string, { icon: typeof Flame, color: string, bg: string }> = {
  sprint: { icon: Flame, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
  focused: { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  standard: { icon: Target, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30' },
  marathon: { icon: Timer, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
}

const PLATFORM_STYLES: Record<string, { color: string; emoji: string }> = {
  YouTube:        { color: 'text-red-400 hover:text-white border-red-500/20 bg-red-500/10 hover:bg-red-500/20', emoji: '🎬' },
  LeetCode:       { color: 'text-amber-400 hover:text-white border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20', emoji: '💻' },
  GeeksforGeeks:  { color: 'text-emerald-400 hover:text-white border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20', emoji: '📄' },
  HackerRank:     { color: 'text-emerald-400 hover:text-white border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20', emoji: '💻' },
  TakeUForward:   { color: 'text-orange-400 hover:text-white border-orange-500/20 bg-orange-500/10 hover:bg-orange-500/20', emoji: '🎯' },
  NeetCode:       { color: 'text-cyan-400 hover:text-white border-cyan-500/20 bg-cyan-500/10 hover:bg-cyan-500/20', emoji: '🧠' },
}
const DEFAULT_PLATFORM_STYLE = { color: 'text-indigo-400 hover:text-white border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/20', emoji: '📘' }

// ── Sub-components ───────────────────────────────────────────────────────────

function ResourceLink({ resource }: { resource: Resource }) {
  const style = PLATFORM_STYLES[resource.platform] || DEFAULT_PLATFORM_STYLE
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-all ${style.color}`}
    >
      <span>{style.emoji}</span>
      <span className="max-w-[160px] truncate">{resource.title}</span>
      <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50" />
    </a>
  )
}

function TaskBlock({ 
  task, 
  timeLabel, 
  icon: Icon, 
  accentColor,
  dayDate,
  completedTopics = [],
  onToggleTopic
}: { 
  task: DayTask, 
  timeLabel: string, 
  icon: any, 
  accentColor: string,
  dayDate?: string,
  completedTopics?: string[],
  onToggleTopic?: (topicId: string, completed: boolean) => void
}) {
  return (
    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-3.5 w-3.5 ${accentColor}`} />
        <span className={`text-[10px] font-bold uppercase tracking-widest ${accentColor}`}>{timeLabel}</span>
        <span className={`ml-auto shrink-0 text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[task.category] || 'bg-white/5 text-zinc-400 border-white/10'}`}>
          {task.category}
        </span>
      </div>
      <p className="text-[13px] text-zinc-300 leading-relaxed font-medium">{task.task}</p>
      {task.topics && task.topics.length > 0 && (
        <div className="flex flex-col gap-2">
          {task.topics.map((topic, j) => {
            const topicId = dayDate ? `${dayDate}_${timeLabel}_${topic}` : ''
            const isCompleted = completedTopics.includes(topicId)
            return (
              <div key={j} className="flex items-center gap-2 group/topic">
                {dayDate && onToggleTopic && (
                  <Checkbox 
                    id={topicId}
                    checked={isCompleted}
                    onCheckedChange={(checked) => onToggleTopic(topicId, checked === true)}
                    className="border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:text-white w-4 h-4 rounded"
                  />
                )}
                <label 
                  htmlFor={topicId}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-md border transition-all cursor-pointer select-none
                    ${isCompleted 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 line-through opacity-70' 
                      : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                >
                  {topic}
                </label>
              </div>
            )
          })}
        </div>
      )}
      {task.resources && task.resources.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {task.resources.map((resource, k) => (
            <ResourceLink key={k} resource={resource} />
          ))}
        </div>
      )}
    </div>
  )
}

function DayCard({ 
  day, 
  index,
  completedTopics,
  onToggleTopic
}: { 
  day: DayPlan, 
  index: number,
  completedTopics: string[],
  onToggleTopic?: (topicId: string, completed: boolean) => void
}) {
  const [expanded, setExpanded] = useState(index === 0)
  const dayDate = new Date(day.date + 'T00:00:00')
  const isToday = day.date === new Date().toISOString().split('T')[0]

  return (
    <motion.div
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`rounded-xl border overflow-hidden ${isToday ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-white/5 bg-black/20'}`}
    >
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-bold ${isToday ? 'bg-indigo-500 text-white' : 'bg-white/10 text-zinc-400'}`}>
            {dayDate.getDate()}
          </div>
          <div>
            <span className="text-[13px] font-medium text-white">{day.day_label}</span>
            {isToday && <span className="ml-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Today</span>}
          </div>
        </div>
        <ChevronRight className={`h-4 w-4 text-zinc-500 transition-transform duration-200 ${expanded ? 'rotate-90 text-indigo-400' : ''}`} />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/5 bg-black/30"
          >
            <div className="p-4 space-y-3">
              {day.morning && <TaskBlock task={day.morning} timeLabel="Morning" icon={Sun} accentColor="text-amber-400" dayDate={day.date} completedTopics={completedTopics} onToggleTopic={onToggleTopic} />}
              {day.evening && <TaskBlock task={day.evening} timeLabel="Evening" icon={Moon} accentColor="text-blue-400" dayDate={day.date} completedTopics={completedTopics} onToggleTopic={onToggleTopic} />}
              {day.resources && day.resources.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {day.resources.map((resource, k) => (
                    <ResourceLink key={k} resource={resource} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function WeekCard({ 
  week, 
  index,
  completedTopics,
  onToggleTopic
}: { 
  week: WeekPlan, 
  index: number,
  completedTopics: string[],
  onToggleTopic?: (topicId: string, completed: boolean) => void
}) {
  const [expanded, setExpanded] = useState(index === 0)
  const hasDays = week.days && week.days.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass-card border border-white/10 bg-black/40 overflow-hidden"
    >
      <div
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 text-[14px] font-bold border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            W{week.week}
          </div>
          <div>
            <p className="font-bold text-[15px] text-white leading-tight mb-1">{week.focus_area}</p>
            <p className="text-[11px] font-medium text-zinc-500 flex items-center gap-1.5 uppercase tracking-widest">
              {week.estimated_daily_hours && <><Clock className="h-3.5 w-3.5" /> {week.estimated_daily_hours}h / day</>}
              {week.start_date && <span className="text-indigo-400/60 ml-2">{week.start_date}</span>}
              {hasDays && <span className="ml-2 text-indigo-400/60">• {week.days!.length} days</span>}
            </p>
          </div>
        </div>
        <ChevronRight className={`h-5 w-5 text-zinc-500 transition-transform duration-300 ${expanded ? 'rotate-90 text-indigo-400' : ''}`} />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/5 bg-black/60"
          >
            <div className="p-5 space-y-4">
              {/* Day-by-day view (new format) */}
              {hasDays && (
                <div className="space-y-2 mt-2">
                  {week.days!.map((day, i) => (
                    <DayCard key={day.date || i} day={day} index={i} completedTopics={completedTopics} onToggleTopic={onToggleTopic} />
                  ))}
                </div>
              )}

              {/* Legacy daily_tasks view (fallback) */}
              {!hasDays && week.daily_tasks && (
                <div className="space-y-3">
                  {week.daily_tasks.map((task, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 shrink-0 ${PRIORITY_COLORS[task.priority] || 'text-zinc-600'}`}>●</span>
                        <span className="flex-1 text-[13px] text-zinc-300 leading-relaxed font-medium">{task.task}</span>
                        <span className={`shrink-0 text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full border ${CATEGORY_COLORS[task.category] || 'bg-white/5 text-zinc-400 border-white/10'}`}>
                          {task.category}
                        </span>
                      </div>
                      {task.topics && task.topics.length > 0 && (
                        <div className="flex flex-wrap gap-2 ml-6">
                          {task.topics.map((topic, j) => (
                            <span key={j} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-zinc-400 border border-white/5">{topic}</span>
                          ))}
                        </div>
                      )}
                      {task.resources && task.resources.length > 0 && (
                        <div className="flex flex-wrap gap-2 ml-6 pt-1">
                          {task.resources.map((resource, k) => (
                            <ResourceLink key={k} resource={resource} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Weekly tasks view */}
              {!hasDays && week.weekly_tasks && (
                <div className="space-y-3">
                  {week.weekly_tasks.map((task, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 shrink-0 ${PRIORITY_COLORS[task.priority] || 'text-zinc-600'}`}>●</span>
                        <span className="flex-1 text-[13px] text-zinc-300 leading-relaxed font-medium">{task.task}</span>
                        <span className={`shrink-0 text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full border ${CATEGORY_COLORS[task.category] || 'bg-white/5 text-zinc-400 border-white/10'}`}>
                          {task.category}
                        </span>
                      </div>
                      {task.topics && task.topics.length > 0 && (
                        <div className="flex flex-wrap gap-2 ml-6">
                          {task.topics.map((topic, j) => (
                            <span key={j} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-zinc-400 border border-white/5">{topic}</span>
                          ))}
                        </div>
                      )}
                      {task.resources && task.resources.length > 0 && (
                        <div className="flex flex-wrap gap-2 ml-6 pt-1">
                          {task.resources.map((resource, k) => (
                            <ResourceLink key={k} resource={resource} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Milestone */}
              <div className="flex items-start gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 mt-4">
                <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                <p className="text-[13px] text-emerald-200/80 leading-relaxed">
                  <span className="text-emerald-400 font-bold uppercase tracking-widest text-[10px] block mb-1">Weekly Milestone</span>
                  {week.milestone}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function CareerPlanPage() {
  const router = useRouter()
  const [result, setResult] = useState<CopilotResult | null>(null)
  const [role, setRole] = useState('')
  const [goal, setGoal] = useState('')
  const [completedTopics, setCompletedTopics] = useState<string[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [planHistory, setPlanHistory] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [isActivating, setIsActivating] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchState = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        
        // Fetch topics
        const topics = await fetchCompletedPlanTopics(user.id)
        setCompletedTopics(topics)
        
        // Fetch active plan
        try {
          const activeRes = await getActiveCareerPlan(user.id)
          if (activeRes.plan) {
            setResult(activeRes.plan.plan_data)
            setRole(activeRes.plan.target_role)
            setGoal(activeRes.plan.goal)
          } else {
            // Fallback to sessionStorage if no active plan in DB
            const stored = sessionStorage.getItem('copilot_result')
            const storedRole = sessionStorage.getItem('copilot_role')
            const storedGoal = sessionStorage.getItem('copilot_goal')
            if (stored) {
              setResult(JSON.parse(stored))
              setRole(storedRole || '')
              setGoal(storedGoal || '')
            }
          }
          
          // Fetch history
          const historyRes = await getCareerPlanHistory(user.id)
          setPlanHistory(historyRes.history || [])
        } catch (e) {
          console.error("Failed to load plan data", e)
        }
      }
      setLoading(false)
    }
    fetchState()
  }, [supabase.auth])

  async function handleActivatePlan(planId: string) {
    if (!userId) return
    setIsActivating(true)
    try {
      await activateCareerPlan(userId, planId)
      window.location.reload()
    } catch (e) {
      console.error(e)
    } finally {
      setIsActivating(false)
    }
  }

  async function handleToggleTopic(topicId: string, completed: boolean) {
    if (!userId) return
    
    // Optimistic UI update
    setCompletedTopics(prev => 
      completed 
        ? [...prev, topicId] 
        : prev.filter(id => id !== topicId)
    )

    try {
      const response = await togglePlanTopic(userId, topicId, completed)
      // Update readiness score from backend calculation
      if (response?.readiness_score !== undefined) {
        setResult(prev => prev ? { ...prev, readiness_score: response.readiness_score } : prev)
      }
    } catch (err) {
      console.error(err)
      // Revert on error
      setCompletedTopics(prev => 
        !completed 
          ? [...prev, topicId] 
          : prev.filter(id => id !== topicId)
      )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin text-indigo-500 rounded-full border-t-2 border-b-2 border-indigo-500 h-8 w-8"></div>
      </div>
    )
  }

  if (!result) {
    return (
      <PageTransition className="w-full max-w-6xl mx-auto mt-6 flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="p-4 rounded-xl bg-indigo-500/10 text-indigo-400 mb-2">
          <Sparkles className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-white text-center">No Active Career Plan</h1>
        <p className="text-zinc-400 text-center max-w-md">You haven't generated a career plan yet, or your previous plan was not saved properly.</p>
        <button
          onClick={() => router.push('/copilot')}
          className="mt-4 px-6 py-3 rounded-lg font-bold bg-white text-black hover:bg-zinc-200 transition-colors flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          <Sparkles className="w-4 h-4" /> Generate New Plan
        </button>
      </PageTransition>
    )
  }


  const plan = result.career_plan
  const readiness = result.readiness_score
  const ats = result.resume_analysis?.ats_score || 0
  const skillReadiness = result.skill_gap?.readiness_percentage || 0

  // Detect format:
  const planFormat = plan?.format || (plan?.phases ? 'legacy_phases' : 'legacy')
  const intensity = plan?.intensity || 'standard'
  const intensityConfig = INTENSITY_CONFIG[intensity] || INTENSITY_CONFIG.standard
  const IntensityIcon = intensityConfig.icon
  const totalDays = plan?.total_days || 90
  // Detect if this is a custom timeline: either has phases format, or has total_days that isn't 90, or doesn't have legacy 30/60/90 keys
  const hasLegacyFormat = (plan?.plan_30_day && plan.plan_30_day.length > 0) || (plan?.plan_60_day && plan.plan_60_day.length > 0) || (plan?.plan_90_day && plan.plan_90_day.length > 0)
  const hasPhases = plan?.phases && plan.phases.length > 0;
  const isCustomTimeline = !hasLegacyFormat && (totalDays !== 90 || hasPhases)

  // Build dynamic title
  const intensityLabel = intensity === 'sprint' ? 'Sprint' : intensity === 'focused' ? 'Focused' : intensity === 'marathon' ? 'Marathon' : 'Standard'
  const planTitle = isCustomTimeline
    ? `Your ${totalDays}-Day ${intensityLabel} Plan`
    : hasLegacyFormat
      ? 'Your 30/60/90 Day Plan'
      : `Your ${totalDays}-Day Plan`

  return (
    <PageTransition className="w-full max-w-6xl mx-auto mt-6 flex flex-col gap-8 pb-16 px-4">

      {/* Header */}
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex items-center justify-between gap-4 w-full">
          <button
            onClick={() => router.push('/copilot')}
            className="flex items-center gap-2 text-[13px] font-medium text-zinc-500 hover:text-white transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Copilot Settings
          </button>
          
          <div className="flex items-center gap-3 relative z-50">
            {planHistory.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 bg-black/40 hover:bg-white/5 transition-colors"
                >
                  <History className="w-4 h-4" /> Plan History
                </button>
                {showHistory && (
                  <div className="absolute right-0 top-full mt-2 w-64 p-2 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl z-50">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2 pb-2 mb-2 border-b border-white/5">Previous Plans</div>
                    {planHistory.map(ph => (
                      <div key={ph.id} className="flex flex-col gap-1 p-2 hover:bg-white/5 rounded-lg transition-colors group/item">
                        <div className="flex justify-between items-start">
                          <span className="text-[12px] font-medium text-white truncate max-w-[140px]" title={ph.goal}>{ph.goal}</span>
                          <span className="text-[10px] text-zinc-500 shrink-0">{new Date(ph.created_at).toLocaleDateString()}</span>
                        </div>
                        {ph.is_active ? (
                          <span className="text-[10px] font-bold text-emerald-400 mt-1">ACTIVE</span>
                        ) : (
                          <button
                            onClick={() => handleActivatePlan(ph.id)}
                            disabled={isActivating}
                            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 mt-1 flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity disabled:opacity-50 text-left"
                          >
                            <History className="w-3 h-3" /> Reactivate Plan
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <button
              onClick={() => router.push('/copilot')}
              className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-black bg-white hover:bg-zinc-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" /> New Plan
            </button>
          </div>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <Sparkles className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                {planTitle}
              </h1>
            </div>
            <p className="text-zinc-400 text-sm mt-3 max-w-xl leading-relaxed">
              {goal} <span className="text-indigo-400 font-medium">({role})</span>
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2 flex-wrap justify-end">
            {/* Duration Badge */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10">
              <Calendar className="h-4 w-4 text-indigo-400" />
              <span className="text-[12px] font-bold uppercase tracking-widest text-indigo-400">
                {totalDays} Days
              </span>
            </div>

            {/* Intensity Badge */}
            {plan?.intensity && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${intensityConfig.bg}`}>
                <IntensityIcon className={`h-4 w-4 ${intensityConfig.color}`} />
                <span className={`text-[12px] font-bold uppercase tracking-widest ${intensityConfig.color}`}>
                  {intensity === 'sprint' ? 'Sprint 🔥' : intensity === 'focused' ? 'Focused' : intensity === 'marathon' ? 'Marathon' : 'Standard'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Date range */}
        {plan?.start_date && plan?.end_date && (
          <div className="flex items-center gap-2 text-[12px] text-zinc-500">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {new Date(plan.start_date + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' → '}
              {new Date(plan.end_date + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
              <span className="text-zinc-600 ml-1">({totalDays} days)</span>
            </span>
          </div>
        )}
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border border-white/5 bg-[#0a0a0a]/80 text-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full pointer-events-none group-hover:bg-indigo-500/20 transition-all"></div>
          <p className="text-5xl font-bold text-white tracking-tighter mb-2 relative z-10">{readiness}%</p>
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest relative z-10">Overall Readiness</p>
        </div>
        <div className="glass-card p-6 border border-amber-500/20 bg-[#0a0a0a]/80 text-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full pointer-events-none group-hover:bg-amber-500/20 transition-all"></div>
          <p className="text-5xl font-bold text-amber-400 tracking-tighter mb-2 relative z-10">{ats}<span className="text-2xl font-bold text-amber-400/50">/100</span></p>
          <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest relative z-10">ATS Resume Score</p>
        </div>
        <div className="glass-card p-6 border border-emerald-500/20 bg-[#0a0a0a]/80 text-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full pointer-events-none group-hover:bg-emerald-500/20 transition-all"></div>
          <p className="text-5xl font-bold text-emerald-400 tracking-tighter mb-2 relative z-10">{skillReadiness}%</p>
          <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest relative z-10">Skill Match</p>
        </div>
      </div>

      {/* Summary + Priorities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-8 border border-white/5 bg-[#0a0a0a]/80">
          <h3 className="text-[13px] font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2 mb-6">
            <Target className="h-5 w-5 text-indigo-400" /> Executive Summary
          </h3>
          <p className="text-[14px] leading-relaxed text-zinc-400 mb-8">{plan?.executive_summary}</p>

          {plan?.daily_schedule && (
            <div>
              <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Recommended Routine</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(plan.daily_schedule).map(([time, activity]) => (
                  <div key={time} className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest block mb-2 flex items-center gap-1.5">
                      {time === 'morning' && <Sun className="h-3 w-3" />}
                      {time === 'evening' && <Moon className="h-3 w-3" />}
                      {time === 'weekend' && <Calendar className="h-3 w-3" />}
                      {time}
                    </span>
                    <span className="text-[12px] text-zinc-300 leading-relaxed block">{activity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 border border-emerald-500/20 bg-emerald-500/5">
            <h3 className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <CheckCircle className="h-4 w-4" /> Key Priorities
            </h3>
            <div className="space-y-3">
              {plan?.key_priorities?.map((p, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-emerald-500 mt-0.5">→</span>
                  <span className="text-[13px] text-emerald-100/80 leading-relaxed">{p}</span>
                </div>
              ))}
            </div>
          </div>

          {plan?.risk_areas && plan.risk_areas.length > 0 && (
            <div className="glass-card p-6 border border-red-500/20 bg-red-500/5">
              <h3 className="text-[11px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4" /> Risk Areas
              </h3>
              <div className="space-y-3">
                {plan.risk_areas.map((r, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-red-500 mt-0.5">⚠️</span>
                    <span className="text-[13px] text-red-200/80 leading-relaxed">{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Missing skills */}
      {(result.skill_gap?.missing_required?.length ?? 0) > 0 && (
        <div className="glass-card p-6 border border-white/5 bg-[#0a0a0a]/80">
          <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Skills to Build</h3>
          <div className="flex flex-wrap gap-2">
            {result.skill_gap?.missing_required?.map((skill, i) => (
              <span key={i} className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.1)]">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ─── Action Plan ─────────────────────────────────────────── */}
      <div className="glass-card p-8 border border-white/5 bg-[#0a0a0a]/80">
        <h3 className="text-[15px] font-bold text-white flex items-center gap-2 mb-6">
          <Calendar className="h-5 w-5 text-indigo-400" /> Action Plan
        </h3>

        {planFormat === 'days' && plan?.days && (
          <div className="space-y-4">
            {plan.days.map((day, i) => (
              <DayCard key={day.date || i} day={day} index={i} completedTopics={completedTopics} onToggleTopic={handleToggleTopic} />
            ))}
          </div>
        )}

        {(planFormat === 'weeks' || planFormat === 'weekly_summary') && plan?.weeks && (
          <Tabs defaultValue="week-0">
            <TabsList className="mb-6 bg-black/50 border border-white/10 p-1 rounded-xl inline-flex flex-wrap gap-1">
              {plan.weeks.map((week, i) => (
                <TabsTrigger
                  key={i}
                  value={`week-${i}`}
                  className="rounded-lg text-[12px] font-medium data-[state=active]:bg-indigo-500 data-[state=active]:text-white whitespace-nowrap"
                >
                  Week {week.week}
                </TabsTrigger>
              ))}
            </TabsList>
            {plan.weeks.map((week, i) => (
              <TabsContent key={i} value={`week-${i}`} className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                <WeekCard week={week} index={i} completedTopics={completedTopics} onToggleTopic={handleToggleTopic} />
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Legacy phases format */}
        {planFormat === 'legacy_phases' && plan?.phases && (
          <Tabs defaultValue="phase-0">
            <TabsList className="mb-6 bg-black/50 border border-white/10 p-1 rounded-xl inline-flex flex-wrap gap-1">
              {plan.phases.map((phase, i) => (
                <TabsTrigger
                  key={i}
                  value={`phase-${i}`}
                  className="rounded-lg text-[12px] font-medium data-[state=active]:bg-indigo-500 data-[state=active]:text-white whitespace-nowrap"
                >
                  Phase {phase.phase}: {phase.label.split('(')[0].trim()}
                </TabsTrigger>
              ))}
            </TabsList>

            {plan.phases.map((phase, i) => (
              <TabsContent key={i} value={`phase-${i}`} className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                {phase.weeks.map((week, j) => (
                  <WeekCard key={j} week={week} index={j} completedTopics={completedTopics} onToggleTopic={handleToggleTopic} />
                ))}
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Legacy 30/60/90 format */}
        {planFormat === 'legacy' && (
          <Tabs defaultValue="30">
            <TabsList className="mb-6 bg-black/50 border border-white/10 p-1 rounded-xl inline-flex">
              <TabsTrigger value="30" className="rounded-lg text-[13px] font-medium data-[state=active]:bg-indigo-500 data-[state=active]:text-white">30 Days</TabsTrigger>
              <TabsTrigger value="60" className="rounded-lg text-[13px] font-medium data-[state=active]:bg-indigo-500 data-[state=active]:text-white">60 Days</TabsTrigger>
              <TabsTrigger value="90" className="rounded-lg text-[13px] font-medium data-[state=active]:bg-indigo-500 data-[state=active]:text-white">90 Days</TabsTrigger>
            </TabsList>

            <TabsContent value="30" className="space-y-4 outline-none">
              {plan?.plan_30_day?.map((week, i) => (
                <WeekCard key={week.week} week={week} index={i} completedTopics={completedTopics} onToggleTopic={handleToggleTopic} />
              ))}
            </TabsContent>
            <TabsContent value="60" className="space-y-4 outline-none">
              {plan?.plan_60_day?.map((week, i) => (
                <WeekCard key={week.week} week={week} index={i} completedTopics={completedTopics} onToggleTopic={handleToggleTopic} />
              ))}
            </TabsContent>
            <TabsContent value="90" className="space-y-4 outline-none">
              {plan?.plan_90_day?.map((week, i) => (
                <WeekCard key={week.week} week={week} index={i} completedTopics={completedTopics} onToggleTopic={handleToggleTopic} />
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* ─── What's Next? CTA Section ─────────────────────────── */}
      <div className="mt-8">
        <h2 className="text-[18px] font-bold text-white mb-2 flex items-center gap-2">
          <ArrowRight className="h-5 w-5 text-indigo-400" /> Take Action
        </h2>
        <p className="text-[13px] text-zinc-400 mb-6">
          Your plan is ready. Use these specialized tools to execute it.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className="glass-card p-5 cursor-pointer border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/40 transition-all duration-300 group"
            onClick={() => router.push('/dsa')}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <Code2 className="h-6 w-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-[14px] text-white group-hover:text-blue-400 transition-colors">DSA Mentor</p>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">Practice priority DSA topics with daily tracking.</p>
              </div>
            </div>
          </div>

          <div
            className="glass-card p-5 cursor-pointer border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all duration-300 group"
            onClick={() => router.push('/projects')}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <FolderGit2 className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-[14px] text-white group-hover:text-emerald-400 transition-colors">Build Projects</p>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">Recommended portfolio projects tailored to you.</p>
              </div>
            </div>
          </div>

          <div
            className="glass-card p-5 cursor-pointer border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 hover:border-orange-500/40 transition-all duration-300 group"
            onClick={() => router.push('/interview')}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                <Mic className="h-6 w-6 text-orange-400" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-[14px] text-white group-hover:text-orange-400 transition-colors">Mock Interview</p>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">AI-powered interviews tailored to your role.</p>
              </div>
            </div>
          </div>

          <div
            className="glass-card p-5 cursor-pointer border border-fuchsia-500/20 bg-fuchsia-500/5 hover:bg-fuchsia-500/10 hover:border-fuchsia-500/40 transition-all duration-300 group"
            onClick={() => router.push('/copilot')}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-fuchsia-500/20 shadow-[0_0_15px_rgba(217,70,239,0.2)]">
                <Sparkles className="h-6 w-6 text-fuchsia-400" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-[14px] text-white group-hover:text-fuchsia-400 transition-colors">Re-run Copilot</p>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">Change target role to generate a new plan.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </PageTransition>
  )
}