from geoalchemy2 import Geometry
from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, SmallInteger, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AdministrativeArea(Base):
    __tablename__ = "administrative_areas"
    __table_args__ = (CheckConstraint("level BETWEEN 1 AND 4", name="administrative_areas_level_check"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    level: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    parent_code: Mapped[str | None] = mapped_column(
        String(20), ForeignKey("administrative_areas.code"), nullable=True
    )
    geometry: Mapped[object] = mapped_column(Geometry("MULTIPOLYGON", srid=4326), nullable=False)
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)

