// src/App.tsx (FINAL COMPLETE WORKING CODE)
import React, { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext"; // Import AuthProvider here
import { AuthGate } from "./AuthGate"; 
import { supabase } from "./supabaseClient"; // Required for DB operations

// --- Screen Imports ---
import { DashboardShell } from "./DashboardShell"; 
import { ObservationWorkspaceShell } from "./ObservationWorkspaceShell";
import { TeachersScreen } from "./TeachersScreen";
import { SchoolsScreen } from "./SchoolsScreen";
import RedirectHandler from "./auth/RedirectHandler"; // The MSAL/Supabase Bridge
// NOTE: Assuming SCHOOL_MASTER_LIST is correctly imported/defined in your environment.
// import { SCHOOL_MASTER_LIST } from "./schoolMaster"; // Re-add if needed

/* ------------------------------
   TYPES (Consolidated and used throughout)
--------------------------------- */
type Screen = "dashboard" | "workspace" | "teachers" | "schools";
type SupportType = "Training" | "LVA" | "Visit";

interface NewObservationMeta {
  teacherName: string;
  schoolName: string;
  campus: string;
  unit: string;
  lesson: string;
  supportType: SupportType;
  date: string; // "YYYY-MM-DD"
  observationId?: string; // Supabase id
}

interface SelectedObservationMeta extends NewObservationMeta {
  id: string;
}

interface NewObservationFormProps {
  onCreate: (meta: NewObservationMeta) => void;
  onCancel: () => void;
  onOpenSchools: () => void;
}

interface TeacherOption {
  id: string;
  name: string;
  email: string | null;
  school_name: string;
  campus: string;
  worksheet_url: string | null;
}

interface SchoolRow {
  id: string;
  trainer_id: string;
  school_name: string;
  campus_name: string;
  am_name: string | null;
  am_email: string | null;
  admin_name: string | null;
  admin_email: string | null;
  admin_phone: string | null;
  address_line1: string | null;
  city: string | null;
}

/* ------------------------------
   CONSTANTS
--------------------------------- */
const ADD_NEW_SCHOOL_OPTION = "__ADD_NEW_SCHOOL__";
// Placeholder for the SCHOOL_MASTER_LIST if the import is missing
const SCHOOL_MASTER_LIST = [
    { schoolName: "Sample School 1", campusName: "Main Campus" },
    { schoolName: "Sample School 2", campusName: "East Campus" }
];


/* ------------------------------
   NEW OBSERVATION FORM (Your Provided Component Logic)
--------------------------------- */
const NewObservationForm: React.FC<NewObservationFormProps> = ({
  onCreate,
  onCancel,
  onOpenSchools,
}) => {
  const todayISO = new Date().toISOString().slice(0, 10);
  
  // Use Supabase Native User property
  const { user } = useAuth();
  const trainerId = user?.id; // trainerId derived from the authenticated user ID

  const [teacherName, setTeacherName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [campus, setCampus] = useState("");
  const [unit, setUnit] = useState("");
  const [lesson, setLesson] = useState("");
  const [supportType, setSupportType] = useState<SupportType>("Visit");
  const [date, setDate] = useState<string>(todayISO);

  const [worksheetUrl, setWorksheetUrl] = useState("");
  const [autoCreatedTeacherMsg, setAutoCreatedTeacherMsg] = useState<
    string | null
  >(null);

  // Teachers
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [teachersError, setTeachersError] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  // Schools
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [schoolsError, setSchoolsError] = useState<string | null>(null);

  // Load teachers
  React.useEffect(() => {
    let cancelled = false;

    async function loadTeachers() {
      try {
        setTeachersLoading(true);
        setTeachersError(null);
        // FIX: The RLS on the teachers table should filter this by trainer_id implicitly.
        const { data, error } = await supabase
          .from("teachers")
          .select("id, name, email, school_name, campus, worksheet_url")
          .order("name", { ascending: true });

        if (error) {
          console.error("[DB] load teachers error", error);
          if (!cancelled) setTeachersError(error.message);
          return;
        }

        if (!cancelled && data) {
          setTeachers(data as TeacherOption[]);
        }
      } finally {
        if (!cancelled) setTeachersLoading(false);
      }
    }

    void loadTeachers();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load schools for this trainer
  React.useEffect(() => {
    if (!trainerId) return;

    let cancelled = false;

    async function loadSchools() {
      try {
        setSchoolsLoading(true);
        setSchoolsError(null);
        // FIX: Use trainerId to fetch only the current user's schools
        const { data, error } = await supabase
          .from("schools")
          .select("*")
          .eq("trainer_id", trainerId)
          .order("school_name", { ascending: true })
          .order("campus_name", { ascending: true });

        if (error) {
          console.error("[DB] load schools error", error);
          if (!cancelled) setSchoolsError(error.message);
          return;
        }

        if (!cancelled && data) {
          setSchools(data as SchoolRow[]);
        }
      } finally {
        if (!cancelled) setSchoolsLoading(false);
      }
    }

    void loadSchools();
    return () => {
      cancelled = true;
    };
  }, [trainerId]);

  // Options: school + campus
  const schoolOptions = React.useMemo(() => {
    const names = (schools.length
      ? schools.map((s) => s.school_name)
      : SCHOOL_MASTER_LIST.map((s) => s.schoolName)
    ).filter(Boolean);

    return Array.from(new Set(names)).sort();
  }, [schools]);

  const campusOptions = React.useMemo(() => {
    if (!schoolName) return [];

    if (schools.length) {
      const campuses = schools
        .filter((s) => s.school_name === schoolName)
        .map((s) => s.campus_name)
        .filter(Boolean);

      return Array.from(new Set(campuses));
    }

    return SCHOOL_MASTER_LIST.filter((s) => s.schoolName === schoolName)
      .map((s) => s.campusName)
      .filter((v, i, arr) => arr.indexOf(v) === i);
  }, [schoolName, schools]);

  const handleSelectTeacher = (id: string) => {
    setSelectedTeacherId(id);
    setAutoCreatedTeacherMsg(null);

    if (!id) return;

    const t = teachers.find((x) => x.id === id);
    if (!t) return;

    setTeacherName(t.name);
    setSchoolName(t.school_name);
    setCampus(t.campus);
    setWorksheetUrl(t.worksheet_url ?? "");
  };

  const handleSchoolChange = (value: string) => {
    if (value === ADD_NEW_SCHOOL_OPTION) {
      onCancel();
      void onOpenSchools();
      return;
    }

    setSchoolName(value);
    setCampus("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!trainerId) {
      alert("Missing trainer id – please sign out and sign in again.");
      return;
    }

    if (!teacherName || !schoolName || !campus || !unit || !lesson || !date) {
      alert("Please fill teacher, school, campus, unit, lesson, and date.");
      return;
    }

    let teacherId = selectedTeacherId;
    setAutoCreatedTeacherMsg(null);

    // 1) If no teacher selected, create one
    if (!teacherId) {
      try {
        const cleanUrl = worksheetUrl.trim() || null;

        const { data, error } = await supabase
          .from("teachers")
          .insert({
            trainer_id: trainerId,
            name: teacherName.trim(),
            email: null,
            school_name: schoolName,
            campus,
            worksheet_url: cleanUrl,
          })
          .select("id, worksheet_url")
          .single();

        if (error) {
          console.error("[DB] create teacher from observation error", error);
          alert("Could not create teacher in the database.");
          return;
        }

        teacherId = data.id;

        setTeachers((prev) => [
          ...prev,
          {
            id: data.id,
            name: teacherName.trim(),
            email: null,
            school_name: schoolName,
            campus,
            worksheet_url: data.worksheet_url ?? null,
          },
        ]);
        setSelectedTeacherId(data.id);
        setWorksheetUrl(data.worksheet_url ?? "");

        setAutoCreatedTeacherMsg(
          `New teacher saved: ${teacherName.trim()} — ${schoolName} (${campus})`
        );
      } catch (err) {
        console.error("[DB] unexpected error creating teacher", err);
        alert("Unexpected error creating teacher.");
        return;
      }
    }

    if (!teacherId) {
      alert("Could not determine teacher record. Please try again.");
      return;
    }

    // 2) Insert observation
    const meta = {
      teacherName,
      schoolName,
      campus,
      unit,
      lesson,
      supportType,
      date,
    };

    const { data: obs, error: obsError } = await supabase
      .from("observations")
      .insert({
        trainer_id: trainerId,
        teacher_id: teacherId,
        status: "draft",
        meta,
        indicators: [],
        observation_date: date,
      })
      .select("id")
      .single();

    if (obsError) {
      console.error("[DB] create observation error", obsError);
      alert(`Could not save observation: ${obsError.message}`);
      return;
    }

    onCreate({
      observationId: obs.id,
      ...meta,
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
          {/* Form fields */}
          
          <div className="form-row">
            <label>Existing teacher (optional)</label>
            <select
              className="select"
              value={selectedTeacherId}
              onChange={(e) => handleSelectTeacher(e.target.value)}
              disabled={teachersLoading || !!teachersError}
            >
              <option value="">
                {teachersLoading
                  ? "Loading teachers…"
                  : "Select teacher from your list…"}
              </option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.school_name} ({t.campus})
                </option>
              ))}
            </select>
            {teachersError && (
              <div className="field-error">
                Could not load teachers ({teachersError}). You can still
                type a new teacher below.
              </div>
            )}
            <div className="hint">
              Pick an existing teacher, or leave this blank and type a
              new one.
            </div>
            {autoCreatedTeacherMsg && (
              <div className="hint">{autoCreatedTeacherMsg}</div>
            )}
          </div>

          <div className="form-row">
            <label>Teacher name</label>
            <input
              className="input"
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
            />
          </div>

          {/* Worksheet link */}
          <div className="form-row">
            <label>Worksheet link (optional)</label>
            <input
              className="input"
              type="url"
              value={worksheetUrl}
              onChange={(e) => setWorksheetUrl(e.target.value)}
              placeholder="Paste Excel / OneDrive link for this teacher…"
            />
            <div className="hint">
              Saved into the teacher record if a new teacher is created.
            </div>
          </div>

          {/* School / campus */}
          <div className="form-row">
            <label>School</label>
            <select
              className="select"
              value={schoolName}
              onChange={(e) => handleSchoolChange(e.target.value)}
            >
              <option value="">
                {schoolsLoading ? "Loading schools…" : "Select school…"}
              </option>
              {schoolOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              <option value={ADD_NEW_SCHOOL_OPTION}>+ Add new school…</option>
            </select>
            {schoolsError && (
              <div className="field-error">
                Could not load schools ({schoolsError}). Falling back to
                the built-in list.
              </div>
            )}
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

          {/* Unit / lesson / support / date */}
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
              onChange={(e) =>
                setSupportType(e.target.value as SupportType)
              }
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


/* ------------------------------
   MAIN APP SHELL (actual UI)
--------------------------------- */

const AppShell: React.FC = () => {
  // Use Supabase Native Session/User properties
  const { session, user, signOut, signInWithAzure } = useAuth();
  
  // trainerId is derived from the Supabase user object
  const trainerId = user?.id; 

  // ⚠️ FIX: Use the 'profile' data to display the user's name
  // This reads from the new SimpleUser structure defined in AuthContext.tsx
  const trainerLabel =
    user?.profile?.full_name ??
    user?.email ??
    "Trainer";
    
  const isAuthenticated = !!session;


  const [showNewObservationForm, setShowNewObservationForm] = useState(false);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [selectedObservation, setSelectedObservation] =
    useState<SelectedObservationMeta | null>(null);

  const goToDashboard = () => setScreen("dashboard");
  const goToTeachers = () => setScreen("teachers");
  const goToSchools = () => setScreen("schools");

  const handleCreateObservationFromForm = (meta: NewObservationMeta) => {
    const id = meta.observationId ?? `obs-${Date.now()}`;

    const fullMeta: SelectedObservationMeta = {
      id,
      ...meta,
    };

    setSelectedObservation(fullMeta);
    setShowNewObservationForm(false);
    setScreen("workspace");
  };

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
        </div>

        <div className="top-bar-right">
          {isAuthenticated ? (
            <>
              <span className="badge">Trainer: {trainerLabel}</span>

              <button className="btn-ghost" onClick={goToDashboard}>Dashboard</button>
              <button className="btn-ghost" onClick={goToTeachers}>Teachers</button>
              <button className="btn-ghost" onClick={goToSchools}>Schools</button>

              <button className="btn-ghost" type="button" onClick={signOut}>
                Sign out
              </button>

              <button
                className="btn btn-primary"
                type="button"
                onClick={() => {
                  if (!trainerId) {
                    alert("You’re signed in, but trainer id is missing. Please refresh.");
                    return;
                  }
                  setShowNewObservationForm(true);
                }}
              >
                New Observation
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={signInWithAzure}
            >
              Sign in with Microsoft
            </button>
          )}
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

        {screen === "teachers" && <TeachersScreen />}

        {screen === "schools" && <SchoolsScreen />}
      </main>

      {showNewObservationForm && (
        <NewObservationForm
          onCancel={() => setShowNewObservationForm(false)}
          onCreate={handleCreateObservationFromForm}
          onOpenSchools={goToSchools}
        />
      )}
    </div>
  );
};


/* ------------------------------
   ROOT APP WITH ROUTES
--------------------------------- */

const App: React.FC = () => {
  // NOTE: AuthProvider must be imported from "./auth/AuthContext"
  return (
    <AuthProvider>
      <Routes>
        {/* ⚠️ CRITICAL: Route the MSAL/Supabase redirect path to the handler component */}
        <Route path="/auth/redirect" element={<RedirectHandler />} />

        {/* Everything else is wrapped by the AuthGate */}
        <Route path="/*" element={<AuthGate><AppShell /></AuthGate>} />
      </Routes>
    </AuthProvider>
  );
};

export default App;