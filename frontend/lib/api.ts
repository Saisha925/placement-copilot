import { createClient } from './supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001'

async function getAuthToken() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
}

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

export async function generateInterviewQuestions(
  userId: string,
  resumeText: string, 
  targetRole: string, 
  roundType: string,
  experienceLevel: string = "Student / Fresher"
) {
  const res = await fetch(`${API_URL}/api/interview/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_id: userId,
      resume_text: resumeText, 
      target_role: targetRole, 
      round_type: roundType,
      experience_level: experienceLevel
    })
  })

  if (!res.ok) throw new Error('Failed to generate questions')
  return res.json()
}

export async function transcribeAudio(audioBlob: Blob) {
  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.webm')

  const res = await fetch(`${API_URL}/api/interview/transcribe`, {
    method: 'POST',
    body: formData
  })

  if (!res.ok) throw new Error('Failed to transcribe audio')
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

export async function analyzeCommunication(transcript: string) {
  const res = await fetch(`${API_URL}/api/interview/analyze-communication`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript })
  })

  if (!res.ok) throw new Error('Failed to analyze communication')
  return res.json()
}

export async function getInterviewHistory(userId: string) {
  const res = await fetch(`${API_URL}/api/interview/history/${userId}`)
  if (!res.ok) throw new Error('Failed to fetch interview history')
  const data = await res.json()
  return data.history || []
}

// ── CS Fundamentals API ──────────────────────────────────────────────────

export async function generateCSGuide(targetRole: string) {
  const res = await fetch(`${API_URL}/api/cs_fundamentals/guide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_role: targetRole })
  })
  if (!res.ok) throw new Error('Failed to generate CS guide')
  const data = await res.json()
  return data.guide
}

export async function generateCSQuestions(subject: string, topic: string) {
  const res = await fetch(`${API_URL}/api/cs_fundamentals/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, topic })
  })
  if (!res.ok) throw new Error('Failed to generate CS questions')
  const data = await res.json()
  return data.questions
}

export async function evaluateCSAnswer(question: string, answer: string) {
  const res = await fetch(`${API_URL}/api/cs_fundamentals/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, answer })
  })
  if (!res.ok) throw new Error('Failed to evaluate CS answer')
  const data = await res.json()
  return data.evaluation
}

export async function saveCSHistory(userId: string, subject: string, topic: string, question: string, answer: string, score: number, feedback: string, missingPoints: string[]) {
  const res = await fetch(`${API_URL}/api/cs_fundamentals/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      subject,
      topic,
      question,
      answer,
      score,
      feedback,
      missing_points: missingPoints
    })
  })
  if (!res.ok) throw new Error('Failed to save CS history')
  return res.json()
}

export async function getCSHistory(userId: string) {
  const res = await fetch(`${API_URL}/api/cs_fundamentals/history/${userId}`)
  if (!res.ok) throw new Error('Failed to fetch CS history')
  const data = await res.json()
  return data.history || []
}

export async function saveInterviewResult(
  userId: string,
  targetRole: string,
  roundType: string,
  qaData: any[],
  overallScore: number,
  feedback: string
) {
  const res = await fetch(`${API_URL}/api/interview/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      target_role: targetRole,
      round_type: roundType,
      questions_and_answers: qaData,
      overall_score: overallScore,
      feedback: feedback
    })
  })
  if (!res.ok) throw new Error('Failed to save interview result')
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

export async function refreshDSAPlan(
  userId: string, 
  customPrompt?: string,
  mode: string = "custom",
  durationDays: number = 7,
  specificTopics?: string[]
) {
  const res = await fetch(`${API_URL}/api/dsa/refresh-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_id: userId, 
      custom_prompt: customPrompt,
      mode,
      duration_days: durationDays,
      specific_topics: specificTopics
    }),
  })
  if (!res.ok) throw new Error('Failed to refresh plan')
  return res.json()
}

export async function getDSACalendar(userId: string) {
  const res = await fetch(`${API_URL}/api/dsa/calendar/${userId}`)
  if (!res.ok) throw new Error('Failed to fetch DSA calendar')
  const data = await res.json()
  return data.entries || []
}

export async function syncCareerPlan(userId: string) {
  const res = await fetch(`${API_URL}/api/dsa/sync-career-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  })
  if (!res.ok) throw new Error('Failed to sync career plan')
  return res.json()
}

export async function solveCalendarProblem(
  userId: string, 
  date: string, 
  problemName: string, 
  source: string = "custom",
  timeTakenMins?: number
) {
  const res = await fetch(`${API_URL}/api/dsa/calendar/solve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_id: userId, 
      date, 
      problem_name: problemName,
      source,
      time_taken_mins: timeTakenMins
    }),
  })
  if (!res.ok) throw new Error('Failed to mark calendar problem as solved')
  return res.json()
}

// ── Projects API ─────────────────────────────────────────────────────────────

export async function getProjects(userId: string) {
  const res = await fetch(`${API_URL}/api/projects/user/${userId}`)
  if (!res.ok) throw new Error('Failed to fetch projects')
  const data = await res.json()
  return data.projects || []
}

export async function updateProjectStatus(projectId: string, userId: string, status: string) {
  const res = await fetch(`${API_URL}/api/projects/${projectId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, status }),
  })
  if (!res.ok) throw new Error('Failed to update project status')
  return res.json()
}

export async function generateProjectRecommendations() {
  const res = await fetch(`${API_URL}/projects/recommendations`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${await getAuthToken()}` }
  });
  if (!res.ok) throw new Error('Failed to generate project recommendations');
  return res.json();
}

export async function askHelpDesk(message: string, currentPath: string, history: {role: string, content: string}[]) {
  const supabase = createClient();
  const user = await supabase.auth.getUser();
  const userId = user.data.user?.id || 'anonymous';
  
  const res = await fetch(`${API_URL}/api/helpdesk/ask`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getAuthToken()}`
    },
    body: JSON.stringify({
      user_id: userId,
      message,
      page_context: currentPath,
      history
    })
  });
  
  if (!res.ok) {
    throw new Error('Failed to communicate with help desk');
  }
  return res.json();
}

export async function refreshProjects(userId: string) {
  const res = await fetch(`${API_URL}/api/projects/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  })
  if (!res.ok) throw new Error('Failed to refresh projects')
  return res.json()
}

// ── System Design API ────────────────────────────────────────────────────────

export async function generateSystemDesignChallenge(targetRole: string) {
  const res = await fetch(`${API_URL}/api/system_design/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_role: targetRole })
  })
  if (!res.ok) throw new Error('Failed to generate challenge')
  const data = await res.json()
  return data.challenge
}

export async function evaluateSystemDesign(challenge: any, userSolution: string, userId: string) {
  const res = await fetch(`${API_URL}/api/system_design/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, challenge, user_solution: userSolution })
  })
  if (!res.ok) throw new Error('Failed to evaluate design')
  const data = await res.json()
  return data.evaluation
}

// ── Resources API ────────────────────────────────────────────────────────────

export async function searchResources(topic: string, category: string = 'general', maxResults: number = 3) {
  const res = await fetch(`${API_URL}/api/resources/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, category, max_results: maxResults })
  })
  if (!res.ok) throw new Error('Failed to search resources')
  const data = await res.json()
  return data.resources || []
}

// ── Career Plan API ─────────────────────────────────────────────────────────

export async function togglePlanTopic(userId: string, topicId: string, completed: boolean) {
  const res = await fetch(`${API_URL}/api/career-plan/toggle-topic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, topic_id: topicId, completed }),
  })
  if (!res.ok) throw new Error('Failed to toggle plan topic')
  return res.json()
}

export async function fetchCompletedPlanTopics(userId: string) {
  const res = await fetch(`${API_URL}/api/career-plan/completed-topics?user_id=${userId}`)
  if (!res.ok) return []
  const data = await res.json()
  return data.completed_topics || []
}

export async function saveCareerPlan(userId: string, goal: string, targetRole: string, planData: any) {
  const res = await fetch(`${API_URL}/api/career-plan/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, goal, target_role: targetRole, plan_data: planData }),
  })
  if (!res.ok) throw new Error('Failed to save career plan')
  return res.json()
}

export async function getActiveCareerPlan(userId: string) {
  const url = `${API_URL}/api/career-plan/active?user_id=${userId}`;
  const res = await fetch(url)
  if (!res.ok) {
    console.error(`getActiveCareerPlan failed: ${res.status} ${res.statusText} at ${url}`);
    throw new Error('Failed to fetch active career plan')
  }
  return res.json()
}

export async function getCareerPlanHistory(userId: string) {
  const url = `${API_URL}/api/career-plan/history?user_id=${userId}`;
  const res = await fetch(url)
  if (!res.ok) {
    console.error(`getCareerPlanHistory failed: ${res.status} ${res.statusText} at ${url}`);
    throw new Error('Failed to fetch career plan history')
  }
  return res.json()
}

export async function activateCareerPlan(userId: string, planId: string) {
  const res = await fetch(`${API_URL}/api/career-plan/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, plan_id: planId }),
  })
  if (!res.ok) throw new Error('Failed to activate career plan')
  return res.json()
}