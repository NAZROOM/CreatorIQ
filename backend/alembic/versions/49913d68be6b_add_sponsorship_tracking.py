"""add sponsorship tracking"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "49913d68be6b"
down_revision: Union[str, Sequence[str], None] = "100373f76d6e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sponsorships",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("creator_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("brand_name", sa.String(200), nullable=False),
        sa.Column("campaign_name", sa.String(200), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(10), nullable=False, server_default="USD"),
        sa.Column("payment_status", sa.String(30), nullable=False, server_default="pending"),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("sponsorships")