from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from core.state_manager import load_state, save_state

router = APIRouter()

class UserProfileUpdate(BaseModel):
    user_id: str
    target_role: Optional[str] = None
    semester: Optional[int] = None
    cgpa: Optional[float] = None
    target_package_lpa: Optional[float] = None
    preferred_roles: Optional[List[str]] = None
    daily_hours: Optional[int] = None
    graduation_year: Optional[int] = None
    preferred_companies: Optional[List[str]] = None

@router.get("/{user_id}")
async def get_user_profile(user_id: str):
    try:
        state = load_state(user_id)
        profile = state.get("user_profile") or {}
        return {
            "target_role": state.get("target_role", ""),
            "profile": profile
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def update_user_profile(request: UserProfileUpdate):
    try:
        state = load_state(request.user_id)
        
        # Initialize if none
        if not state.get("user_profile"):
            state["user_profile"] = {}
            
        profile = state["user_profile"]
        
        # Update target_role at top level as well as in profile
        if request.target_role is not None:
            state["target_role"] = request.target_role
            
        if request.semester is not None: profile["semester"] = request.semester
        if request.cgpa is not None: profile["cgpa"] = request.cgpa
        if request.target_package_lpa is not None: profile["target_package_lpa"] = request.target_package_lpa
        if request.preferred_roles is not None: profile["preferred_roles"] = request.preferred_roles
        if request.daily_hours is not None: profile["daily_hours"] = request.daily_hours
        if request.graduation_year is not None: profile["graduation_year"] = request.graduation_year
        if request.preferred_companies is not None: profile["preferred_companies"] = request.preferred_companies
            
        save_state(request.user_id, state)
        
        return {"status": "success", "profile": profile}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
