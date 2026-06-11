const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function analyzeResume(file: File, targetRole: string, userId: string) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('target_role', targetRole)
  formData.append('user_id', userId)
  
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/resume/analyze`, {
    method: 'POST',
    body: formData
  })
  
  if (!res.ok) throw new Error('Analysis failed')
  return res.json()
}

export async function getSkillGap(resumeText: string, targetRole: string, userId: string) {
  const res = await fetch(`${API_URL}/api/skill-gap/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume_text: resumeText, target_role: targetRole, user_id: userId })
  })

  if (!res.ok) throw new Error('Skill gap analysis failed')
  return res.json()
}

export async function generateInterviewQuestions(resumeText: string, targetRole: string, roundType: string) {
  const res = await fetch(`${API_URL}/api/interview/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resume_text: resumeText, target_role: targetRole, round_type: roundType })
  })

  if (!res.ok) throw new Error('Failed to generate questions')
  return res.json()
}

export async function evaluateAnswer(question: string, answer: string, targetRole: string) {
  const res = await fetch(`${API_URL}/api/interview/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, answer, target_role: targetRole })
  })

  if (!res.ok) throw new Error('Failed to evaluate answer')
  return res.json()
}

export async function runCopilot(
  userId: string,
  goal: string,
  targetRole: string,
  resumeText?: string,
  targetCompany?: string,
  targetDate?: string,
  userProfile?: object
) {
  const res = await fetch(`${API_URL}/api/copilot/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      goal,
      target_role: targetRole,
      resume_text: resumeText,
      target_company: targetCompany,
      target_date: targetDate,
      user_profile: userProfile,
    }),
  })

  if (!res.ok) throw new Error('Copilot run failed')
  return res.json()
}

// ── DSA API ──────────────────────────────────────────────────────────────────

export async function logDSAProblem(
  userId: string,
  topic: string,
  problemName: string,
  difficulty: string,
  platform: string = 'LeetCode',
  timeTakenMins?: number,
  notes?: string,
  isRevision: boolean = false
): Promise<{ success: boolean; progress?: Record<string, unknown>; already_maxed?: boolean; detail?: string }> {
  const res = await fetch(`${API_URL}/api/dsa/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      topic,
      problem_name: problemName,
      difficulty,
      platform,
      time_taken_mins: timeTakenMins,
      notes,
      is_revision: isRevision,
    }),
  })

  // 409 = duplicate limit reached — return gracefully instead of throwing
  if (res.status === 409) {
    const data = await res.json()
    return { success: false, already_maxed: true, detail: data.detail }
  }

  if (!res.ok) throw new Error('Failed to log problem')
  return res.json()
}

export async function getDSAProgress(userId: string) {
  const res = await fetch(`${API_URL}/api/dsa/progress/${userId}`)
  if (!res.ok) throw new Error('Failed to fetch DSA progress')
  return res.json()
}

export async function getDSAProblems(userId: string) {
  const res = await fetch(`${API_URL}/api/dsa/problems/${userId}`)
  if (!res.ok) throw new Error('Failed to fetch DSA problems')
  const data = await res.json()
  return data.problems || []
}

export async function toggleRevision(userId: string, problemId: string, revision: boolean) {
  const res = await fetch(`${API_URL}/api/dsa/revision`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, problem_id: problemId, revision }),
  })
  if (!res.ok) throw new Error('Failed to toggle revision')
  return res.json()
}

export async function updateProblemNotes(userId: string, problemId: string, notes?: string, mistakes?: string) {
  const res = await fetch(`${API_URL}/api/dsa/notes`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, problem_id: problemId, notes, mistakes }),
  })
  if (!res.ok) throw new Error('Failed to update notes')
  return res.json()
}

export async function refreshDSAPlan(userId: string) {
  const res = await fetch(`${API_URL}/api/dsa/refresh-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  })
  if (!res.ok) throw new Error('Failed to refresh plan')
  return res.json()
}