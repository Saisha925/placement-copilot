'use client'

import { useState } from 'react'
import { generateSystemDesignChallenge, evaluateSystemDesign } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Server, LayoutTemplate, Play, Loader2, CheckCircle, Database } from 'lucide-react'

interface Challenge {
  title: string
  description: string
  requirements: string[]
}

interface Evaluation {
  score: number
  feedback: string
  strengths: string[]
  improvements: string[]
}

export default function SystemDesignPage() {
  const [targetRole, setTargetRole] = useState('Backend Engineer')
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [loadingChallenge, setLoadingChallenge] = useState(false)
  
  const [solution, setSolution] = useState('')
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [evaluating, setEvaluating] = useState(false)

  async function handleGenerateChallenge() {
    if (!targetRole) return
    setLoadingChallenge(true)
    setEvaluation(null)
    setSolution('')
    try {
      const data = await generateSystemDesignChallenge(targetRole)
      setChallenge(data)
    } catch (e) {
      console.error(e)
      alert("Failed to generate challenge. Please try again.")
    } finally {
      setLoadingChallenge(false)
    }
  }

  async function handleSubmitSolution() {
    if (!solution.trim() || !challenge) return
    setEvaluating(true)
    try {
      const data = await evaluateSystemDesign(challenge, solution)
      setEvaluation(data)
    } catch (e) {
      console.error(e)
      alert("Evaluation failed.")
    } finally {
      setEvaluating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6 max-w-6xl mx-auto flex gap-6">
      
      {/* LEFT SIDE: Challenge setup and details */}
      <div className="w-1/3 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <LayoutTemplate className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">System Design</h2>
        </div>
        
        <Card className="border-primary/20 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Generate Challenge</CardTitle>
            <CardDescription>Get a role-specific architecture scenario</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Target Role</Label>
              <Input 
                value={targetRole} 
                onChange={e => setTargetRole(e.target.value)} 
                placeholder="e.g. Backend Engineer, Staff SWE"
              />
            </div>
            <Button 
              className="w-full gap-2" 
              onClick={handleGenerateChallenge}
              disabled={loadingChallenge || !targetRole}
            >
              {loadingChallenge ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {loadingChallenge ? "Generating..." : "Generate Challenge"}
            </Button>
          </CardContent>
        </Card>

        {challenge && (
          <Card className="border-border">
            <CardHeader className="bg-muted/30 pb-3 border-b border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Server className="h-4 w-4 text-primary" />
                <Badge variant="outline" className="text-primary border-primary/20 bg-primary/10">Scenario</Badge>
              </div>
              <CardTitle className="text-lg">{challenge.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {challenge.description}
                </p>
              </div>
              <div>
                <Label className="text-xs font-bold text-primary uppercase">Requirements</Label>
                <ul className="list-disc pl-4 mt-2 text-sm text-muted-foreground space-y-1">
                  {challenge.requirements.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* RIGHT SIDE: Workspace and Evaluation */}
      <div className="w-2/3 flex flex-col gap-4">
        {challenge ? (
          <>
            <Card className="flex-1 flex flex-col border-primary/20 shadow-md">
              <CardHeader className="pb-2 border-b border-border/30">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Architecture Workspace
                </CardTitle>
                <CardDescription>Write out your API endpoints, database schema, and high-level design.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 p-4 flex flex-col">
                <Textarea 
                  placeholder="1. Requirements & Capacity Estimation...&#10;2. High-Level Architecture...&#10;3. API Design...&#10;4. Database Schema...&#10;5. Bottlenecks & Trade-offs..."
                  className="flex-1 min-h-[400px] text-sm font-mono resize-none p-4 bg-muted/10"
                  value={solution}
                  onChange={e => setSolution(e.target.value)}
                  disabled={evaluating}
                />
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleSubmitSolution} disabled={!solution.trim() || evaluating} className="gap-2">
                    {evaluating ? <><Loader2 className="h-4 w-4 animate-spin" /> Evaluating Design...</> : "Submit Design for Review"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {evaluation && (
              <Card className="border-border/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardHeader className="bg-muted/20 border-b border-border/50 pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Design Feedback
                    </CardTitle>
                    <Badge className={
                      evaluation.score >= 8 ? "bg-green-500/20 text-green-400" : 
                      evaluation.score >= 5 ? "bg-yellow-500/20 text-yellow-400" : 
                      "bg-red-500/20 text-red-400"
                    }>
                      Score: {evaluation.score}/10
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <span className="text-xs font-bold text-primary uppercase mb-1 block">Feedback</span>
                    <p className="text-sm leading-relaxed text-muted-foreground">{evaluation.feedback}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    {evaluation.strengths && evaluation.strengths.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-green-400 uppercase">Strengths</span>
                        <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
                          {evaluation.strengths.map((s, idx) => <li key={idx}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {evaluation.improvements && evaluation.improvements.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-orange-400 uppercase">To Improve</span>
                        <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
                          {evaluation.improvements.map((s, idx) => <li key={idx}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card className="flex-1 flex items-center justify-center border-dashed bg-muted/10">
            <CardContent className="text-center text-muted-foreground">
              <LayoutTemplate className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Generate a challenge to start designing.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
