'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar, Target, AlertTriangle, CheckCircle,
  Clock, ChevronRight, Sparkles, ArrowLeft,
  ExternalLink, Code2, Mic, ArrowRight, FolderGit2
} from 'lucide-react'

interface Resource {
  title: string
  type: string   // video | practice | article | course | docs
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

interface WeekPlan {
  week: number
  focus_area: string
  daily_tasks: DayTask[]
  milestone: string
  estimated_daily_hours: number
}

interface CareerPlan {
  executive_summary: string
  plan_30_day: WeekPlan[]
  plan_60_day: WeekPlan[]
  plan_90_day: WeekPlan[]
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

const CATEGORY_COLORS: Record<string, string> = {
  dsa: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  fundamentals: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  projects: 'bg-green-500/10 text-green-400 border-green-500/20',
  interview: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  resume: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-red-400',
  medium: 'text-yellow-400',
  low: 'text-green-400',
}

const PLATFORM_STYLES: Record<string, { color: string; emoji: string }> = {
  YouTube:        { color: 'text-red-400 hover:text-red-300 border-red-500/20 bg-red-500/5', emoji: '🎬' },
  LeetCode:       { color: 'text-yellow-400 hover:text-yellow-300 border-yellow-500/20 bg-yellow-500/5', emoji: '💻' },
  GeeksforGeeks:  { color: 'text-green-400 hover:text-green-300 border-green-500/20 bg-green-500/5', emoji: '📄' },
  HackerRank:     { color: 'text-emerald-400 hover:text-emerald-300 border-emerald-500/20 bg-emerald-500/5', emoji: '💻' },
  Codeforces:     { color: 'text-blue-400 hover:text-blue-300 border-blue-500/20 bg-blue-500/5', emoji: '🏆' },
  InterviewBit:   { color: 'text-cyan-400 hover:text-cyan-300 border-cyan-500/20 bg-cyan-500/5', emoji: '🎯' },
}

const DEFAULT_PLATFORM_STYLE = { color: 'text-blue-400 hover:text-blue-300 border-blue-500/20 bg-blue-500/5', emoji: '📘' }

function ResourceLink({ resource }: { resource: Resource }) {
  const style = PLATFORM_STYLES[resource.platform] || DEFAULT_PLATFORM_STYLE
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${style.color}`}
    >
      <span>{style.emoji}</span>
      <span className="max-w-[160px] truncate">{resource.title}</span>
      <ExternalLink className="h-2.5 w-2.5 flex-shrink-0 opacity-50" />
    </a>
  )
}

function WeekCard({ week }: { week: WeekPlan }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="border border-border">
      <CardHeader
        className="cursor-pointer select-none pb-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
              {week.week}
            </div>
            <div>
              <p className="font-medium text-sm">{week.focus_area}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> {week.estimated_daily_hours}h/day
              </p>
            </div>
          </div>
          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Tasks */}
          <div className="space-y-3">
            {week.daily_tasks.map((task, i) => (
              <div key={i} className="space-y-2 p-3 rounded-lg bg-accent/30 border border-border/50">
                {/* Task header */}
                <div className="flex items-start gap-2 text-sm">
                  <span className={`text-xs mt-0.5 font-medium ${PRIORITY_COLORS[task.priority] || 'text-muted-foreground'}`}>
                    ●
                  </span>
                  <span className="flex-1 text-muted-foreground">{task.task}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${CATEGORY_COLORS[task.category] || 'bg-muted text-muted-foreground border-border'}`}>
                    {task.category}
                  </span>
                </div>

                {/* Topics */}
                {task.topics && task.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 ml-4">
                    {task.topics.map((topic, j) => (
                      <span
                        key={j}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                )}

                {/* Resources */}
                {task.resources && task.resources.length > 0 && (
                  <div className="flex flex-wrap gap-2 ml-4">
                    {task.resources.map((resource, k) => (
                      <ResourceLink key={k} resource={resource} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Milestone */}
          <div className="flex items-start gap-2 pt-2 border-t border-border">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="text-green-400 font-medium">Milestone: </span>
              {week.milestone}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export default function CareerPlanPage() {
  const router = useRouter()
  const [result, setResult] = useState<CopilotResult | null>(null)
  const [role, setRole] = useState('')
  const [goal, setGoal] = useState('')

  useEffect(() => {
    const stored = sessionStorage.getItem('copilot_result')
    const storedRole = sessionStorage.getItem('copilot_role')
    const storedGoal = sessionStorage.getItem('copilot_goal')

    if (!stored) {
      router.push('/copilot')
      return
    }

    setResult(JSON.parse(stored))
    setRole(storedRole || '')
    setGoal(storedGoal || '')
  }, [router])

  if (!result) return null

  const plan = result.career_plan
  const readiness = result.readiness_score
  const ats = result.resume_analysis?.ats_score || 0
  const skillReadiness = result.skill_gap?.readiness_percentage || 0

  return (
    <div className="min-h-screen bg-background p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/copilot')}
          className="mb-4 -ml-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Copilot
        </Button>

        <div className="flex items-center gap-3 mb-1">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Your Placement Plan</h1>
        </div>
        <p className="text-muted-foreground text-sm">{goal}</p>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-3xl font-bold text-primary">{readiness}%</p>
            <p className="text-xs text-muted-foreground mt-1">Overall Readiness</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-3xl font-bold text-yellow-400">{ats}/100</p>
            <p className="text-xs text-muted-foreground mt-1">ATS Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-3xl font-bold text-blue-400">{skillReadiness}%</p>
            <p className="text-xs text-muted-foreground mt-1">Skill Match</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary + Priorities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" /> Plan Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{plan?.executive_summary}</p>

            {/* Daily schedule */}
            {plan?.daily_schedule && (
              <div className="mt-4 space-y-2">
                {Object.entries(plan.daily_schedule).map(([time, activity]) => (
                  <div key={time} className="flex gap-3 text-sm">
                    <span className="capitalize font-medium text-primary w-16 flex-shrink-0">{time}</span>
                    <span className="text-muted-foreground">{activity}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Key priorities */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" /> Key Priorities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {plan?.key_priorities?.map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-0.5">→</span> {p}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Risk areas */}
          {plan?.risk_areas?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" /> Watch Out
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {plan.risk_areas.map((r, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{r}</p>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 30/60/90 day tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" /> Week-by-Week Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="30">
            <TabsList className="mb-4">
              <TabsTrigger value="30">30 Days</TabsTrigger>
              <TabsTrigger value="60">60 Days</TabsTrigger>
              <TabsTrigger value="90">90 Days</TabsTrigger>
            </TabsList>

            <TabsContent value="30" className="space-y-3">
              {plan?.plan_30_day?.map(week => (
                <WeekCard key={week.week} week={week} />
              ))}
            </TabsContent>

            <TabsContent value="60" className="space-y-3">
              {plan?.plan_60_day?.map(week => (
                <WeekCard key={week.week} week={week} />
              ))}
            </TabsContent>

            <TabsContent value="90" className="space-y-3">
              {plan?.plan_90_day?.map(week => (
                <WeekCard key={week.week} week={week} />
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Missing skills from skill gap */}
      {(result.skill_gap?.missing_required?.length ?? 0) > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm">Skills to Build</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {result.skill_gap?.missing_required?.map((skill, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── What's Next? CTA Section ─────────────────────────── */}
      <div className="mt-8 mb-4">
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <ArrowRight className="h-5 w-5 text-primary" />
          What&apos;s Next?
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Your plan is ready — now take action.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* DSA Mentor */}
          <Card
            className="group cursor-pointer border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all duration-200"
            onClick={() => router.push('/dsa')}
          >
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Code2 className="h-5 w-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm group-hover:text-blue-400 transition-colors">
                    DSA Mentor
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start practicing your priority DSA topics with a personalised daily plan
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all mt-1" />
              </div>
            </CardContent>
          </Card>

          {/* Build Projects */}
          <Card
            className="group cursor-pointer border-green-500/20 hover:border-green-500/40 hover:bg-green-500/5 transition-all duration-200"
            onClick={() => router.push('/projects')}
          >
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <FolderGit2 className="h-5 w-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm group-hover:text-green-400 transition-colors">
                    Build Projects
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recommended portfolio projects tailored to your skill gaps
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-green-400 group-hover:translate-x-0.5 transition-all mt-1" />
              </div>
            </CardContent>
          </Card>

          {/* Mock Interview */}
          <Card
            className="group cursor-pointer border-orange-500/20 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all duration-200"
            onClick={() => router.push('/interview')}
          >
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Mic className="h-5 w-5 text-orange-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm group-hover:text-orange-400 transition-colors">
                    Mock Interview
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Test yourself with AI-powered mock interviews tailored to your role
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all mt-1" />
              </div>
            </CardContent>
          </Card>

          {/* Back to Copilot */}
          <Card
            className="group cursor-pointer border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
            onClick={() => router.push('/copilot')}
          >
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm group-hover:text-primary transition-colors">
                    Re-run Copilot
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Change your goal or target role and generate a new plan
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-1" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  )
}