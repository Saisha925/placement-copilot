from supabase import create_client, Client
from core.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

def get_supabase_client() -> Client:
    """Returns a new Supabase client per request to avoid Windows socket concurrency issues."""
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)