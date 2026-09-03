from sqlalchemy import Column, Integer, Float, Date, ForeignKey

from app.database import Base


class Analytics(Base):
    __tablename__ = "analytics"

    id = Column(Integer, primary_key=True, index=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)

    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    followers = Column(Integer, default=0)
    reach = Column(Integer, default=0)
    engagement_rate = Column(Float, default=0.0)