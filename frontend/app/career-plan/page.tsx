'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar, Target, AlertTriangle, CheckCircle,
  Clock, ChevronRight, Sparkles, ArrowLeft
} from 'lucide-react'

interface DayTask {
  task: string
  category: string
  priority: string
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
          <div className="space-y-2">
            {week.daily_tasks.map((task, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className={`text-xs mt-0.5 font-medium ${PRIORITY_COLORS[task.priority] || 'text-muted-foreground'}`}>
                  ●
                </span>
                <span className="flex-1 text-muted-foreground">{task.task}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[task.category] || 'bg-muted text-muted-foreground border-border'}`}>
                  {task.category}
                </span>
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

    </div>
  )
}