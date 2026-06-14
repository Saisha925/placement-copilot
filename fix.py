import sys

file_api = r'c:\Users\Dell\Documents\GitHub\placement-copilot\frontend\lib\api.ts'
with open(file_api, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace(
    'export async function evaluateSystemDesign(challenge: any, userSolution: string) {\n  const res = await fetch(`${API_URL}/api/system_design/evaluate`, {\n    method: \'POST\',\n    headers: { \'Content-Type\': \'application/json\' },\n    body: JSON.stringify({ challenge, user_solution: userSolution })\n  })',
    'export async function evaluateSystemDesign(challenge: any, userSolution: string, userId: string) {\n  const res = await fetch(`${API_URL}/api/system_design/evaluate`, {\n    method: \'POST\',\n    headers: { \'Content-Type\': \'application/json\' },\n    body: JSON.stringify({ user_id: userId, challenge, user_solution: userSolution })\n  })'
)
with open(file_api, 'w', encoding='utf-8') as f:
    f.write(content)

file_sd = r'c:\Users\Dell\Documents\GitHub\placement-copilot\frontend\app\(main)\system-design\page.tsx'
with open(file_sd, 'r', encoding='utf-8') as f:
    content = f.read()

# Add import if not exists
if 'import { createClient }' not in content:
    content = content.replace('import { useState } from \'react\'\n', 'import { useState } from \'react\'\nimport { createClient } from \'@/lib/supabase\'\n')

content = content.replace(
    'const data = await evaluateSystemDesign(challenge, solution)',
    'const supabase = createClient()\n      const { data: { user } } = await supabase.auth.getUser()\n      const userId = user?.id || \'anonymous\'\n      const data = await evaluateSystemDesign(challenge, solution, userId)'
)
with open(file_sd, 'w', encoding='utf-8') as f:
    f.write(content)

file_nav = r'c:\Users\Dell\Documents\GitHub\placement-copilot\frontend\components\shared\Navbar.tsx'
with open(file_nav, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace("{ href: '/skill-gap', label: 'Gap'", "{ href: '/career-plan', label: 'Gap'")
with open(file_nav, 'w', encoding='utf-8') as f:
    f.write(content)

file_dash = r'c:\Users\Dell\Documents\GitHub\placement-copilot\frontend\app\(main)\dashboard\page.tsx'
with open(file_dash, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('<Link href="/skill-gap"', '<Link href="/career-plan"')
with open(file_dash, 'w', encoding='utf-8') as f:
    f.write(content)

file_int = r'c:\Users\Dell\Documents\GitHub\placement-copilot\frontend\app\(main)\interview\page.tsx'
with open(file_int, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('orange', 'fuchsia')
with open(file_int, 'w', encoding='utf-8') as f:
    f.write(content)

print('done')
