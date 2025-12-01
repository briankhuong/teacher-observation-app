import React, { useState } from "react";

const STORAGE_PREFIX = "obs-v1-";

type StatusColor = "good" | "mixed" | "growth";
type GroupMode = "none" | "month" | "school" | "campus";

interface DashboardObservationRow {
  id: string;
  teacherName: string;
  schoolName: string;
  campus: string;
  unit: string;
  lesson: string;
  supportType: "Training" | "LVA" | "Visit";
  date: string; // formatted
  rawDate: number | null; // numeric timestamp for sorting
  status: "draft" | "saved";
  progress: number;
  totalIndicators: number;
  statusColor: StatusColor;
}

interface DashboardProps {
  onOpenObservation: (obs: {
    id: string;
    teacherName: string;
    schoolName: string;
    campus: string;
    unit: string;
    lesson: string;
    supportType: "Training" | "LVA" | "Visit";
  }) => void;
}

/* ------------------------------
   DATE HELPERS
--------------------------------- */
function safeParseTimestamp(dateStr: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function getMonthKey(ts: number | null): string {
  if (!ts) return "unknown";
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatMonthLabel(key: string): string {
  if (key === "unknown") return "Unknown date";
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/* ------------------------------
   GROUPING HELPERS
--------------------------------- */
function groupBy<T>(
  items: T[],
  keyFn: (item: T) => string
) {
  const buckets: Record<string, T[]> = {};
  items.forEach((item) => {
    const key = keyFn(item);
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(item);
  });

  return Object.entries(buckets).map(([key, list]) => ({
    key,
    label: key,
    items: list,
  }));
}

/* ------------------------------
   COMPONENT
--------------------------------- */
export const DashboardShell: React.FC<DashboardProps> = ({
  onOpenObservation,
}) => {
  const [observations, setObservations] = useState<DashboardObservationRow[]>([]);
  const [groupMode, setGroupMode] = useState<GroupMode>("month");

  /* ------------------------------
     LOAD OBSERVATIONS
  --------------------------------- */
    /* ------------------------------
     LOAD OBSERVATIONS
  --------------------------------- */
  React.useEffect(() => {
    const rows: DashboardObservationRow[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(STORAGE_PREFIX)) continue;

      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;

        const parsed = JSON.parse(raw);

        const total = parsed.indicators?.length ?? 0;

        let good = 0;
        let growth = 0;
        let progress = 0;

        (parsed.indicators ?? []).forEach((ind: any) => {
          const hasMark = ind.good || ind.growth;
          const hasComment = ind.commentText?.trim().length > 0;
          const hasInk = Array.isArray(ind.strokes) && ind.strokes.length > 0;

          if (hasMark || hasComment || hasInk) progress++;
          if (ind.good) good++;
          if (ind.growth) growth++;
        });

        let statusColor: StatusColor = "mixed";
        if (growth > 0 && good === 0) statusColor = "growth";
        else if (good > 0 && growth === 0) statusColor = "good";

        // ✅ Prefer the real observation date from meta.date (YYYY-MM-DD),
        //    fall back to updatedAt for old records.
        const obsDateStr: string | undefined = parsed.meta?.date;
        let rawDate: number | null = null;
        let displayDate = "";

        if (obsDateStr) {
          rawDate = safeParseTimestamp(obsDateStr); // uses your helper
          if (rawDate) {
            displayDate = new Date(rawDate).toLocaleDateString();
          }
        } else if (parsed.updatedAt) {
          rawDate = parsed.updatedAt;
          displayDate = new Date(parsed.updatedAt).toLocaleDateString();
        }

        rows.push({
          id: parsed.id,
          teacherName: parsed.meta.teacherName,
          schoolName: parsed.meta.schoolName,
          campus: parsed.meta.campus,
          unit: parsed.meta.unit,
          lesson: parsed.meta.lesson,
          supportType: parsed.meta.supportType,
          date: displayDate,      // what you see on the card
          rawDate,                // numeric timestamp for sort/group
          status: parsed.status ?? "draft",
          progress,
          totalIndicators: total,
          statusColor,
        });
      } catch (err) {
        console.error("Error parsing stored observation:", key, err);
      }
    }

    // Sort by raw observation date (newest first)
    rows.sort((a, b) => (b.rawDate ?? 0) - (a.rawDate ?? 0));

    setObservations(rows);
  }, []);


  /* ------------------------------
     COMPUTE GROUPS
  --------------------------------- */
  const grouped = React.useMemo(() => {
    if (groupMode === "none") return null;

    if (groupMode === "month") {
      return groupBy(observations, (o) => formatMonthLabel(getMonthKey(o.rawDate)));
    }
    if (groupMode === "school") {
      return groupBy(observations, (o) => o.schoolName);
    }
    if (groupMode === "campus") {
      return groupBy(observations, (o) => o.campus);
    }

    return null;
  }, [observations, groupMode]);

  /* ------------------------------
     CARD RENDERER
  --------------------------------- */
  const renderRow = (obs: DashboardObservationRow) => (
    <button
      key={obs.id}
      type="button"
      className="obs-row"
      onClick={() =>
        onOpenObservation({
          id: obs.id,
          teacherName: obs.teacherName,
          schoolName: obs.schoolName,
          campus: obs.campus,
          unit: obs.unit,
          lesson: obs.lesson,
          supportType: obs.supportType,
        })
      }
    >
      <div
        className={`obs-status-dot ${
          obs.statusColor === "good"
            ? "obs-status-good"
            : obs.statusColor === "growth"
            ? "obs-status-growth"
            : "obs-status-mixed"
        }`}
      />
      <div className="obs-row-main">
        <div className="obs-teacher">{obs.teacherName}</div>
        <div className="obs-meta">
          {obs.schoolName} – {obs.campus} • Unit {obs.unit} – Lesson {obs.lesson} •{" "}
          {obs.supportType}
        </div>
        <div className="obs-tags">
          {obs.status === "draft" && <span className="obs-draft-tag">Draft</span>}
          <span className="obs-progress">
            {obs.progress} / {obs.totalIndicators} indicators
          </span>
        </div>
      </div>
      <div className="obs-date">{obs.date}</div>
    </button>
  );

  /* ------------------------------
     UI
  --------------------------------- */
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Observations</div>
          <div className="card-subtitle">
            Tap an observation to continue, or create a new one.
          </div>
        </div>

        <div className="toolbar">
          <div className="toolbar-group">
            <span>Group by</span>
            <select
              className="select"
              value={groupMode}
              onChange={(e) => setGroupMode(e.target.value as GroupMode)}
            >
              <option value="none">None</option>
              <option value="month">Month</option>
              <option value="school">School</option>
              <option value="campus">Campus</option>
            </select>
          </div>

          <div className="toolbar-group">
            <span>Sort</span>
            <select className="select">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="teacher-az">Teacher A–Z</option>
              <option value="teacher-za">Teacher Z–A</option>
            </select>
          </div>
        </div>
      </div>

      <div className="obs-list">
        {groupMode === "none" || !grouped
          ? observations.map(renderRow)
          : grouped.map((group) => (
              <div key={group.key} className="obs-group">
                <div className="obs-month-header">{group.key}</div>
                {group.items.map(renderRow)}
              </div>
            ))}
      </div>
    </div>
  );
};
