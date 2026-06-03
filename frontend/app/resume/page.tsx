'use client'
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { analyzeResume } from '@/lib/api'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const roles = [
  'SDE',
  'Data Analyst',
  'ML Engineer',
  'AI Engineer',
  'Backend Engineer',
  'Product Manager'
]

export default function ResumePage() {
  const [file, setFile] = useState<File | null>(null)
  const [targetRole, setTargetRole] = useState('SDE')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFile(acceptedFiles[0])
    setResult(null)
    setError('')
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1
  })

  async function handleAnalyze() {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'anonymous'
      const response = await analyzeResume(file, targetRole, userId)
      setResult(response.data)
    } catch (err) {
      setError('Analysis failed. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Resume Analyzer</h1>
        <p className="text-muted-foreground mt-1">Upload your resume and get instant ATS feedback</p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{file.name}</span>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium">Drop your resume here or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">PDF files only</p>
              </div>
            )}
          </div>

          {/* Role Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Role</label>
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <button
                  key={role}
                  onClick={() => setTargetRole(role)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                    ${targetRole === role
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button
            onClick={handleAnalyze}
            disabled={!file || loading}
            className="w-full"
          >
            {loading ? 'Analyzing...' : 'Analyze Resume'}
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {result && (
        <div className="space-y-4">
          {/* ATS Score */}
          <Card>
            <CardHeader>
              <CardTitle>ATS Score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end gap-3">
                <span className="text-5xl font-bold text-primary">{result.ats_score}</span>
                <span className="text-muted-foreground mb-1">/100</span>
              </div>
              <Progress value={result.ats_score} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {result.ats_score >= 80 ? 'Excellent — your resume is well optimized' :
                 result.ats_score >= 60 ? 'Good — a few improvements will boost your chances' :
                 'Needs work — follow the suggestions below'}
              </p>
            </CardContent>
          </Card>

          {/* Issues */}
          <Card>
            <CardHeader>
              <CardTitle>Issues Found</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.issues.map((issue: any, i: number) => (
                <div key={i} className="flex items-start gap-3">
                  {issue.type === 'error'
                    ? <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    : <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />}
                  <p className="text-sm">{issue.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle>Improvement Suggestions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.suggestions.map((s: any, i: number) => (
                <div key={i} className="space-y-2">
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-muted-foreground mb-1">Original</p>
                    <p className="text-sm">{s.original}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-xs text-muted-foreground mb-1">Improved</p>
                    <p className="text-sm">{s.improved}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Missing Skills & Strengths */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Missing Skills</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {result.missing_skills.map((skill: string, i: number) => (
                  <Badge key={i} variant="destructive">{skill}</Badge>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Strengths</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {result.strengths.map((strength: string, i: number) => (
                  <Badge key={i} className="bg-green-500/20 text-green-400 border-green-500/30">{strength}</Badge>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}