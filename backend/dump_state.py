import os
import json
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
from supabase import create_client, Client

load_dotenv('.env')

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY")

supabase: Client = create_client(url, key)

response = supabase.table("agent_state").select("*").execute()
if response.data:
    for row in response.data:
        print(f"User ID: {row['user_id']}")
        state = row['state']
        
        # Check skill gap
        skill_gap = state.get("skill_gap") or {}
        print(f"Readiness %: {skill_gap.get('readiness_percentage')}")
        
        print("-" * 40)
else:
    print("No data in agent_state")

response2 = supabase.table("career_plans").select("*").order("created_at", desc=True).limit(5).execute()
if response2.data:
    for latest in response2.data:
        print(f"Plan User: {latest['user_id']}")
        plan_data = latest['plan_data']
        if 'career_plan' in plan_data:
            cp = plan_data['career_plan']
            print("Format:", cp.get('format'))
            print("Executive Summary:", cp.get('executive_summary'))
            print("Key Priorities:", cp.get('key_priorities'))
        else:
            print("plan_data:", list(plan_data.keys()))
        print("-" * 20)
else:
    print("No plans")
