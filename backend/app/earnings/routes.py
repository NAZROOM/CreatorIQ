from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.earnings import Earnings
from app.models.sponsorship import Sponsorship


router = APIRouter(
    prefix="/earnings",
    tags=["Earnings"]
)


# =====================================================
# HELPER FUNCTIONS
# =====================================================

def normalize_currency(currency):
    return (currency or "USD").strip().upper()


def normalize_status(status):
    return (status or "pending").strip().lower()


def get_currency_bucket(currencies, currency):
    currency = normalize_currency(currency)

    if currency not in currencies:
        currencies[currency] = {
            "currency": currency,
            "estimated_revenue": 0.0,
            "ad_revenue": 0.0,
            "monetized_views": 0,
            "earnings_records": 0,
            "sponsorship_count": 0,
            "sponsorship_value": 0.0,
            "paid_sponsorships": 0.0,
            "pending_sponsorships": 0.0,
            "overdue_sponsorships": 0.0,
        }

    return currencies[currency]


def finalize_currency_buckets(currencies):
    results = []

    for bucket in currencies.values():
        for key in (
            "estimated_revenue",
            "ad_revenue",
            "sponsorship_value",
            "paid_sponsorships",
            "pending_sponsorships",
            "overdue_sponsorships",
        ):
            bucket[key] = round(bucket[key], 2)

        # Keep currency values separate.
        bucket["total_realized_revenue"] = round(
            bucket["estimated_revenue"]
            + bucket["paid_sponsorships"],
            2,
        )

        results.append(bucket)

    return sorted(results, key=lambda item: item["currency"])


def get_overdue_or_due_soon_status(sponsorship, today):
    """
    A payment with a valid due date is overdue only after
    that date has passed.

    If there is no due date, a manually assigned overdue
    status is respected.
    """
    status = normalize_status(sponsorship.payment_status)
    due_date = sponsorship.due_date

    if status == "paid":
        return None

    if due_date is not None:
        if due_date < today:
            return "overdue"

        if today <= due_date <= today + timedelta(days=7):
            return "due_soon"

        return None

    if status == "overdue":
        return "overdue"

    return None


# =====================================================
# GET ALL EARNINGS
# =====================================================

@router.get("/{creator_id}")
def get_creator_earnings(
    creator_id: int,
    db: Session = Depends(get_db),
):
    earnings = (
        db.query(Earnings)
        .filter(Earnings.creator_id == creator_id)
        .order_by(Earnings.date.asc())
        .all()
    )

    if not earnings:
        raise HTTPException(
            status_code=404,
            detail="No earnings data found for this creator",
        )

    return earnings


# =====================================================
# GET EARNINGS SUMMARY
# =====================================================

@router.get("/{creator_id}/summary")
def get_earnings_summary(
    creator_id: int,
    db: Session = Depends(get_db),
):
    earnings = (
        db.query(Earnings)
        .filter(Earnings.creator_id == creator_id)
        .order_by(Earnings.date.asc())
        .all()
    )

    if not earnings:
        raise HTTPException(
            status_code=404,
            detail="No earnings data found for this creator",
        )

    # Group totals by currency rather than combining INR,
    # USD, EUR, and other currencies into one number.
    currencies = {}

    for item in earnings:
        bucket = get_currency_bucket(currencies, item.currency)

        bucket["estimated_revenue"] += float(
            item.estimated_revenue or 0
        )
        bucket["ad_revenue"] += float(item.ad_revenue or 0)
        bucket["monetized_views"] += int(
            item.monetized_views or 0
        )
        bucket["earnings_records"] += 1

    revenue_by_currency = finalize_currency_buckets(currencies)

    response = {
        "creator_id": creator_id,
        "revenue_by_currency": revenue_by_currency,
        "total_earnings_records": len(earnings),
    }

    # Preserve legacy scalar fields when all records use
    # the same currency. Never create a misleading mixed-
    # currency total.
    if len(revenue_by_currency) == 1:
        bucket = revenue_by_currency[0]
        response.update({
            "total_estimated_revenue": bucket["estimated_revenue"],
            "total_ad_revenue": bucket["ad_revenue"],
            "total_monetized_views": bucket["monetized_views"],
            "currency": bucket["currency"],
        })
    else:
        response["message"] = (
            "Earnings use multiple currencies. "
            "Use revenue_by_currency for accurate totals."
        )

    return response


# =====================================================
# GET EARNINGS TREND
# =====================================================

@router.get("/{creator_id}/trend")
def get_earnings_trend(
    creator_id: int,
    db: Session = Depends(get_db),
):
    earnings = (
        db.query(Earnings)
        .filter(Earnings.creator_id == creator_id)
        .order_by(Earnings.date.asc(), Earnings.id.asc())
        .all()
    )

    if not earnings:
        raise HTTPException(
            status_code=404,
            detail="No earnings data found for this creator",
        )

    # Track previous revenue independently for each currency.
    previous_by_currency = {}
    trend = []

    for item in earnings:
        currency = normalize_currency(item.currency)
        revenue = float(item.estimated_revenue or 0)
        previous_revenue = previous_by_currency.get(currency)

        if previous_revenue is None or previous_revenue <= 0:
            growth = 0.0
        else:
            growth = (
                (revenue - previous_revenue)
                / previous_revenue
            ) * 100

        trend.append({
            "date": item.date,
            "estimated_revenue": round(revenue, 2),
            "ad_revenue": round(float(item.ad_revenue or 0), 2),
            "monetized_views": int(item.monetized_views or 0),
            "growth": round(growth, 2),
            "currency": currency,
        })

        previous_by_currency[currency] = revenue

    return {
        "creator_id": creator_id,
        "trend": trend,
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
    db: Session = Depends(get_db),
):
    if estimated_revenue < 0 or ad_revenue < 0:
        raise HTTPException(
            status_code=400,
            detail="Revenue cannot be negative",
        )

    if monetized_views < 0:
        raise HTTPException(
            status_code=400,
            detail="Monetized views cannot be negative",
        )

    currency = normalize_currency(currency)

    if not currency:
        raise HTTPException(
            status_code=400,
            detail="Currency is required",
        )

    earnings = Earnings(
        creator_id=creator_id,
        date=date_value,
        estimated_revenue=estimated_revenue,
        ad_revenue=ad_revenue,
        monetized_views=monetized_views,
        currency=currency,
    )

    db.add(earnings)
    db.commit()
    db.refresh(earnings)

    return earnings


# =====================================================
# REVENUE ANALYTICS
# EARNINGS + SPONSORSHIPS
# =====================================================

@router.get("/{creator_id}/revenue-analytics")
def get_revenue_analytics(
    creator_id: int,
    db: Session = Depends(get_db),
):
    earnings = (
        db.query(Earnings)
        .filter(Earnings.creator_id == creator_id)
        .all()
    )

    sponsorships = (
        db.query(Sponsorship)
        .filter(Sponsorship.creator_id == creator_id)
        .all()
    )

    currencies = {}

    for item in earnings:
        bucket = get_currency_bucket(currencies, item.currency)

        bucket["estimated_revenue"] += float(
            item.estimated_revenue or 0
        )
        bucket["ad_revenue"] += float(item.ad_revenue or 0)
        bucket["monetized_views"] += int(
            item.monetized_views or 0
        )
        bucket["earnings_records"] += 1

    for item in sponsorships:
        bucket = get_currency_bucket(currencies, item.currency)
        amount = float(item.amount or 0)
        status = normalize_status(item.payment_status)

        bucket["sponsorship_count"] += 1
        bucket["sponsorship_value"] += amount

        if status == "paid":
            bucket["paid_sponsorships"] += amount
        elif status == "overdue":
            bucket["overdue_sponsorships"] += amount
        else:
            bucket["pending_sponsorships"] += amount

    return {
        "creator_id": creator_id,
        "revenue_by_currency": finalize_currency_buckets(currencies),
        "total_earnings_records": len(earnings),
        "total_sponsorship_records": len(sponsorships),
    }


# =====================================================
# MILESTONE 3: DATE-RANGE MONETIZATION REPORT
# =====================================================

@router.get("/{creator_id}/report")
def get_monetization_report(
    creator_id: int,
    start_date: date = Query(..., description="Report start date"),
    end_date: date = Query(..., description="Report end date"),
    db: Session = Depends(get_db),
):
    if start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date must be on or before end_date",
        )

    earnings = (
        db.query(Earnings)
        .filter(
            Earnings.creator_id == creator_id,
            Earnings.date >= start_date,
            Earnings.date <= end_date,
        )
        .order_by(Earnings.date.asc())
        .all()
    )

    # Include sponsorships whose campaign start date falls
    # in the requested period. Sponsorships without a start
    # date are not assigned an invented report date.
    sponsorships = (
        db.query(Sponsorship)
        .filter(
            Sponsorship.creator_id == creator_id,
            Sponsorship.start_date >= start_date,
            Sponsorship.start_date <= end_date,
        )
        .all()
    )

    currencies = {}

    for item in earnings:
        bucket = get_currency_bucket(currencies, item.currency)
        bucket["estimated_revenue"] += float(
            item.estimated_revenue or 0
        )
        bucket["ad_revenue"] += float(item.ad_revenue or 0)
        bucket["monetized_views"] += int(
            item.monetized_views or 0
        )
        bucket["earnings_records"] += 1

    for item in sponsorships:
        bucket = get_currency_bucket(currencies, item.currency)
        amount = float(item.amount or 0)
        status = normalize_status(item.payment_status)

        bucket["sponsorship_count"] += 1
        bucket["sponsorship_value"] += amount

        if status == "paid":
            bucket["paid_sponsorships"] += amount
        elif status == "overdue":
            bucket["overdue_sponsorships"] += amount
        else:
            bucket["pending_sponsorships"] += amount

    return {
        "creator_id": creator_id,
        "start_date": start_date,
        "end_date": end_date,
        "earnings_records_in_period": len(earnings),
        "sponsorship_records_in_period": len(sponsorships),
        "revenue_by_currency": finalize_currency_buckets(currencies),
    }


# =====================================================
# MILESTONE 3: PAYMENT ALERTS
# =====================================================

@router.get("/{creator_id}/alerts")
def get_payment_alerts(
    creator_id: int,
    db: Session = Depends(get_db),
):
    today = date.today()

    sponsorships = (
        db.query(Sponsorship)
        .filter(Sponsorship.creator_id == creator_id)
        .order_by(Sponsorship.due_date.asc())
        .all()
    )

    overdue = []
    due_soon = []

    for item in sponsorships:
        alert_type = get_overdue_or_due_soon_status(item, today)

        if alert_type is None:
            continue

        alert = {
            "sponsorship_id": item.id,
            "brand_name": item.brand_name,
            "campaign_name": item.campaign_name,
            "amount": float(item.amount or 0),
            "currency": normalize_currency(item.currency),
            "payment_status": normalize_status(item.payment_status),
            "due_date": item.due_date,
            "alert_type": alert_type,
        }

        if alert_type == "overdue":
            overdue.append(alert)
        else:
            due_soon.append(alert)

    return {
        "creator_id": creator_id,
        "as_of_date": today,
        "overdue_count": len(overdue),
        "due_soon_count": len(due_soon),
        "overdue_payments": overdue,
        "payments_due_soon": due_soon,
    }