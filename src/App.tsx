import React, { useState } from "react";
import { DashboardShell } from "./DashboardShell";
import { SCHOOL_MASTER_LIST } from "./schoolMaster";
import { ObservationWorkspaceShell } from "./ObservationWorkspaceShell";

type Screen = "dashboard" | "workspace";
type SupportType = "Training" | "LVA" | "Visit";

interface NewObservationMeta {
  teacherName: string;
  schoolName: string;
  campus: string;
  unit: string;
  lesson: string;
  supportType: SupportType;
  date: string; // "YYYY-MM-DD"
}

interface SelectedObservationMeta extends NewObservationMeta {
  id: string;
}

// Temporary demo observation
const MOCK_OBS: SelectedObservationMeta = {
  id: "demo-1",
  teacherName: "Daisy Nguyen",
  schoolName: "VSK Sunshine",
  campus: "Campus A",
  unit: "3",
  lesson: "2",
  supportType: "LVA",
  date: new Date().toISOString().slice(0, 10),
};

const App: React.FC = () => {
  const [showNewObservationForm, setShowNewObservationForm] = useState(false);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [selectedObservation, setSelectedObservation] =
    useState<SelectedObservationMeta | null>(MOCK_OBS);

  const goToDashboard = () => setScreen("dashboard");

  const handleCreateObservationFromForm = (meta: NewObservationMeta) => {
    const id = `obs-${Date.now()}`;
    const fullMeta: SelectedObservationMeta = { id, ...meta };
    setSelectedObservation(fullMeta);
    setShowNewObservationForm(false);
    setScreen("workspace");
  };

  // Called when user clicks a card in the Dashboard
  // Dashboard may or may not send a date yet → we fallback to today
  const openObservation = (obs: any) => {
    const withDate: SelectedObservationMeta = {
      id: obs.id,
      teacherName: obs.teacherName,
      schoolName: obs.schoolName,
      campus: obs.campus,
      unit: obs.unit,
      lesson: obs.lesson,
      supportType: obs.supportType,
      date: obs.date || new Date().toISOString().slice(0, 10),
    };
    setSelectedObservation(withDate);
    setScreen("workspace");
  };

  return (
    <div className="app-root">
      <header className="top-bar">
        <div className="top-bar-left">
          <div className="app-title">WebNotes • Teacher Observation</div>
          <span className="tag-pill">iPad • Pencil • Excel export</span>
        </div>
        <div className="top-bar-right">
          <span className="badge">Trainer: Brian</span>
          <button className="btn-ghost" onClick={goToDashboard}>
            Dashboard
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => setShowNewObservationForm(true)}
          >
            New Observation
          </button>
        </div>
      </header>

      <main className="app-shell">
        {screen === "dashboard" && (
          <DashboardShell onOpenObservation={openObservation} />
        )}

        {screen === "workspace" && selectedObservation && (
          <ObservationWorkspaceShell
            observationMeta={selectedObservation}
            onBack={goToDashboard}
          />
        )}
      </main>

      {showNewObservationForm && (
        <NewObservationForm
          onCancel={() => setShowNewObservationForm(false)}
          onCreate={handleCreateObservationFromForm}
        />
      )}
    </div>
  );
};

interface NewObservationFormProps {
  onCreate: (meta: NewObservationMeta) => void;
  onCancel: () => void;
}

const NewObservationForm: React.FC<NewObservationFormProps> = ({
  onCreate,
  onCancel,
}) => {
  const todayISO = new Date().toISOString().slice(0, 10);

  const [teacherName, setTeacherName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [campus, setCampus] = useState("");
  const [unit, setUnit] = useState("");
  const [lesson, setLesson] = useState("");
  const [supportType, setSupportType] = useState<SupportType>("Visit");
  const [date, setDate] = useState<string>(todayISO);

  // Unique school list
  const schoolOptions = React.useMemo(
    () =>
      Array.from(new Set(SCHOOL_MASTER_LIST.map((s) => s.schoolName))).sort(),
    []
  );

  // Campus options filtered by selected school
  const campusOptions = React.useMemo(
    () =>
      SCHOOL_MASTER_LIST.filter((s) => s.schoolName === schoolName)
        .map((s) => s.campusName)
        .filter((v, i, arr) => arr.indexOf(v) === i),
    [schoolName]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName || !schoolName || !campus || !unit || !lesson || !date) {
      alert("Please fill teacher, school, campus, unit, lesson, and date.");
      return;
    }

    onCreate({
      teacherName,
      schoolName,
      campus,
      unit,
      lesson,
      supportType,
      date,
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <div className="modal-header">
          <div className="modal-title">New observation</div>
          <button type="button" className="btn" onClick={onCancel}>
            ×
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>Teacher name</label>
            <input
              className="input"
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
            />
          </div>

          <div className="form-row">
            <label>School</label>
            <select
              className="select"
              value={schoolName}
              onChange={(e) => {
                setSchoolName(e.target.value);
                setCampus("");
              }}
            >
              <option value="">Select school…</option>
              {schoolOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>Campus</label>
            <select
              className="select"
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              disabled={!schoolName}
            >
              <option value="">Select campus…</option>
              {campusOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>Unit</label>
            <input
              className="input"
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. 5"
            />
          </div>

          <div className="form-row">
            <label>Lesson</label>
            <input
              className="input"
              type="text"
              value={lesson}
              onChange={(e) => setLesson(e.target.value)}
              placeholder="e.g. 3"
            />
          </div>

          <div className="form-row">
            <label>Support type</label>
            <select
              className="select"
              value={supportType}
              onChange={(e) => setSupportType(e.target.value as SupportType)}
            >
              <option value="Visit">Visit</option>
              <option value="LVA">LVA</option>
              <option value="Training">Training</option>
            </select>
          </div>

          <div className="form-row">
            <label>Date</label>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create & open
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;
