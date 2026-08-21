import json
from langchain_core.messages import HumanMessage, SystemMessage
from core.llm import get_llm
from core.database import get_supabase_client
from datetime import datetime, timezone

def run_learning_engine():
    """
    Analyzes recent helpdesk logs to identify common issues.
    If a recurring pattern is found, updates the dynamic App Manual.
    """
    client = get_supabase_client()
    
    # 1. Fetch recent logs (e.g., last 50 interactions)
    logs_data = client.table("helpdesk_logs").select("*").order("created_at", desc=True).limit(50).execute()
    logs = logs_data.data if logs_data.data else []
    
    if not logs:
        print("No logs to analyze.")
        return

    # 2. Extract unique problems
    log_text = ""
    for log in logs:
        log_text += f"- User on page {log['page_context']} asked: '{log['question']}'\n"

    system_prompt = """You are the self-learning engine for the Help Desk Agent.
Your job is to read recent user chat logs and identify if there are any *recurring* points of confusion about how to use the app.
If you identify a pattern where users are confused about a feature, generate a new 'Rule' to be added to the Help Desk Manual.
A rule should be a concise troubleshooting tip for the Chatbot to use in the future.

Output your response strictly in JSON format as a list of rules (return an empty list if no clear recurring confusion is found):
[
    {
        "rule_category": "Short topic name (e.g., Mock Interviews)",
        "rule_description": "Detailed tip for the bot to remember."
    }
]
"""
    
    llm = get_llm(temperature=0.2, model="openai/gpt-oss-120b", max_tokens=1024, json_mode=True)
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Recent Logs:\n{log_text}")
    ]
    
    try:
        response = llm.invoke(messages)
        text = response.content.strip().replace("```json", "").replace("```", "").strip()
        new_rules = json.loads(text)
        
        # 3. Insert new rules into the database
        if new_rules:
            for rule in new_rules:
                client.table("helpdesk_manual").insert({
                    "rule_category": rule["rule_category"],
                    "rule_description": rule["rule_description"]
                }).execute()
            print(f"Added {len(new_rules)} new rules to the manual.")
        else:
            print("No new patterns identified.")
            
    except Exception as e:
        print(f"Failed to run learning engine: {e}")

if __name__ == "__main__":
    run_learning_engine()
