'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { getProjects, updateProjectStatus, refreshProjects } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FolderGit2, Loader2, RefreshCw, CheckCircle, AlertTriangle,
  ChevronDown, ChevronUp, Clock, Zap, Rocket, Play, PartyPopper,
  Sparkles, ArrowRight,
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
    color: 'text-green-400 border-green-500/30 bg-green-500/10',
    icon: <Zap className="h-3 w-3" />,
  },
  intermediate: {
    label: 'Intermediate',
    color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    icon: <Rocket className="h-3 w-3" />,
  },
  advanced: {
    label: 'Advanced',
    color: 'text-red-400 border-red-500/30 bg-red-500/10',
    icon: <Sparkles className="h-3 w-3" />,
  },
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  suggested: { label: 'Suggested', color: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  completed: { label: 'Completed', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
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
    <Card className={`flex flex-col transition-all duration-200 hover:border-primary/30 ${
      project.status === 'completed' ? 'opacity-75' : ''
    } ${project.status === 'in_progress' ? 'border-blue-500/30 shadow-[0_0_15px_-3px_rgba(59,130,246,0.15)]' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm leading-snug">{project.title}</CardTitle>
          <Badge variant="outline" className={`text-xs flex-shrink-0 ${statusConf.color}`}>
            {statusConf.label}
          </Badge>
        </div>

        {/* Difficulty + Hours */}
        <div className="flex items-center gap-3 mt-2">
          <Badge variant="outline" className={`text-xs flex items-center gap-1 ${diff.color}`}>
            {diff.icon}
            {diff.label}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            ~{project.estimated_hours}h
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4 pt-0">
        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          {project.description}
        </p>

        {/* Tech stack */}
        <div className="flex flex-wrap gap-1.5">
          {project.tech_stack?.map((tech, i) => (
            <span
              key={i}
              className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20"
            >
              {tech}
            </span>
          ))}
        </div>

        {/* Skills addressed */}
        {project.skills_addressed?.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Skills You&apos;ll Build
            </p>
            <div className="flex flex-wrap gap-1.5">
              {project.skills_addressed.map((skill, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-[11px] text-yellow-400 border-yellow-500/30 bg-yellow-500/5"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Why this project */}
        <div className="p-2.5 rounded-lg bg-accent/40 border border-border/50">
          <p className="text-xs text-muted-foreground italic">
            💡 {project.why_this_project}
          </p>
        </div>

        {/* Expandable step-by-step */}
        {project.step_by_step?.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? 'Hide' : 'Show'} Step-by-Step Guide ({project.step_by_step.length} steps)
            </button>

            {expanded && (
              <div className="space-y-2 pl-1">
                {project.step_by_step.map((step, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 text-xs text-muted-foreground"
                  >
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Spacer to push action button to bottom */}
        <div className="flex-1" />

        {/* Action button */}
        {nextStatus && ActionIcon && (
          <Button
            size="sm"
            onClick={() => onStatusChange(index, nextStatus)}
            className={`w-full gap-2 mt-2 ${
              project.status === 'suggested'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            <ActionIcon className="h-3.5 w-3.5" />
            {actionLabel}
          </Button>
        )}

        {project.status === 'completed' && (
          <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
            <CheckCircle className="h-3.5 w-3.5" />
            Completed
          </div>
        )}
      </CardContent>
    </Card>
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

    // Update local state optimistically
    setProjects(prev =>
      prev.map((p, i) => i === index ? { ...p, status: newStatus } : p)
    )

    // Try API update (best-effort — works even without DB IDs)
    if (project.id) {
      try {
        await updateProjectStatus(project.id, userId, newStatus)
      } catch (e) {
        console.error('API status update failed (local state still updated):', e)
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

  // ── Derived state ────────────────────────────────────────────────────────

  const totalProjects = projects.length
  const inProgress = projects.filter(p => p.status === 'in_progress').length
  const completed = projects.filter(p => p.status === 'completed').length

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <FolderGit2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Portfolio Projects</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            AI-recommended projects tailored to your skill gaps
          </p>
        </div>
        {totalProjects > 0 && (
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Generating...' : 'Refresh Projects'}
          </Button>
        )}
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

      {/* Empty state */}
      {totalProjects === 0 ? (
        <Card className="h-72 flex items-center justify-center">
          <div className="text-center text-muted-foreground space-y-3">
            <FolderGit2 className="h-12 w-12 mx-auto opacity-20" />
            <div className="space-y-1">
              <p className="text-sm font-medium">No project recommendations yet</p>
              <p className="text-xs">
                Run the Copilot first to generate personalised portfolio projects based on your skill gaps.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/copilot'}
              className="gap-2"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              Go to Copilot
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-5 text-center">
                <p className="text-3xl font-bold text-primary">{totalProjects}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Projects</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 text-center">
                <p className="text-3xl font-bold text-blue-400">{inProgress}</p>
                <p className="text-xs text-muted-foreground mt-1">In Progress</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 text-center">
                <p className="text-3xl font-bold text-green-400">{completed}</p>
                <p className="text-xs text-muted-foreground mt-1">Completed</p>
              </CardContent>
            </Card>
          </div>

          {/* Project cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
    </div>
  )
}
