from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.earnings import Earnings


router = APIRouter(
    prefix="/earnings",
    tags=["Earnings"]
)


# =====================================================
# GET ALL EARNINGS
# =====================================================

@router.get("/{creator_id}")
def get_creator_earnings(
    creator_id: int,
    db: Session = Depends(get_db)
):

    earnings = (
        db.query(Earnings)
        .filter(
            Earnings.creator_id == creator_id
        )
        .order_by(
            Earnings.date.asc()
        )
        .all()
    )

    if not earnings:
        raise HTTPException(
            status_code=404,
            detail="No earnings data found for this creator"
        )

    return earnings


# =====================================================
# GET EARNINGS SUMMARY
# =====================================================

@router.get("/{creator_id}/summary")
def get_earnings_summary(
    creator_id: int,
    db: Session = Depends(get_db)
):

    earnings = (
        db.query(Earnings)
        .filter(
            Earnings.creator_id == creator_id
        )
        .order_by(
            Earnings.date.asc()
        )
        .all()
    )

    if not earnings:
        raise HTTPException(
            status_code=404,
            detail="No earnings data found for this creator"
        )

    total_estimated_revenue = sum(
        float(item.estimated_revenue or 0)
        for item in earnings
    )

    total_ad_revenue = sum(
        float(item.ad_revenue or 0)
        for item in earnings
    )

    total_monetized_views = sum(
        int(item.monetized_views or 0)
        for item in earnings
    )

    currency = earnings[0].currency or "USD"

    return {
        "creator_id": creator_id,

        "total_estimated_revenue": round(
            total_estimated_revenue,
            2
        ),

        "total_ad_revenue": round(
            total_ad_revenue,
            2
        ),

        "total_monetized_views": total_monetized_views,

        "currency": currency
    }


# =====================================================
# GET EARNINGS TREND
# =====================================================

@router.get("/{creator_id}/trend")
def get_earnings_trend(
    creator_id: int,
    db: Session = Depends(get_db)
):

    earnings = (
        db.query(Earnings)
        .filter(
            Earnings.creator_id == creator_id
        )
        .order_by(
            Earnings.date.asc()
        )
        .all()
    )

    if not earnings:
        raise HTTPException(
            status_code=404,
            detail="No earnings data found for this creator"
        )

    trend = []

    previous_revenue = None

    for item in earnings:

        revenue = float(
            item.estimated_revenue or 0
        )

        # ---------------------------------------------
        # CALCULATE REVENUE GROWTH
        # ---------------------------------------------

        if (
            previous_revenue is None
            or previous_revenue <= 0
        ):

            growth = 0

        else:

            growth = (
                (
                    revenue
                    - previous_revenue
                )
                / previous_revenue
            ) * 100

        trend.append({

            "date": item.date,

            "estimated_revenue": round(
                revenue,
                2
            ),

            "ad_revenue": round(
                float(
                    item.ad_revenue or 0
                ),
                2
            ),

            "monetized_views": int(
                item.monetized_views or 0
            ),

            "growth": round(
                growth,
                2
            ),

            "currency": (
                item.currency
                or "USD"
            )
        })

        previous_revenue = revenue

    return {
        "creator_id": creator_id,
        "trend": trend
    }


# =====================================================
# CREATE EARNINGS DATA
# =====================================================

@router.post("/{creator_id}")
def create_creator_earnings(
    creator_id: int,
    date_value: date,
    estimated_revenue: float = 0.0,
    ad_revenue: float = 0.0,
    monetized_views: int = 0,
    currency: str = "USD",
    db: Session = Depends(get_db)
):

    earnings = Earnings(

        creator_id=creator_id,

        date=date_value,

        estimated_revenue=estimated_revenue,

        ad_revenue=ad_revenue,

        monetized_views=monetized_views,

        currency=currency
    )

    db.add(earnings)

    db.commit()

    db.refresh(earnings)

    return earnings