// src/TeachersScreen.tsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import type { FormEvent } from "react";

import { useAuth } from "./auth/AuthContext";
import {
  fetchTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  type TeacherRow,
} from "./db/teachers";
import { SCHOOL_MASTER_LIST } from "./schoolMaster";

type TeacherFormState = {
  id?: string;
  name: string;
  email: string;
  school_name: string;
  campus: string;
  worksheet_url: string;
};

export const TeachersScreen: React.FC = () => {
  const { user } = useAuth();

  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [form, setForm] = useState<TeacherFormState>({
    name: "",
    email: "",
    school_name: "",
    campus: "",
    worksheet_url: "",
  });

  // ---------- Helpers for school / campus options ----------

  const schoolOptions = useMemo(
    () =>
      Array.from(new Set(SCHOOL_MASTER_LIST.map((s) => s.schoolName))).sort(),
    []
  );

  const campusOptions = useMemo(() => {
    if (!form.school_name) return [] as string[];

    const fromMaster = SCHOOL_MASTER_LIST
      .filter((s) => s.schoolName === form.school_name)
      .map((s) => s.campusName);

    const uniqueMaster = Array.from(new Set(fromMaster));

    // Ensure the current campus (when editing) still appears
    if (
      form.campus &&
      !uniqueMaster.includes(form.campus) &&
      !form.campus.startsWith("Select ")
    ) {
      return [form.campus, ...uniqueMaster];
    }

    return uniqueMaster;
  }, [form.school_name, form.campus]);

  // ---------- Load teachers from DB ----------

  const loadTeachers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTeachers();
      setTeachers(data);
    } catch (err: any) {
      console.error("[DB] Could not load teachers", err);
      setError("Could not load teachers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  // ---------- Filtering ----------

  const filteredTeachers = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return teachers;

    return teachers.filter((t) => {
      return (
        t.name.toLowerCase().includes(q) ||
        t.school_name.toLowerCase().includes(q) ||
        t.campus.toLowerCase().includes(q) ||
        (t.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [teachers, searchText]);

  // ---------- Modal handlers ----------

  const openNewModal = () => {
    setEditingTeacherId(null);
    setForm({
      name: "",
      email: "",
      school_name: "",
      campus: "",
      worksheet_url: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (row: TeacherRow) => {
    setEditingTeacherId(row.id);
    setForm({
      id: row.id,
      name: row.name,
      email: row.email ?? "",
      school_name: row.school_name,
      campus: row.campus,
      worksheet_url: row.worksheet_url ?? "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleFormChange = (
    field: keyof TeacherFormState,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      alert("You must be signed in to manage teachers.");
      return;
    }

    if (!form.name.trim() || !form.school_name || !form.campus) {
      alert("Please enter teacher name, school, and campus.");
      return;
    }

    try {
      if (editingTeacherId) {
        // Update existing teacher
        const updated = await updateTeacher(editingTeacherId, {
          name: form.name.trim(),
          email: form.email.trim() || null,
          school_name: form.school_name,
          campus: form.campus,
          worksheet_url: form.worksheet_url.trim() || null,
        });

        setTeachers((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
      } else {
        // Create new teacher
        const created = await createTeacher(user.id, {
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          school_name: form.school_name,
          campus: form.campus,
          worksheet_url: form.worksheet_url.trim() || undefined,
        });

        setTeachers((prev) => [...prev, created].sort((a, b) =>
          a.name.localeCompare(b.name)
        ));
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error("[DB] Save teacher failed", err);
      alert("Could not save teacher. Please try again.");
    }
  };

  const handleDelete = async (row: TeacherRow) => {
    const ok = window.confirm(
      `Delete teacher "${row.name}"? This cannot be undone.`
    );
    if (!ok) return;

    try {
      await deleteTeacher(row.id);
      setTeachers((prev) => prev.filter((t) => t.id !== row.id));
    } catch (err: any) {
      console.error("[DB] Delete teacher failed", err);
      alert("Could not delete teacher.");
    }
  };

  // ---------- Render ----------

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title">Teachers</div>
          <div className="card-subtitle">
            Manage your teacher list and worksheet links.
          </div>
        </div>

        <div className="toolbar">
          <div className="toolbar-group">
            <span>Search</span>
            <input
              className="input search-input"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Teacher, school, campus…"
            />
          </div>

          <div className="toolbar-group">
            <button
              type="button"
              className="btn btn-primary"
              onClick={openNewModal}
            >
              Add teacher
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: "8px 16px", color: "#f97373", fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 16, fontSize: 14 }}>Loading teachers…</div>
      ) : filteredTeachers.length === 0 ? (
        <div style={{ padding: 16, fontSize: 14 }}>
          No teachers yet. Click <strong>Add teacher</strong> to create your
          list.
        </div>
      ) : (
        <div className="teachers-table-wrapper">
          <table className="teachers-table">
            <thead>
              <tr>
                <th>Teacher</th>
                <th>School</th>
                <th>Campus</th>
                <th>Email</th>
                <th>Worksheet link</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.school_name}</td>
                  <td>{t.campus}</td>
                  <td>{t.email}</td>
                  <td>
                    {t.worksheet_url ? (
                      <a
                        href={t.worksheet_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                    ) : (
                      <span style={{ opacity: 0.6 }}>Not set</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      className="btn btn-small"
                      onClick={() => openEditModal(t)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-small"
                      style={{ marginLeft: 8 }}
                      onClick={() => handleDelete(t)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-panel">
            <div className="modal-header">
              <div className="modal-title">
                {editingTeacherId ? "Edit teacher" : "Add teacher"}
              </div>
              <button type="button" className="btn" onClick={closeModal}>
                ×
              </button>
            </div>

            <form className="modal-body" onSubmit={handleSubmit}>
              <div className="form-row">
                <label>Teacher name</label>
                <input
                  className="input"
                  type="text"
                  value={form.name}
                  onChange={(e) => handleFormChange("name", e.target.value)}
                />
              </div>

              <div className="form-row">
                <label>Email</label>
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleFormChange("email", e.target.value)}
                  placeholder="teacher@example.com"
                />
              </div>

              <div className="form-row">
                <label>School</label>
                <select
                  className="select"
                  value={form.school_name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      school_name: value,
                      campus: "", // reset campus when school changes
                    }));
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
                  value={form.campus}
                  onChange={(e) => handleFormChange("campus", e.target.value)}
                  disabled={!form.school_name}
                >
                  <option value="">Select campus…</option>
                  {campusOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <label>Worksheet link (URL)</label>
                <input
                  className="input"
                  type="url"
                  value={form.worksheet_url}
                  onChange={(e) =>
                    handleFormChange("worksheet_url", e.target.value)
                  }
                  placeholder="https://..."
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTeacherId ? "Save changes" : "Create teacher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};