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
