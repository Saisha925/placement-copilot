'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { runCopilot } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, Sparkles, Target, Brain, FileText } from 'lucide-react'

const TARGET_ROLES = [
  'Backend Engineer',
  'Software Engineer',
  'Frontend Engineer',
  'Data Analyst',
  'ML Engineer',
  'AI Engineer',
]

const EXAMPLE_GOALS = [
  'Help me become interview-ready for Backend Engineer in 2 months',
  'I have campus placements in 6 weeks, help me prepare',
  'Analyse my resume and create a study plan for Software Engineer roles',
  'I want to target Amazon SDE — what should I focus on?',
]

export default function CopilotPage() {
  const router = useRouter()
  const supabase = createClient()

  const [goal, setGoal] = useState('')
  const [targetRole, setTargetRole] = useState('Backend Engineer')
  const [targetCompany, setTargetCompany] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [resumeText, setResumeText] = useState('')
  const [loading, setLoading] = useState(false)
  const [agentLog, setAgentLog] = useState<string[]>([])
  const [error, setError] = useState('')

  async function handleRun() {
    if (!goal.trim()) {
      setError('Please enter your goal first.')
      return
    }

    setError('')
    setLoading(true)
    setAgentLog(['Starting Placement Copilot...'])

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Simulate agent activity log while waiting
      const logSteps = [
        'Supervisor Agent analysing your goal...',
        'Resume Agent evaluating your profile...',
        'Skill Gap Agent identifying missing skills...',
        'Career Planner generating your 30/60/90 day plan...',
        'Finalising recommendations...',
      ]
      let stepIndex = 0
      const logInterval = setInterval(() => {
        if (stepIndex < logSteps.length) {
          setAgentLog(prev => [...prev, logSteps[stepIndex]])
          stepIndex++
        }
      }, 2500)

      const result = await runCopilot(
        user.id,
        goal,
        targetRole,
        resumeText || undefined,
        targetCompany || undefined,
        targetDate || undefined,
      )

      clearInterval(logInterval)
      setAgentLog(prev => [...prev, '✅ All agents complete!'])

      // Store result in sessionStorage so career-plan page can read it
      sessionStorage.setItem('copilot_result', JSON.stringify(result))
      sessionStorage.setItem('copilot_role', targetRole)
      sessionStorage.setItem('copilot_goal', goal)

      // Small delay so user sees the completion message
      setTimeout(() => router.push('/career-plan'), 800)

    } catch (err) {
      setError('Something went wrong. Please try again.')
      setAgentLog([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Placement Copilot</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Tell me your placement goal — I'll run all the agents and build your personalised plan.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left — Input */}
        <div className="space-y-5">

          {/* Goal input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4" /> Your Goal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. Help me become interview-ready for Backend Engineer in 2 months"
                value={goal}
                onChange={e => setGoal(e.target.value)}
                disabled={loading}
              />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Try an example:</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_GOALS.map(eg => (
                    <button
                      key={eg}
                      onClick={() => setGoal(eg)}
                      className="text-xs px-2 py-1 rounded-full border border-border hover:bg-accent transition-colors text-left"
                      disabled={loading}
                    >
                      {eg.length > 45 ? eg.slice(0, 45) + '…' : eg}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Role + Company + Date */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="h-4 w-4" /> Target Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Target Role</Label>
                <div className="flex flex-wrap gap-2">
                  {TARGET_ROLES.map(role => (
                    <button
                      key={role}
                      onClick={() => setTargetRole(role)}
                      disabled={loading}
                      className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                        targetRole === role
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:bg-accent'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="company">Target Company (optional)</Label>
                  <Input
                    id="company"
                    placeholder="e.g. Amazon"
                    value={targetCompany}
                    onChange={e => setTargetCompany(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="date">Placement Date (optional)</Label>
                  <Input
                    id="date"
                    type="date"
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resume text (optional) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" /> Resume Text
                <Badge variant="destructive" className="text-xs font-normal">required</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Paste your resume text here for personalised analysis. Leave blank to use your last uploaded resume."
                value={resumeText}
                onChange={e => setResumeText(e.target.value)}
                disabled={loading}
              />
            </CardContent>
          </Card>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            onClick={handleRun}
            disabled={loading || !goal.trim()}
            className="w-full h-12 text-base"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running agents...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Run Placement Copilot</>
            )}
          </Button>
        </div>

        {/* Right — Agent activity log */}
        <div>
          <Card className="h-full min-h-[400px]">
            <CardHeader>
              <CardTitle className="text-base">Agent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {agentLog.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground space-y-3">
                  <Sparkles className="h-10 w-10 opacity-20" />
                  <p className="text-sm">Agent activity will appear here once you run the Copilot.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {agentLog.map((log, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${
                        log?.startsWith('✅') ? 'bg-green-500' : 'bg-primary animate-pulse'
                      }`} />
                      <p className="text-sm text-muted-foreground">{log}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  )
}