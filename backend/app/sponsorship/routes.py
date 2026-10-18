from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.sponsorship import Sponsorship

router = APIRouter(prefix="/sponsorships", tags=["Sponsorships"])


@router.post("/{creator_id}")
def create_sponsorship(
    creator_id: int,
    brand_name: str,
    campaign_name: str,
    amount: float,
    currency: str = "USD",
    payment_status: str = "pending",
    start_date: Optional[date] = None,
    due_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    if amount < 0:
        raise HTTPException(status_code=400, detail="Amount cannot be negative")

    if payment_status not in {"pending", "paid", "overdue"}:
        raise HTTPException(status_code=400, detail="Invalid payment status")

    sponsorship = Sponsorship(
        creator_id=creator_id,
        brand_name=brand_name,
        campaign_name=campaign_name,
        amount=amount,
        currency=currency,
        payment_status=payment_status,
        start_date=start_date,
        due_date=due_date,
    )

    db.add(sponsorship)
    db.commit()
    db.refresh(sponsorship)
    return sponsorship


@router.get("/{creator_id}")
def get_sponsorships(creator_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Sponsorship)
        .filter(Sponsorship.creator_id == creator_id)
        .order_by(Sponsorship.id.desc())
        .all()
    )


@router.patch("/{sponsorship_id}/status")
def update_sponsorship_status(
    sponsorship_id: int,
    payment_status: str,
    db: Session = Depends(get_db),
):
    if payment_status not in {"pending", "paid", "overdue"}:
        raise HTTPException(status_code=400, detail="Invalid payment status")

    sponsorship = db.query(Sponsorship).filter(
        Sponsorship.id == sponsorship_id
    ).first()

    if not sponsorship:
        raise HTTPException(status_code=404, detail="Sponsorship not found")

    sponsorship.payment_status = payment_status
    db.commit()
    db.refresh(sponsorship)
    return sponsorship