from sqlalchemy import Column, Integer, Float, String, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class Sponsorship(Base):
    __tablename__ = "sponsorships"

    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    brand_name = Column(String(200), nullable=False)
    campaign_name = Column(String(200), nullable=False)
    amount = Column(Float, nullable=False, default=0)
    currency = Column(String(10), nullable=False, default="USD")
    payment_status = Column(String(30), nullable=False, default="pending")
    start_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime, server_default=func.now())