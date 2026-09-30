"""Local RC server: Carmen's own D5/D6/D7 fixtures, clock fixed to 14 Sep 2026.

Same recipe as the earlier Day 7 harness (docs/evidence/V7_DAY_07_DEFECT_LEDGER.md):
a live create_app over her fixtures. Not part of any repo.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).parent
sys.path[:0] = [str(ROOT / "tests"), str(ROOT / "src")]

import uvicorn  # noqa: E402

from askanu_rag.main import create_app  # noqa: E402
from askanu_rag.retrieval import CourseProgramRepository  # noqa: E402
from test_resources import accommodation  # noqa: E402
from test_v7_day4_accommodation_vertical import ALPHA, BRAVO  # noqa: E402
from test_v7_day5_courses_scholarships import _course_records, _scholarship_records  # noqa: E402
from test_v7_day6_journeys import NOW, TODAY, event, job, support_service  # noqa: E402


def with_types(record, types):
    meta = record.metadata_json.model_copy(update={"employment_types": types})
    return record.model_copy(update={"metadata_json": meta})


jobs = [
    job(
        str(700000 + index),
        title=("Software Engineer" if index == 1 else f"Verified Role {index}"),
        closing_date=f"2026-09-{14 + index:02d}",
        requirements=["Published requirement A", "Published requirement B"],
    )
    for index in range(1, 8)
]
# A few varied employment types so casual / full-time constraints have something to bite on.
VARIED = len(sys.argv) > 2 and sys.argv[2] == "varied"
if VARIED:
    jobs[2] = with_types(jobs[2], ["Casual"])
    jobs[3] = with_types(jobs[3], ["Full-time"])

records = [
    *_course_records(),
    *_scholarship_records(),
    ALPHA,
    BRAVO,
    accommodation("day6-hall", title="Day 6 Hall"),
    accommodation("day6-lodge", title="Day 6 Lodge"),
    *jobs,
    *[
        event(
            str(800000 + i),
            day=14,
            hour=10 + i,
            source_id=("rubric_unified_search" if i == 6 else "events_anu_official"),
            venue=f"Venue {i}",
            organiser=f"Organiser {i}",
        )
        for i in range(1, 8)
    ],
    support_service(),
]

app = create_app(
    CourseProgramRepository(records),
    jobs_today_provider=lambda: TODAY,
    events_now_provider=lambda: NOW,
)

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8098
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")
