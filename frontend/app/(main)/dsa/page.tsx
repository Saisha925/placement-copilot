'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import {
  refreshDSAPlan, getDSACalendar, syncCareerPlan, solveCalendarProblem,
  logDSAProblem, getDSAProgress, getDSAProblems, toggleRevision, updateProblemNotes
} from '@/lib/api'
import { PageTransition } from '@/components/shared/PageTransition'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

import {
  Code2, Plus, Calendar as CalendarIcon, Target, Loader2,
  CheckCircle, ExternalLink, RefreshCw, AlertTriangle, PartyPopper, ChevronLeft, ChevronRight, X, Clock, BrainCircuit, BookOpen,
  Trophy, TrendingUp, BookmarkPlus, Bookmark, Pencil, History, ChevronDown
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isSameMonth, parseISO } from 'date-fns'

const ALL_TOPICS = [
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

interface CalendarProblem {
  problem: string
  difficulty: string
  link: string
  notes_link?: string
  solved?: boolean
}

interface CalendarEntry {
  id: string
  date: string
  topic: string
  source: string
  problems: CalendarProblem[]
}

interface DSAProgress {
  total_solved: number
  easy_solved: number
  medium_solved: number
  hard_solved: number
  topic_scores: Record<string, number>
  weak_topics: string[]
  overall_score: number
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

export default function DSAPage() {
  const supabase = createClient()

  const [userId, setUserId] = useState('')
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Progress and Logged Problems
  const [progress, setProgress] = useState<DSAProgress | null>(null)
  const [problems, setProblems] = useState<LoggedProblem[]>([])
  
  // Modes & UI state
  const [mode, setMode] = useState<'custom' | 'career_plan'>('custom')
  const [rightTab, setRightTab] = useState<'calendar' | 'logs'>('calendar')
  const [showLogForm, setShowLogForm] = useState(false)
  const [logging, setLogging] = useState(false)
  
  // Custom Plan State
  const [customPrompt, setCustomPrompt] = useState('')
  const [durationDays, setDurationDays] = useState(7)
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  
  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())

  // Log Form State
  const [topic, setTopic] = useState('Arrays')
  const [problemName, setProblemName] = useState('')
  const [difficulty, setDifficulty] = useState('easy')
  const [platform, setPlatform] = useState('LeetCode')
  const [timeTaken, setTimeTaken] = useState('')

  // Notes editing
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [mistakesDraft, setMistakesDraft] = useState('')

  // Toasts
  const [toast, setToast] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null)

  // Resizable logic
  const [leftWidth, setLeftWidth] = useState(60)
  const containerRef = useRef<HTMLDivElement>(null)
  const isResizing = useRef(false)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current || !containerRef.current) return
      
      const containerRect = containerRef.current.getBoundingClientRect()
      let newWidthPercent = ((e.clientX - containerRect.left) / containerRect.width) * 100
      
      if (newWidthPercent < 30) newWidthPercent = 30
      if (newWidthPercent > 75) newWidthPercent = 75
      
      setLeftWidth(newWidthPercent)
    }

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false
        document.body.style.cursor = 'default'
        document.body.style.userSelect = 'auto'
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  function showToast(type: 'success' | 'warning' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      
      try {
        const [calData, progData, probData] = await Promise.all([
          getDSACalendar(user.id),
          getDSAProgress(user.id),
          getDSAProblems(user.id)
        ])
        setEntries(calData)
        setProgress(progData)
        setProblems(probData)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  async function fetchCalendar(uid: string = userId) {
    if (!uid) return
    try {
      const data = await getDSACalendar(uid)
      setEntries(data)
    } catch (e) {
      console.error(e)
      showToast('error', 'Failed to load calendar')
    }
  }

  async function handleRefreshPlan() {
    setRefreshing(true)
    try {
      if (mode === 'custom') {
        if (durationDays < 1 || durationDays > 90) {
          showToast('warning', 'Duration must be between 1 and 90 days')
          setRefreshing(false)
          return
        }
        await refreshDSAPlan(
          userId, 
          customPrompt || undefined,
          'custom',
          durationDays,
          selectedTopics.length > 0 ? selectedTopics : undefined
        )
        await fetchCalendar()
        showToast('success', 'Custom calendar generated!')
      } else {
        await syncCareerPlan(userId)
        await fetchCalendar()
        showToast('success', 'Synced calendar with career plan!')
      }
    } catch (e) {
      console.error(e)
      showToast('error', 'Failed to generate plan')
    } finally {
      setRefreshing(false)
    }
  }

  async function handleToggleProblem(entryId: string, problemName: string, currentlySolved: boolean) {
    try {
      const entryToUpdate = entries.find(e => e.id === entryId)
      
      setEntries(prev => prev.map(e => {
        if (e.id === entryId) {
          return {
            ...e,
            problems: e.problems.map(p => 
              p.problem === problemName ? { ...p, solved: !currentlySolved } : p
            )
          }
        }
        return e
      }))

      // The backend solve endpoint only supports marking as solved
      if (entryToUpdate && !currentlySolved) {
        await solveCalendarProblem(userId, entryToUpdate.date, problemName, entryToUpdate.source)
        
        // Refresh logs and progress immediately
        const [updatedProg, updatedProb] = await Promise.all([
          getDSAProgress(userId),
          getDSAProblems(userId)
        ])
        setProgress(updatedProg)
        setProblems(updatedProb)
        showToast('success', 'Problem marked as solved and logged!')
      }
    } catch (e) {
      console.error(e)
      showToast('error', 'Failed to update problem status')
      fetchCalendar()
    }
  }

  async function handleLogProblem() {
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
        setShowLogForm(false)
        showToast('success', 'Problem logged! Progress updated.')
        const updated = await getDSAProblems(userId)
        setProblems(updated)
      }
    } catch (e) {
      console.error(e)
      showToast('error', 'Failed to log problem')
    } finally {
      setLogging(false)
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

  // Calendar render logic
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''
  const selectedEntries = entries.filter(e => e.date === selectedDateStr && e.source === mode)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <PageTransition className="p-4 md:p-6 max-w-[1600px] mx-auto h-[calc(100vh-80px)] flex flex-col">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl animate-in slide-in-from-top-2 ${
          toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
          toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
          'bg-amber-500/10 border-amber-500/20 text-amber-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="font-medium text-[13px]">{toast.message}</span>
        </div>
      )}

      {/* HEADER / CONFIG - Compact version */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4 shrink-0 bg-black/40 border border-white/5 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <CalendarIcon className="h-5 w-5 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">DSA Hub</h1>
          
          <div className="flex bg-black/40 p-1 rounded-lg border border-white/5 ml-4">
            <button 
              onClick={() => setMode('career_plan')}
              className={`px-4 py-1.5 rounded-md text-[12px] font-bold transition-all ${mode === 'career_plan' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'}`}
            >
              Sync Career Plan
            </button>
            <button 
              onClick={() => setMode('custom')}
              className={`px-4 py-1.5 rounded-md text-[12px] font-bold transition-all ${mode === 'custom' ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'}`}
            >
              Custom Plan
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full xl:w-auto">
          {mode === 'custom' ? (
            <div className="flex items-center gap-2 flex-1 xl:flex-none">
              <Input 
                type="number" 
                value={durationDays} 
                onChange={e => setDurationDays(parseInt(e.target.value) || 0)} 
                className="bg-black/50 border-white/10 text-white w-20 h-9"
                placeholder="Days"
              />
              <Input 
                placeholder="Custom Prompt (optional)" 
                value={customPrompt} 
                onChange={e => setCustomPrompt(e.target.value)} 
                className="bg-black/50 border-white/10 text-white w-48 h-9 hidden md:block"
              />
              <button 
                onClick={handleRefreshPlan} 
                disabled={refreshing}
                className="px-4 py-1.5 h-9 bg-emerald-500 text-black font-bold rounded-lg hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Generate
              </button>
            </div>
          ) : (
            <button 
              onClick={handleRefreshPlan} 
              disabled={refreshing}
              className="px-4 py-1.5 h-9 bg-emerald-500 text-black font-bold rounded-lg hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
            >
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sync Now
            </button>
          )}
          <button 
            onClick={() => {
              setRightTab('logs')
              setShowLogForm(true)
            }}
            className="px-4 py-1.5 h-9 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Log Problem
          </button>
        </div>
      </div>

      {mode === 'custom' && (
        <div className="flex flex-wrap gap-2 mb-6 shrink-0 bg-black/40 border border-white/5 rounded-xl p-4 animate-in slide-in-from-top-2">
          <div className="w-full text-[12px] font-bold text-zinc-400 mb-1 uppercase tracking-widest">Select Topics (Optional)</div>
          {ALL_TOPICS.map(t => (
            <button
              key={t}
              onClick={() => setSelectedTopics(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
                selectedTopics.includes(t) 
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                  : 'bg-black/40 border-white/10 text-zinc-400 hover:text-white hover:border-white/30'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div 
        className="flex-1 min-h-0 flex flex-col lg:flex-row" 
        ref={containerRef}
        style={{ '--left-width': `${leftWidth}%` } as React.CSSProperties}
      >
        
        {/* LEFT PANEL: Calendar */}
        <div className="flex flex-col bg-black/20 border border-white/5 rounded-2xl overflow-hidden w-full lg:w-[calc(var(--left-width)-12px)]">
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/40">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-[12px] font-bold bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors">
                Today
              </button>
              <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="grid grid-cols-7 gap-3 h-full min-h-[500px]">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest py-2">
                  {day}
                </div>
              ))}
              
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="p-2 opacity-50" />
              ))}
              
              {daysInMonth.map(date => {
                const dateStr = format(date, 'yyyy-MM-dd')
                const dayEntries = entries.filter(e => e.date === dateStr && e.source === mode)
                const isSelected = selectedDate && isSameDay(date, selectedDate)
                const isToday = isSameDay(date, new Date())
                
                return (
                  <div 
                    key={dateStr}
                    onClick={() => {
                      setSelectedDate(date)
                      setRightTab('calendar')
                    }}
                    className={`min-h-[80px] p-2 lg:p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 
                      isToday ? 'bg-white/10 border-white/20' : 
                      'bg-black/40 border-white/5 hover:bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <span className={`text-[13px] font-bold ${isToday ? 'text-emerald-400' : isSelected ? 'text-white' : 'text-zinc-500'}`}>
                      {format(date, 'd')}
                    </span>
                    
                    <div className="flex flex-col gap-1 w-full overflow-hidden">
                      {dayEntries.slice(0, 3).map((entry, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-md border border-white/5 truncate">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${entry.source === 'career_plan' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
                          <span className="text-[9px] font-medium text-zinc-300 truncate">{entry.topic}</span>
                        </div>
                      ))}
                      {dayEntries.length > 3 && (
                        <div className="text-[9px] font-bold text-zinc-500 px-1">+{dayEntries.length - 3} more</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* DRAGGABLE DIVIDER */}
        <div 
          className="w-6 shrink-0 hidden lg:flex items-center justify-center cursor-col-resize group"
          onMouseDown={() => {
            isResizing.current = true
            document.body.style.cursor = 'col-resize'
            document.body.style.userSelect = 'none'
          }}
        >
          <div className="w-1 h-12 bg-white/10 group-hover:bg-emerald-500/50 rounded-full transition-colors" />
        </div>

        {/* RIGHT PANEL: Tasks & Logs */}
        <div className="flex-1 flex flex-col min-h-0 bg-black/20 border border-white/5 rounded-2xl overflow-hidden mt-6 lg:mt-0">
          
          <div className="flex border-b border-white/5 bg-black/40 p-2 gap-2 shrink-0">
            <button 
              onClick={() => {
                setRightTab('calendar')
                setShowLogForm(false)
              }}
              className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold transition-all flex items-center justify-center gap-2 ${rightTab === 'calendar' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
            >
              <CalendarIcon className="w-4 h-4" /> Calendar Tasks
            </button>
            <button 
              onClick={() => {
                setRightTab('logs')
                setShowLogForm(false)
              }}
              className={`flex-1 py-2.5 rounded-lg text-[13px] font-bold transition-all flex items-center justify-center gap-2 ${rightTab === 'logs' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
            >
              <History className="w-4 h-4" /> My Logs
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {/* CALENDAR TAB */}
            {rightTab === 'calendar' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-white font-bold text-lg mb-4">
                  <CalendarIcon className="w-5 h-5 text-emerald-400" />
                  {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
                </div>

                {!selectedDate ? (
                  <div className="text-zinc-500 text-[13px] text-center mt-10">Select a date on the calendar to see tasks.</div>
                ) : selectedEntries.length === 0 ? (
                  <div className="text-zinc-500 text-[13px] text-center mt-10">No tasks scheduled for this day.</div>
                ) : (
                  selectedEntries.map(entry => (
                    <div key={entry.id} className="bg-black/40 border border-white/5 rounded-xl overflow-hidden mb-4">
                      <div className="bg-white/5 px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-bold text-white tracking-wide uppercase">{entry.topic}</span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-zinc-400">
                            {entry.source === 'career_plan' ? 'Career Plan' : 'Custom Plan'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-2 space-y-1">
                        {entry.problems.map((prob, idx) => (
                          <div key={idx} className={`p-3 rounded-lg border transition-all ${
                            prob.solved ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-black/20 border-white/5 hover:bg-white/5'
                          }`}>
                            <div className="flex items-start gap-3">
                              <Checkbox 
                                checked={prob.solved}
                                onCheckedChange={() => handleToggleProblem(entry.id, prob.problem, !!prob.solved)}
                                className={`mt-1 border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 rounded-full w-5 h-5`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-[14px] font-medium ${prob.solved ? 'text-emerald-400 line-through opacity-70' : 'text-white'}`}>
                                    {prob.problem}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${DIFFICULTY_COLORS[prob.difficulty.toLowerCase()] || ''}`}>
                                    {prob.difficulty}
                                  </span>
                                  <a href={prob.link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 hover:text-white transition-colors bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                                    <ExternalLink className="w-3.5 h-3.5" /> Solve
                                  </a>
                                  {prob.notes_link && (
                                    <a href={prob.notes_link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 hover:text-white transition-colors bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                                      <BookOpen className="w-3.5 h-3.5" /> Tutorial / Notes
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* LOGS TAB */}
            {rightTab === 'logs' && (
              <div className="space-y-4">
                
                <AnimatePresence>
                  {showLogForm && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 overflow-hidden mb-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[14px] font-bold text-indigo-400 flex items-center gap-2">
                          <Plus className="w-4 h-4" /> Log New Problem
                        </h3>
                        <button onClick={() => setShowLogForm(false)} className="text-zinc-400 hover:text-white"><X className="w-4 h-4" /></button>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] text-zinc-400 uppercase tracking-widest">Problem Name</Label>
                          <Input 
                            placeholder="e.g. Two Sum" 
                            value={problemName} 
                            onChange={e => setProblemName(e.target.value)}
                            className="bg-black/50 border-white/10 text-[13px] text-white"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] text-zinc-400 uppercase tracking-widest">Topic</Label>
                            <select 
                              value={topic}
                              onChange={e => setTopic(e.target.value)}
                              className="w-full h-10 rounded-md border border-white/10 bg-black/50 px-3 py-2 text-[13px] text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              {ALL_TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] text-zinc-400 uppercase tracking-widest">Difficulty</Label>
                            <select 
                              value={difficulty}
                              onChange={e => setDifficulty(e.target.value)}
                              className="w-full h-10 rounded-md border border-white/10 bg-black/50 px-3 py-2 text-[13px] text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
                            >
                              {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] text-zinc-400 uppercase tracking-widest">Platform</Label>
                            <Input 
                              placeholder="LeetCode" 
                              value={platform} 
                              onChange={e => setPlatform(e.target.value)}
                              className="bg-black/50 border-white/10 text-[13px] text-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] text-zinc-400 uppercase tracking-widest">Time (mins) [Optional]</Label>
                            <Input 
                              type="number"
                              placeholder="30" 
                              value={timeTaken} 
                              onChange={e => setTimeTaken(e.target.value)}
                              className="bg-black/50 border-white/10 text-[13px] text-white"
                            />
                          </div>
                        </div>

                        <button 
                          onClick={handleLogProblem}
                          disabled={logging}
                          className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 text-[13px]"
                        >
                          {logging ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log Problem'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-3">
                  {problems.length === 0 ? (
                    <div className="text-zinc-500 text-[13px] text-center mt-10">You haven't logged any problems yet.</div>
                  ) : (
                    problems.map((problem) => (
                      <div 
                        key={problem.id} 
                        className={`p-4 rounded-xl border transition-all ${
                          problem.marked_for_revision 
                            ? 'border-amber-500/30 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.05)]' 
                            : 'border-white/5 bg-black/40'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="text-[14px] font-semibold text-white">{problem.problem_name}</span>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full border capitalize ${DIFFICULTY_COLORS[problem.difficulty.toLowerCase()] || ''}`}>
                                {problem.difficulty}
                              </span>
                              <span className="text-[9px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-zinc-400">
                                {problem.topic}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-3 text-[10px] text-zinc-500 uppercase tracking-widest mb-3">
                              <span>{problem.platform}</span>
                              {problem.time_taken_mins && <span>{problem.time_taken_mins} min</span>}
                              <span>{new Date(problem.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>

                            {/* Notes display */}
                            {(problem.notes || problem.mistakes) && editingNotes !== problem.id && (
                              <div className="bg-black/60 rounded-lg p-2.5 space-y-1.5 border border-white/5">
                                {problem.notes && (
                                  <p className="text-[11px] text-zinc-300 flex gap-2 leading-relaxed">
                                    <span className="text-indigo-400">📝</span> {problem.notes}
                                  </p>
                                )}
                                {problem.mistakes && (
                                  <p className="text-[11px] text-red-300 flex gap-2 leading-relaxed">
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
                                  className="mt-3 space-y-3 bg-black/80 p-3 rounded-xl border border-white/10 overflow-hidden"
                                >
                                  <div className="space-y-1.5">
                                    <Label className="text-[10px] text-zinc-400 uppercase tracking-widest">Notes & Insights</Label>
                                    <Input
                                      placeholder="What optimization did you learn?"
                                      value={notesDraft}
                                      onChange={e => setNotesDraft(e.target.value)}
                                      className="bg-black/50 border-white/10 text-[12px] text-white h-8"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-[10px] text-red-400 uppercase tracking-widest">Mistakes & Pitfalls</Label>
                                    <Input
                                      placeholder="What edge case did you miss?"
                                      value={mistakesDraft}
                                      onChange={e => setMistakesDraft(e.target.value)}
                                      className="bg-black/50 border-red-500/20 focus:border-red-500/50 text-[12px] text-white h-8"
                                    />
                                  </div>
                                  <div className="flex gap-2 pt-1">
                                    <button 
                                      onClick={() => handleSaveNotes(problem)}
                                      className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white text-[11px] font-bold rounded transition-colors"
                                    >
                                      Save Notes
                                    </button>
                                    <button 
                                      onClick={() => setEditingNotes(null)}
                                      className="px-3 py-1 bg-white/5 hover:bg-white/10 text-zinc-300 text-[11px] font-bold rounded transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <div className="flex flex-col gap-1.5 ml-3 shrink-0">
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
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
                              title="Edit notes"
                            >
                              {editingNotes === problem.id ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleToggleRevision(problem)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                problem.marked_for_revision 
                                  ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30' 
                                  : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                              }`}
                              title={problem.marked_for_revision ? 'Unmark revision' : 'Mark for revision'}
                            >
                              {problem.marked_for_revision ? <Bookmark className="w-3.5 h-3.5 fill-current" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </PageTransition>
  )
}