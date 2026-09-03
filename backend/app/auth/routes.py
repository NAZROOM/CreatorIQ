from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.auth.schemas import RegisterRequest, LoginRequest
from app.auth.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_role
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/register")
def register(
    data: RegisterRequest,
    db: Session = Depends(get_db)
):
    # Check if email already exists
    existing_user = db.query(User).filter(
        User.email == data.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # Create new user
    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "User registered successfully",
        "user_id": user.id
    }


@router.post("/login")
def login(
    data: LoginRequest,
    db: Session = Depends(get_db)
):
    # Find user
    user = db.query(User).filter(
        User.email == data.email
    ).first()

    # Check credentials
    if not user or not verify_password(
        data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Create JWT token
    token = create_access_token({
        "sub": str(user.id),
        "role": user.role
    })

    return {
        "access_token": token,
        "token_type": "bearer"
    }

@router.get("/me")
def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role
    }

@router.get("/creator-only")
def creator_only(
    current_user: User = Depends(require_role("Creator"))
):
    return {
        "message": "Welcome Creator!",
        "user": current_user.name,
        "role": current_user.role
    }