// app/consultation/[visitId]/ConsultationForm.tsx
// ✅ Client Component — "use client" is correct here, no Prisma usage

"use client"

import { useState } from "react"
import Link from "next/link"

/* ─── Types ─── */
interface Props {
  visitId: string
  department: string
  patientName: string
  patientAge: number
}

/* ─── Department field configs ─── */
const DEPT_FIELDS: Record<string, { icon: string; label: string; placeholder: string }[]> = {
  GENERAL_MEDICINE: [
    { icon: "🤒", label: "Primary Complaints",       placeholder: "Describe the primary complaints and symptom duration…" },
    { icon: "📋", label: "Past Medical History",      placeholder: "Relevant past medical history, allergies, medications…" },
    { icon: "🩺", label: "Examination Observations",  placeholder: "Basic examination findings, vitals, observations…" },
    { icon: "🔬", label: "Diagnosis",                 placeholder: "Provisional or confirmed diagnosis…" },
    { icon: "💊", label: "Treatment Advice",           placeholder: "Prescribed medications, dosage, lifestyle advice…" },
  ],
  PEDIATRICS: [
    { icon: "📏", label: "Child Growth Info",         placeholder: "Child's age, weight, height, development milestones…" },
    { icon: "👨‍👩‍👦", label: "Guardian Complaints",     placeholder: "Symptoms as reported by the guardian…" },
    { icon: "💉", label: "Immunization Notes",         placeholder: "Vaccination history, due immunizations…" },
    { icon: "💊", label: "Treatment Instructions",    placeholder: "Medication, dosage adjusted for child's weight…" },
    { icon: "📅", label: "Follow-up Instructions",    placeholder: "When to return, warning signs to watch for…" },
  ],
  GYNECOLOGY: [
    { icon: "🌸", label: "Menstrual / Pregnancy History", placeholder: "LMP, cycle regularity, obstetric history, gravida/para…" },
    { icon: "🤒", label: "Current Complaints",        placeholder: "Presenting complaints or concerns…" },
    { icon: "⚠️", label: "Risk Indicators",            placeholder: "Identified risk factors or red flags…" },
    { icon: "💬", label: "Advice",                     placeholder: "Clinical advice, counselling notes…" },
    { icon: "📅", label: "Follow-up Plan",             placeholder: "Next appointment, investigations ordered…" },
  ],
  ORTHOPEDICS: [
    { icon: "🦴", label: "Injury / Pain Description", placeholder: "Location, nature, onset, aggravating/relieving factors…" },
    { icon: "🚶", label: "Mobility Limitation",        placeholder: "Range of motion, weight-bearing status…" },
    { icon: "🔬", label: "Examination Findings",       placeholder: "Clinical tests, neurovascular status…" },
    { icon: "📡", label: "Investigations Required",    placeholder: "X-ray, MRI, blood work ordered…" },
    { icon: "💊", label: "Treatment Advice",            placeholder: "Conservative management, physiotherapy, surgical plan…" },
  ],
  ENT: [
    { icon: "👂", label: "Complaint Category",         placeholder: "Ear / Nose / Throat — primary site of complaint…" },
    { icon: "⏱",  label: "Duration & Severity",        placeholder: "How long, how severe, frequency of episodes…" },
    { icon: "🔭", label: "Examination Observations",   placeholder: "Otoscopy, rhinoscopy, laryngoscopy findings…" },
    { icon: "💊", label: "Medication Advice",           placeholder: "Prescribed medications and dosage…" },
    { icon: "🔧", label: "Procedural Advice",           placeholder: "Procedures advised or performed…" },
  ],
}

const DEPT_META: Record<string, { icon: string; label: string; color: string }> = {
  GENERAL_MEDICINE: { icon: "🩺", label: "General Medicine", color: "rgba(56,189,248,0.15)"  },
  PEDIATRICS:       { icon: "👶", label: "Pediatrics",       color: "rgba(251,191,36,0.12)"  },
  GYNECOLOGY:       { icon: "🌸", label: "Gynecology",       color: "rgba(244,114,182,0.12)" },
  ORTHOPEDICS:      { icon: "🦴", label: "Orthopedics",      color: "rgba(52,211,153,0.12)"  },
  ENT:              { icon: "👂", label: "ENT",              color: "rgba(167,139,250,0.12)" },
}

export function ConsultationForm({ visitId, department, patientName, patientAge }: Props) {
  const fields    = DEPT_FIELDS[department] ?? []
  const meta      = DEPT_META[department]   ?? { icon: "🏥", label: department, color: "rgba(56,189,248,0.12)" }

  const [values,    setValues]    = useState<Record<string, string>>(
    Object.fromEntries(fields.map(f => [f.label, ""]))
  )
  const [focused,   setFocused]   = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  const handleSave = async () => {
    setLoading(true)
    try {
      await fetch(`/api/consultation/${visitId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department, fields: values }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3500)
    } finally {
      setLoading(false)
    }
  }

  const filled   = fields.filter(f => values[f.label]?.trim()).length
  const progress = fields.length ? Math.round((filled / fields.length) * 100) : 0

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080c14",
      color: "#e8edf5",
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      backgroundImage:
        "linear-gradient(rgba(56,189,248,0.03) 1px,transparent 1px)," +
        "linear-gradient(90deg,rgba(56,189,248,0.03) 1px,transparent 1px)",
      backgroundSize: "48px 48px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=Syne:wght@700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }

        body::after {
          content:''; position:fixed; inset:0;
          background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px);
          pointer-events:none; z-index:9999;
        }

        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes orbFloat    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-18px)} }
        @keyframes pulseDot    { 0%,100%{box-shadow:0 0 4px #34d399} 50%{box-shadow:0 0 14px #34d399,0 0 24px rgba(52,211,153,0.3)} }
        @keyframes spin        { to{transform:rotate(360deg)} }
        @keyframes successPop  { 0%{opacity:0;transform:scale(0.88) translateY(6px)} 60%{transform:scale(1.02)} 100%{opacity:1;transform:scale(1) translateY(0)} }

        .field-card {
          background:rgba(13,19,33,0.88);
          border:1px solid rgba(56,189,248,0.12);
          border-radius:14px; padding:22px 24px;
          transition:border-color 0.25s, box-shadow 0.25s;
          animation:fadeSlideUp 0.45s ease both;
        }
        .field-card.focused-card {
          border-color:rgba(56,189,248,0.4);
          box-shadow:0 0 0 3px rgba(56,189,248,0.07), 0 12px 40px rgba(0,0,0,0.4);
        }

        .consult-textarea {
          width:100%; min-height:96px;
          background:rgba(8,12,20,0.7);
          border:1px solid rgba(56,189,248,0.1);
          border-radius:9px; padding:13px 15px;
          font-size:14px; line-height:1.65;
          color:#e8edf5; font-family:'DM Sans',sans-serif;
          outline:none; resize:vertical;
          transition:border-color 0.2s, box-shadow 0.2s;
          caret-color:#38bdf8;
        }
        .consult-textarea::placeholder { color:#4a5568; }
        .consult-textarea:focus {
          border-color:rgba(56,189,248,0.45);
          box-shadow:0 0 0 3px rgba(56,189,248,0.08);
          background:rgba(10,15,26,0.9);
        }
        .consult-textarea:not(:placeholder-shown):not(:focus) {
          border-color:rgba(52,211,153,0.25);
        }

        .save-btn {
          background:linear-gradient(135deg,#38bdf8,#0ea5e9);
          color:#080c14; padding:14px 36px;
          border-radius:10px; border:none;
          font-size:15px; font-weight:700;
          font-family:'DM Sans',sans-serif;
          cursor:pointer; transition:all 0.25s;
          position:relative; overflow:hidden;
          display:inline-flex; align-items:center; gap:10px;
        }
        .save-btn::before {
          content:''; position:absolute; inset:0;
          background:linear-gradient(135deg,rgba(255,255,255,0.18),transparent);
          opacity:0; transition:opacity 0.25s;
        }
        .save-btn:hover::before { opacity:1; }
        .save-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 14px 40px rgba(56,189,248,0.3); }
        .save-btn:disabled { opacity:0.65; cursor:not-allowed; }

        .tab-btn {
          padding:8px 18px; border-radius:8px;
          border:1px solid transparent; background:transparent;
          color:#8b9ab5; font-size:13px; font-weight:500;
          font-family:'DM Sans',sans-serif; cursor:pointer;
          transition:all 0.2s; display:flex; align-items:center; gap:7px; white-space:nowrap;
        }
        .tab-btn.active { background:rgba(56,189,248,0.1); border-color:rgba(56,189,248,0.3); color:#38bdf8; }
        .tab-btn:hover:not(.active) { color:#e8edf5; background:rgba(56,189,248,0.05); }

        .spinner { width:17px; height:17px; border:2px solid rgba(8,12,20,0.3); border-top-color:#080c14; border-radius:50%; animation:spin 0.7s linear infinite; }
        .nav-item { font-size:14px; color:#8b9ab5; cursor:pointer; transition:color 0.2s; }
        .nav-item:hover { color:#e8edf5; }
      `}</style>

      {/* Ambient orbs */}
      <div style={{ position:"fixed", width:420, height:420, background:"radial-gradient(circle,rgba(56,189,248,0.07) 0%,transparent 65%)", top:-40, right:"4%", borderRadius:"50%", pointerEvents:"none", animation:"orbFloat 9s ease-in-out infinite", zIndex:0 }} />
      <div style={{ position:"fixed", width:240, height:240, background:"radial-gradient(circle,rgba(14,165,233,0.05) 0%,transparent 70%)", bottom:60, left:"3%", borderRadius:"50%", pointerEvents:"none", animation:"orbFloat 7s 2s ease-in-out infinite", zIndex:0 }} />

      {/* ── Navbar ── */}
      <nav style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"16px 40px",
        background:"rgba(8,12,20,0.92)", backdropFilter:"blur(20px)",
        borderBottom:"1px solid rgba(56,189,248,0.1)",
        position:"sticky", top:0, zIndex:100,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:30, height:30, background:"linear-gradient(135deg,#38bdf8,#0ea5e9)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, boxShadow:"0 0 14px rgba(56,189,248,0.35)" }}>⚕</div>
          <span style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:700, color:"#e8edf5", letterSpacing:"-0.02em" }}>
            MediLingua <span style={{ color:"#38bdf8" }}>AI</span>
          </span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, background: meta.color, border:"1px solid rgba(56,189,248,0.2)", borderRadius:100, padding:"6px 14px" }}>
            <span style={{ fontSize:14 }}>{meta.icon}</span>
            <span style={{ fontSize:12, color:"#e8edf5", fontWeight:500 }}>{meta.label}</span>
          </div>
          <Link href="/doctor/dashboard" style={{ fontSize:13, color:"#8b9ab5", textDecoration:"none", display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:8, border:"1px solid rgba(56,189,248,0.12)", transition:"all 0.2s" }}>
            ← Back to Queue
          </Link>
        </div>
      </nav>

      {/* ── Page body ── */}
      <div style={{ maxWidth:800, margin:"0 auto", padding:"44px 24px 80px", position:"relative", zIndex:1 }}>

        {/* Patient banner */}
        <div style={{
          background:"rgba(13,19,33,0.9)", border:"1px solid rgba(56,189,248,0.15)",
          borderRadius:16, padding:"22px 28px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          flexWrap:"wrap", gap:16, marginBottom:32,
          animation:"fadeSlideUp 0.5s ease both",
          boxShadow:"0 0 0 1px rgba(56,189,248,0.04), 0 12px 40px rgba(0,0,0,0.4)",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ width:48, height:48, borderRadius:"50%", background:"linear-gradient(135deg,rgba(56,189,248,0.2),rgba(14,165,233,0.1))", border:"2px solid rgba(56,189,248,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>👤</div>
            <div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:800, color:"#e8edf5", letterSpacing:"-0.01em", marginBottom:4 }}>{patientName}</div>
              <div style={{ display:"flex", gap:16 }}>
                <span style={{ fontSize:13, color:"#8b9ab5" }}>Age <span style={{ color:"#e8edf5", fontWeight:500 }}>{patientAge}</span></span>
                <span style={{ fontSize:13, color:"#8b9ab5" }}>Dept <span style={{ color:"#38bdf8", fontWeight:500 }}>{meta.label}</span></span>
              </div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:22, fontWeight:700, color:"#38bdf8" }}>{progress}%</div>
              <div style={{ fontSize:11, color:"#4a5568", textTransform:"uppercase", letterSpacing:"0.08em" }}>Complete</div>
            </div>
            <div style={{ width:56, height:56, borderRadius:"50%", background:`conic-gradient(#38bdf8 ${progress * 3.6}deg, rgba(56,189,248,0.1) 0deg)`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow: progress > 0 ? "0 0 16px rgba(56,189,248,0.2)" : "none", transition:"all 0.4s ease" }}>
              <div style={{ width:42, height:42, borderRadius:"50%", background:"#0d1321", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                {progress === 100 ? "✅" : meta.icon}
              </div>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div style={{ display:"flex", gap:8, marginBottom:28, overflowX:"auto", paddingBottom:4, animation:"fadeSlideUp 0.5s 0.05s ease both" }}>
          {fields.map((f, i) => (
            <button key={f.label} className={`tab-btn${activeTab === i ? " active" : ""}`} onClick={() => setActiveTab(i)}>
              <span>{f.icon}</span>
              <span style={{ display:"flex", alignItems:"center", gap:5 }}>
                {f.label.split(" ").slice(0, 2).join(" ")}
                {values[f.label]?.trim() && <span style={{ width:6, height:6, background:"#34d399", borderRadius:"50%", display:"inline-block" }} />}
              </span>
            </button>
          ))}
        </div>

        {/* Active field */}
        {fields.length > 0 && (
          <div key={activeTab} className={`field-card${focused === fields[activeTab].label ? " focused-card" : ""}`} style={{ marginBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:9, fontSize:11, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase" as const, color:"#8b9ab5", marginBottom:12 }}>
              <span style={{ width:28, height:28, background:"rgba(56,189,248,0.1)", border:"1px solid rgba(56,189,248,0.2)", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>{fields[activeTab].icon}</span>
              {fields[activeTab].label}
              {values[fields[activeTab].label]?.trim() && <span style={{ marginLeft:"auto", fontSize:10, color:"#34d399" }}>✓ FILLED</span>}
            </div>
            <textarea
              className="consult-textarea"
              placeholder={fields[activeTab].placeholder}
              value={values[fields[activeTab].label] ?? ""}
              onChange={e => setValues(v => ({ ...v, [fields[activeTab].label]: e.target.value }))}
              onFocus={() => setFocused(fields[activeTab].label)}
              onBlur={() => setFocused(null)}
              rows={6}
            />
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:14 }}>
              <button onClick={() => setActiveTab(t => Math.max(0, t - 1))} disabled={activeTab === 0} style={{ background:"transparent", border:"1px solid rgba(56,189,248,0.15)", borderRadius:8, padding:"8px 16px", fontSize:13, color:"#8b9ab5", cursor: activeTab === 0 ? "not-allowed" : "pointer", fontFamily:"'DM Sans',sans-serif", transition:"all 0.2s", opacity: activeTab === 0 ? 0.4 : 1 }}>← Prev</button>
              {activeTab < fields.length - 1
                ? <button onClick={() => setActiveTab(t => t + 1)} style={{ background:"rgba(56,189,248,0.1)", border:"1px solid rgba(56,189,248,0.25)", borderRadius:8, padding:"8px 20px", fontSize:13, color:"#38bdf8", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600, transition:"all 0.2s" }}>Next →</button>
                : <span style={{ fontSize:12, color:"#34d399", display:"flex", alignItems:"center", gap:5 }}>✓ Last field</span>
              }
            </div>
          </div>
        )}

        {/* All fields summary */}
        <div style={{ background:"rgba(13,19,33,0.7)", border:"1px solid rgba(56,189,248,0.08)", borderRadius:14, padding:"18px 22px", marginBottom:28, animation:"fadeSlideUp 0.5s 0.1s ease both" }}>
          <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase" as const, color:"#4a5568", marginBottom:12 }}>All Fields</div>
          <div style={{ display:"flex", flexWrap:"wrap" as const, gap:8 }}>
            {fields.map((f, i) => (
              <button key={f.label} onClick={() => setActiveTab(i)} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 13px", borderRadius:8, background: values[f.label]?.trim() ? "rgba(52,211,153,0.08)" : "rgba(56,189,248,0.05)", border:`1px solid ${values[f.label]?.trim() ? "rgba(52,211,153,0.25)" : activeTab === i ? "rgba(56,189,248,0.3)" : "rgba(56,189,248,0.1)"}`, color: values[f.label]?.trim() ? "#34d399" : activeTab === i ? "#38bdf8" : "#8b9ab5", fontSize:12, fontFamily:"'DM Sans',sans-serif", fontWeight:500, cursor:"pointer", transition:"all 0.2s" }}>
                <span>{f.icon}</span>{f.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop:16, height:4, background:"rgba(56,189,248,0.08)", borderRadius:4, overflow:"hidden" }}>
            <div style={{ height:"100%", borderRadius:4, background:"linear-gradient(90deg,#38bdf8,#34d399)", width:`${progress}%`, transition:"width 0.4s ease", boxShadow: progress > 0 ? "0 0 8px rgba(56,189,248,0.4)" : "none" }} />
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
            <span style={{ fontSize:11, color:"#4a5568" }}>{filled} of {fields.length} fields filled</span>
            <span style={{ fontSize:11, color: progress === 100 ? "#34d399" : "#4a5568" }}>{progress}%</span>
          </div>
        </div>

        {/* Success toast */}
        {saved && (
          <div style={{ background:"rgba(52,211,153,0.1)", border:"1px solid rgba(52,211,153,0.3)", borderRadius:12, padding:"16px 20px", display:"flex", alignItems:"center", gap:12, marginBottom:24, animation:"successPop 0.4s ease both" }}>
            <span style={{ fontSize:20 }}>✅</span>
            <div>
              <div style={{ fontWeight:600, color:"#34d399", fontSize:14, marginBottom:2 }}>Consultation saved</div>
              <div style={{ fontSize:13, color:"#8b9ab5" }}>Notes have been stored securely.</div>
            </div>
          </div>
        )}

        {/* Save button */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap" as const, gap:16 }}>
          <button className="save-btn" onClick={handleSave} disabled={loading}>
            {loading ? <><span className="spinner" /> Saving…</> : <>💾 Save Consultation</>}
          </button>
          <p style={{ fontSize:12, color:"#4a5568" }}>Encrypted & stored securely · MediLingua AI © 2026</p>
        </div>
      </div>
    </div>
  )
}