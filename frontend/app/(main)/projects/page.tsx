'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { getProjects, updateProjectStatus, refreshProjects } from '@/lib/api'
import { PageTransition } from '@/components/shared/PageTransition'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderGit2, Loader2, RefreshCw, CheckCircle, AlertTriangle,
  ChevronDown, ChevronUp, Clock, Zap, Rocket, Play, PartyPopper,
  Sparkles, ArrowRight, BookOpen
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string
  title: string
  description: string
  tech_stack: string[]
  step_by_step: string[]
  skills_addressed: string[]
  difficulty: string
  estimated_hours: number
  why_this_project: string
  status: string
  created_at?: string
}

// ── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  beginner: {
    label: 'Beginner',
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    icon: <Zap className="h-3 w-3" />,
  },
  intermediate: {
    label: 'Intermediate',
    color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    icon: <Rocket className="h-3 w-3" />,
  },
  advanced: {
    label: 'Advanced',
    color: 'text-red-400 border-red-500/30 bg-red-500/10',
    icon: <Sparkles className="h-3 w-3" />,
  },
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  suggested: { label: 'Suggested', color: 'bg-white/5 text-zinc-400 border border-white/10' },
  in_progress: { label: 'In Progress', color: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.2)]' },
  completed: { label: 'Completed', color: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]' },
}

// ── ProjectCard ──────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  index,
  onStatusChange,
}: {
  project: Project
  index: number
  onStatusChange: (index: number, status: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const diff = DIFFICULTY_CONFIG[project.difficulty] || DIFFICULTY_CONFIG.intermediate
  const statusConf = STATUS_CONFIG[project.status] || STATUS_CONFIG.suggested

  const nextStatus = project.status === 'suggested' ? 'in_progress'
    : project.status === 'in_progress' ? 'completed'
    : null

  const actionLabel = project.status === 'suggested' ? 'Start Project'
    : project.status === 'in_progress' ? 'Mark Complete'
    : null

  const ActionIcon = project.status === 'suggested' ? Play
    : project.status === 'in_progress' ? CheckCircle
    : null

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`glass-card p-6 flex flex-col transition-all duration-300 relative overflow-hidden group ${
        project.status === 'completed' ? 'border-emerald-500/20 bg-emerald-500/5' : 
        project.status === 'in_progress' ? 'border-indigo-500/30 bg-[#0a0a0a]/90 shadow-[0_0_30px_rgba(99,102,241,0.1)]' : 
        'border-white/5 bg-[#0a0a0a]/80 hover:border-white/20 hover:bg-white/5'
      }`}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full pointer-events-none transition-all duration-500 ${
        project.status === 'completed' ? 'bg-emerald-500/10' : 
        project.status === 'in_progress' ? 'bg-indigo-500/20' : 
        'bg-white/5 group-hover:bg-white/10'
      }`}></div>

      <div className="flex items-start justify-between gap-3 mb-4 relative z-10">
        <h3 className="text-[16px] font-bold text-white leading-tight">{project.title}</h3>
        <span className={`text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 ${statusConf.color}`}>
          {statusConf.label}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-5 relative z-10">
        <span className={`text-[10px] px-2.5 py-1 rounded-full border flex items-center gap-1.5 uppercase tracking-wider font-semibold ${diff.color}`}>
          {diff.icon}
          {diff.label}
        </span>
        <span className="text-[11px] text-zinc-500 font-medium flex items-center gap-1.5 uppercase tracking-wider">
          <Clock className="h-3.5 w-3.5" />
          ~{project.estimated_hours}h
        </span>
      </div>

      <div className="flex-1 flex flex-col space-y-5 relative z-10">
        <p className="text-[13px] text-zinc-400 leading-relaxed">
          {project.description}
        </p>

        <div className="space-y-2">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tech Stack</p>
          <div className="flex flex-wrap gap-2">
            {project.tech_stack?.map((tech, i) => (
              <span key={i} className="text-[11px] px-2.5 py-1 rounded-md bg-white/5 text-zinc-300 border border-white/10 shadow-sm">
                {tech}
              </span>
            ))}
          </div>
        </div>

        {project.skills_addressed?.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Skills You'll Build</p>
            <div className="flex flex-wrap gap-2">
              {project.skills_addressed.map((skill, i) => (
                <span key={i} className="text-[11px] px-2.5 py-1 rounded-md text-indigo-300 border border-indigo-500/30 bg-indigo-500/10 shadow-sm">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
          <p className="text-[12px] text-amber-200/80 leading-relaxed flex gap-2">
            <span className="text-amber-400">💡</span> {project.why_this_project}
          </p>
        </div>

        {project.step_by_step?.length > 0 && (
          <div className="space-y-3 pt-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 text-[12px] font-medium text-white/70 hover:text-white transition-colors"
            >
              {expanded ? <ChevronUp className="h-4 w-4 text-indigo-400" /> : <ChevronDown className="h-4 w-4 text-indigo-400" />}
              {expanded ? 'Hide Guide' : 'Show Step-by-Step Guide'} <span className="text-zinc-500">({project.step_by_step.length} steps)</span>
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 pl-2 overflow-hidden"
                >
                  {project.step_by_step.map((step, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[11px] font-bold flex items-center justify-center mt-0.5 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                        {i + 1}
                      </span>
                      <span className="text-[13px] text-zinc-300 leading-relaxed">{step}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="flex-1" />

        {nextStatus && ActionIcon && (
          <button
            onClick={() => onStatusChange(index, nextStatus)}
            className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-[13px] transition-all transform active:scale-95 ${
              project.status === 'suggested'
                ? 'bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] hover:bg-indigo-400'
                : 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:bg-emerald-400'
            }`}
          >
            <ActionIcon className="h-4 w-4" />
            {actionLabel}
          </button>
        )}

        {project.status === 'completed' && (
          <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[13px] font-bold shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <CheckCircle className="h-4 w-4" />
            Project Completed
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const supabase = createClient()

  const [userId, setUserId] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'warning' | 'celebration'; message: string } | null>(null)

  function showToast(type: 'success' | 'warning' | 'celebration', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      try {
        const data = await getProjects(user.id)
        setProjects(data)
      } catch (e) {
        console.error('Failed to load projects:', e)
      }
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleStatusChange(index: number, newStatus: string) {
    const project = projects[index]
    if (!project) return

    setProjects(prev =>
      prev.map((p, i) => i === index ? { ...p, status: newStatus } : p)
    )

    if (project.id) {
      try {
        await updateProjectStatus(project.id, userId, newStatus)
      } catch (e) {
        console.error('API status update failed', e)
      }
    }

    if (newStatus === 'in_progress') {
      showToast('success', 'Project started! Good luck 🚀')
    } else if (newStatus === 'completed') {
      const allCompleted = projects.every((p, i) =>
        i === index ? true : p.status === 'completed'
      )
      if (allCompleted) {
        showToast('celebration', 'All projects completed! Your portfolio is looking amazing! 🎉')
      } else {
        showToast('celebration', 'Project completed! One step closer to being placement-ready 🏆')
      }
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const result = await refreshProjects(userId)
      if (result.projects) {
        setProjects(result.projects)
        showToast('success', 'Fresh project recommendations generated!')
      }
    } catch (e) {
      console.error(e)
      showToast('warning', 'Failed to refresh projects')
    } finally {
      setRefreshing(false)
    }
  }

  const totalProjects = projects.length
  const inProgress = projects.filter(p => p.status === 'in_progress').length
  const completed = projects.filter(p => p.status === 'completed').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-fuchsia-500" />
      </div>
    )
  }

  return (
    <PageTransition className="w-full max-w-7xl mx-auto mt-6 flex flex-col gap-8 pb-16 px-4">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.2)]">
              <FolderGit2 className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Portfolio Projects</h1>
          </div>
          <p className="text-zinc-400 text-sm mt-3 max-w-xl">
            AI-recommended projects tailored specifically to bridge your skill gaps and stand out to recruiters.
          </p>
        </div>
        {totalProjects > 0 && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium text-zinc-300"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Generating...' : 'Refresh Projects'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`flex items-center gap-2 p-4 rounded-xl border text-sm font-medium shadow-lg z-50 w-fit ${
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

      {totalProjects === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-16 border border-white/5 bg-[#0a0a0a]/50 flex flex-col items-center justify-center text-center opacity-70"
        >
          <div className="p-5 rounded-full bg-white/5 border border-white/10 mb-6 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
            <BookOpen className="h-12 w-12 text-zinc-600" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Recommendations Yet</h3>
          <p className="text-[13px] text-zinc-400 max-w-md mb-8">
            Run the Copilot first. It will analyze your resume against your target role to generate highly personalized portfolio projects.
          </p>
          <button
            onClick={() => window.location.href = '/copilot'}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-fuchsia-500 text-white font-bold shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:shadow-[0_0_30px_rgba(217,70,239,0.5)] transition-all"
          >
            Initialize Copilot <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 border border-white/5 bg-[#0a0a0a]/80 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-32 h-32 bg-fuchsia-500/10 blur-[50px] rounded-full pointer-events-none"></div>
              <p className="text-5xl font-bold text-white tracking-tighter mb-2 relative z-10">{totalProjects}</p>
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest relative z-10">Total Projects</p>
            </div>
            <div className="glass-card p-6 border border-indigo-500/20 bg-[#0a0a0a]/80 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full pointer-events-none"></div>
              <p className="text-5xl font-bold text-indigo-400 tracking-tighter mb-2 relative z-10">{inProgress}</p>
              <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest relative z-10">In Progress</p>
            </div>
            <div className="glass-card p-6 border border-emerald-500/20 bg-[#0a0a0a]/80 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full pointer-events-none"></div>
              <p className="text-5xl font-bold text-emerald-400 tracking-tighter mb-2 relative z-10">{completed}</p>
              <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest relative z-10">Completed</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {projects.map((project, idx) => (
              <ProjectCard
                key={project.id || idx}
                project={project}
                index={idx}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </>
      )}
    </PageTransition>
  )
}
