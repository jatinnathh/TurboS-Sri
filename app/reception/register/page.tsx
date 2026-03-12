"use client"

import { useState, useRef, useEffect } from "react"

const DEPARTMENTS = [
  { value: "GENERAL_MEDICINE", label: "General Medicine", icon: "🩺" },
  { value: "PEDIATRICS",       label: "Pediatrics",       icon: "👶" },
  { value: "GYNECOLOGY",       label: "Gynecology",       icon: "🌸" },
  { value: "ORTHOPEDICS",      label: "Orthopedics",      icon: "🦴" },
  { value: "ENT",              label: "ENT",              icon: "👂" },
]

type Patient = {
  id: string
  name: string
  age: number
  gender: string
  phone: string
}

type Tab = "new" | "existing"

export default function RegisterPatient() {
  const [tab, setTab] = useState<Tab>("new")

  // ── New patient state ──
  const [name,       setName]       = useState("")
  const [age,        setAge]        = useState("")
  const [gender,     setGender]     = useState("Male")
  const [phone,      setPhone]      = useState("")
  const [department, setDepartment] = useState("GENERAL_MEDICINE")
  const [loading,    setLoading]    = useState(false)
  const [success,    setSuccess]    = useState<string | null>(null)
  const [focused,    setFocused]    = useState<string | null>(null)
  const [errors,     setErrors]     = useState<Record<string, string>>({})

  // ── Existing patient state ──
  const [searchQuery,     setSearchQuery]     = useState("")
  const [searchResults,   setSearchResults]   = useState<Patient[]>([])
  const [searching,       setSearching]       = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [existingDept,    setExistingDept]    = useState("GENERAL_MEDICINE")
  const [bookingLoading,  setBookingLoading]  = useState(false)
  const [searchFocused,   setSearchFocused]   = useState(false)
  const [noResults,       setNoResults]       = useState(false)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Search patients ──
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      setNoResults(false)
      return
    }
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(async () => {
      setSearching(true)
      setNoResults(false)
      try {
        const res = await fetch(`/api/patient/search?q=${encodeURIComponent(searchQuery.trim())}`)
        const data = await res.json()
        setSearchResults(data.patients ?? [])
        setNoResults((data.patients ?? []).length === 0)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 350)
  }, [searchQuery])

  // ── Validate new patient ──
  const validate = () => {
    const e: Record<string, string> = {}
    if (!name.trim())               e.name  = "Patient name is required"
    if (!age || isNaN(Number(age)) || Number(age) < 0 || Number(age) > 130)
                                    e.age   = "Enter a valid age (0–130)"
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10)
                                    e.phone = "Enter a valid 10-digit phone number"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Register new patient ──
  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      await fetch("/api/patient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, age: Number(age), gender, phone, department }),
      })
      setSuccess("Patient registered & added to OPD queue successfully.")
      setTimeout(() => setSuccess(null), 4000)
      setName(""); setAge(""); setGender("Male"); setPhone(""); setDepartment("GENERAL_MEDICINE")
      setErrors({})
    } finally {
      setLoading(false)
    }
  }

  // ── Book appointment for existing patient ──
  const handleBookAppointment = async () => {
    if (!selectedPatient) return
    setBookingLoading(true)
    try {
      await fetch("/api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: selectedPatient.id, department: existingDept }),
      })
      setSuccess(`Appointment booked for ${selectedPatient.name} in ${DEPARTMENTS.find(d => d.value === existingDept)?.label}.`)
      setTimeout(() => setSuccess(null), 4000)
      setSelectedPatient(null)
      setSearchQuery("")
      setSearchResults([])
      setExistingDept("GENERAL_MEDICINE")
    } finally {
      setBookingLoading(false)
    }
  }

  const inputStyle = (field: string): React.CSSProperties => ({
    width: "100%",
    background: "rgba(8,12,20,0.8)",
    border: `1px solid ${errors[field] ? "rgba(248,113,113,0.5)" : focused === field ? "rgba(56,189,248,0.6)" : "rgba(56,189,248,0.14)"}`,
    borderRadius: 10,
    padding: "13px 16px 13px 44px",
    fontSize: 15,
    color: "#e8edf5",
    fontFamily: "'DM Sans', sans-serif",
    outline: "none",
    transition: "border-color 0.25s, box-shadow 0.25s",
    boxShadow: focused === field ? "0 0 0 3px rgba(56,189,248,0.1)" : "none",
    caretColor: "#38bdf8",
  })

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080c14",
      color: "#e8edf5",
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      backgroundImage: "linear-gradient(rgba(56,189,248,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,0.03) 1px,transparent 1px)",
      backgroundSize: "48px 48px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::placeholder { color: #4a5568 !important; }
        option { background: #0d1321; color: #e8edf5; }

        @keyframes fadeSlideUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes successPop { 0% { opacity:0; transform:scale(0.85) translateY(8px); } 60% { transform:scale(1.03) translateY(-2px); } 100% { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes slideDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes orbFloat { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-16px); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }

        .field-row { animation: fadeSlideUp 0.5s ease both; }
        .field-row:nth-child(1) { animation-delay:0.05s; }
        .field-row:nth-child(2) { animation-delay:0.10s; }
        .field-row:nth-child(3) { animation-delay:0.15s; }
        .field-row:nth-child(4) { animation-delay:0.20s; }
        .field-row:nth-child(5) { animation-delay:0.25s; }

        .submit-btn {
          width:100%; background:linear-gradient(135deg,#38bdf8,#0ea5e9);
          color:#080c14; padding:14px; border-radius:10px; border:none;
          font-size:15px; font-weight:700; font-family:'DM Sans',sans-serif;
          cursor:pointer; transition:all 0.25s; position:relative; overflow:hidden; letter-spacing:0.02em;
        }
        .submit-btn::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,0.18),transparent); opacity:0; transition:opacity 0.25s; }
        .submit-btn:hover::before { opacity:1; }
        .submit-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 14px 40px rgba(56,189,248,0.28),0 0 0 1px rgba(56,189,248,0.3); }
        .submit-btn:disabled { opacity:0.65; cursor:not-allowed; }

        .book-btn {
          width:100%; background:linear-gradient(135deg,#34d399,#059669);
          color:#080c14; padding:14px; border-radius:10px; border:none;
          font-size:15px; font-weight:700; font-family:'DM Sans',sans-serif;
          cursor:pointer; transition:all 0.25s; position:relative; overflow:hidden; letter-spacing:0.02em;
        }
        .book-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 14px 40px rgba(52,211,153,0.28); }
        .book-btn:disabled { opacity:0.65; cursor:not-allowed; }

        .gender-btn {
          flex:1; padding:11px 16px; border-radius:9px;
          border:1px solid rgba(56,189,248,0.14); background:rgba(8,12,20,0.8);
          color:#8b9ab5; font-family:'DM Sans',sans-serif; font-size:14px; font-weight:500;
          cursor:pointer; transition:all 0.2s; display:flex; align-items:center; justify-content:center; gap:7px;
        }
        .gender-btn.active { border-color:rgba(56,189,248,0.5); background:rgba(56,189,248,0.1); color:#38bdf8; box-shadow:0 0 0 3px rgba(56,189,248,0.08); }
        .gender-btn:hover:not(.active) { border-color:rgba(56,189,248,0.28); color:#e8edf5; }

        .dept-chip {
          padding:9px 16px; border-radius:8px; border:1px solid rgba(56,189,248,0.14);
          background:rgba(8,12,20,0.8); color:#8b9ab5; font-family:'DM Sans',sans-serif;
          font-size:13px; font-weight:500; cursor:pointer; transition:all 0.2s;
          display:flex; align-items:center; gap:6px; white-space:nowrap;
        }
        .dept-chip.active { border-color:rgba(56,189,248,0.5); background:rgba(56,189,248,0.1); color:#38bdf8; }
        .dept-chip:hover:not(.active) { border-color:rgba(56,189,248,0.25); color:#e8edf5; }

        .dept-chip-green.active { border-color:rgba(52,211,153,0.5); background:rgba(52,211,153,0.1); color:#34d399; }
        .dept-chip-green:hover:not(.active) { border-color:rgba(52,211,153,0.25); color:#e8edf5; }

        .tab-btn {
          flex:1; padding:12px 20px; border:none; background:transparent;
          font-family:'DM Sans',sans-serif; font-size:14px; font-weight:600;
          cursor:pointer; transition:all 0.25s; border-radius:10px;
          display:flex; align-items:center; justify-content:center; gap:8px;
        }
        .tab-btn.active { background:rgba(56,189,248,0.12); color:#38bdf8; }
        .tab-btn:not(.active) { color:#4a5568; }
        .tab-btn:hover:not(.active) { color:#8b9ab5; background:rgba(56,189,248,0.05); }

        .patient-card {
          padding:14px 16px; border-radius:10px; cursor:pointer;
          border:1px solid rgba(56,189,248,0.1); background:rgba(8,12,20,0.6);
          transition:all 0.2s; display:flex; align-items:center; gap:12px;
        }
        .patient-card:hover { border-color:rgba(56,189,248,0.35); background:rgba(56,189,248,0.06); }
        .patient-card.selected { border-color:rgba(52,211,153,0.5); background:rgba(52,211,153,0.08); }

        .error-msg { font-size:12px; color:#f87171; margin-top:6px; animation:slideDown 0.2s ease; }
        .label { display:block; font-size:11px; font-weight:600; letter-spacing:0.09em; text-transform:uppercase; color:#8b9ab5; margin-bottom:8px; }
        .spinner { width:17px; height:17px; border:2px solid rgba(8,12,20,0.3); border-top-color:#080c14; border-radius:50%; animation:spin 0.7s linear infinite; display:inline-block; }
        .spinner-sm { width:14px; height:14px; border:2px solid rgba(56,189,248,0.2); border-top-color:#38bdf8; border-radius:50%; animation:spin 0.7s linear infinite; display:inline-block; }
        .pulse-dot { animation: pulse 1.5s ease-in-out infinite; }
      `}</style>

      {/* Ambient orbs */}
      <div style={{ position:"fixed", width:440, height:440, background:"radial-gradient(circle,rgba(56,189,248,0.07) 0%,transparent 65%)", top:-60, right:"5%", borderRadius:"50%", pointerEvents:"none", animation:"orbFloat 9s ease-in-out infinite", zIndex:0 }} />
      <div style={{ position:"fixed", width:260, height:260, background:"radial-gradient(circle,rgba(14,165,233,0.05) 0%,transparent 70%)", bottom:80, left:"3%", borderRadius:"50%", pointerEvents:"none", animation:"orbFloat 7s 2s ease-in-out infinite", zIndex:0 }} />

      {/* ── Topbar ── */}
      <nav style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"18px 40px",
        background:"rgba(8,12,20,0.9)", backdropFilter:"blur(20px)",
        borderBottom:"1px solid rgba(56,189,248,0.1)",
        position:"sticky", top:0, zIndex:100,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, background:"linear-gradient(135deg,#38bdf8,#0ea5e9)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, boxShadow:"0 0 16px rgba(56,189,248,0.35)" }}>⚕</div>
          <span style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700, color:"#e8edf5", letterSpacing:"-0.02em" }}>
            MediLingua <span style={{ color:"#38bdf8" }}>AI</span>
          </span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(52,211,153,0.08)", border:"1px solid rgba(52,211,153,0.2)", borderRadius:100, padding:"6px 14px" }}>
          <span style={{ width:6, height:6, background:"#34d399", borderRadius:"50%", display:"inline-block", boxShadow:"0 0 6px #34d399" }} />
          <span style={{ fontSize:12, color:"#34d399", fontWeight:500 }}>Reception — OPD</span>
        </div>
      </nav>

      {/* ── Page content ── */}
      <div style={{ maxWidth:720, margin:"0 auto", padding:"48px 24px 80px", position:"relative", zIndex:1 }}>

        {/* Page header */}
        <div style={{ marginBottom:36, animation:"fadeSlideUp 0.5s ease both" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
            <div style={{ width:40, height:40, background:"rgba(56,189,248,0.1)", border:"1px solid rgba(56,189,248,0.3)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🏥</div>
            <span style={{ fontSize:11, fontWeight:600, letterSpacing:"0.14em", textTransform:"uppercase", color:"#38bdf8" }}>OPD Management</span>
          </div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(24px,4vw,34px)", fontWeight:800, letterSpacing:"-0.02em", color:"#e8edf5", lineHeight:1.1, marginBottom:10 }}>
            Patient Registration
          </h1>
          <p style={{ fontSize:14, color:"#8b9ab5", lineHeight:1.6 }}>
            Register a new patient or find an existing patient to book an appointment.
          </p>
        </div>

        {/* ── Success toast ── */}
        {success && (
          <div style={{ background:"rgba(52,211,153,0.1)", border:"1px solid rgba(52,211,153,0.35)", borderRadius:12, padding:"16px 20px", display:"flex", alignItems:"center", gap:12, marginBottom:28, animation:"successPop 0.4s ease both" }}>
            <span style={{ fontSize:20 }}>✅</span>
            <div>
              <div style={{ fontWeight:600, color:"#34d399", fontSize:14, marginBottom:2 }}>Success</div>
              <div style={{ fontSize:13, color:"#8b9ab5" }}>{success}</div>
            </div>
          </div>
        )}

        {/* ── Tab switcher ── */}
        <div style={{ display:"flex", gap:4, background:"rgba(13,19,33,0.9)", border:"1px solid rgba(56,189,248,0.1)", borderRadius:14, padding:4, marginBottom:28 }}>
          <button className={`tab-btn${tab === "new" ? " active" : ""}`} onClick={() => { setTab("new"); setSelectedPatient(null); setSearchQuery(""); setSearchResults([]); }}>
            <span>➕</span> New Patient
          </button>
          <button className={`tab-btn${tab === "existing" ? " active" : ""}`} onClick={() => { setTab("existing"); setErrors({}); }}>
            <span>🔍</span> Existing Patient
          </button>
        </div>

        {/* ── Form card ── */}
        <div style={{ background:"rgba(13,19,33,0.9)", border:"1px solid rgba(56,189,248,0.12)", borderRadius:20, padding:"36px 32px", backdropFilter:"blur(20px)", boxShadow:"0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(56,189,248,0.06)" }}>

          {/* ════════════════ NEW PATIENT TAB ════════════════ */}
          {tab === "new" && (
            <div style={{ display:"flex", flexDirection:"column", gap:24 }}>

              {/* Name */}
              <div className="field-row">
                <label className="label">Full Name</label>
                <div style={{ position:"relative" }}>
                  <input
                    style={inputStyle("name")}
                    placeholder="e.g. Ravi Kumar"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onFocus={() => setFocused("name")}
                    onBlur={() => setFocused(null)}
                  />
                  <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:16, opacity: focused==="name" ? 1 : 0.4, transition:"opacity 0.2s" }}>👤</span>
                </div>
                {errors.name && <div className="error-msg">⚠ {errors.name}</div>}
              </div>

              {/* Age + Gender */}
              <div className="field-row" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
                <div>
                  <label className="label">Age</label>
                  <div style={{ position:"relative" }}>
                    <input
                      style={inputStyle("age")}
                      placeholder="e.g. 34"
                      type="number" min={0} max={130}
                      value={age}
                      onChange={e => setAge(e.target.value)}
                      onFocus={() => setFocused("age")}
                      onBlur={() => setFocused(null)}
                    />
                    <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:16, opacity: focused==="age" ? 1 : 0.4, transition:"opacity 0.2s" }}>🎂</span>
                  </div>
                  {errors.age && <div className="error-msg">⚠ {errors.age}</div>}
                </div>
                <div>
                  <label className="label">Gender</label>
                  <div style={{ display:"flex", gap:8 }}>
                    {[{ label:"♂ Male", val:"Male" }, { label:"♀ Female", val:"Female" }].map(g => (
                      <button key={g.val} className={`gender-btn${gender === g.val ? " active" : ""}`} onClick={() => setGender(g.val)} type="button">{g.label}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Phone */}
              <div className="field-row">
                <label className="label">Phone Number</label>
                <div style={{ position:"relative" }}>
                  <input
                    style={inputStyle("phone")}
                    placeholder="e.g. 9876543210"
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onFocus={() => setFocused("phone")}
                    onBlur={() => setFocused(null)}
                  />
                  <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:16, opacity: focused==="phone" ? 1 : 0.4, transition:"opacity 0.2s" }}>📱</span>
                </div>
                {errors.phone && <div className="error-msg">⚠ {errors.phone}</div>}
              </div>

              {/* Department */}
              <div className="field-row">
                <label className="label">Department</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginTop:2 }}>
                  {DEPARTMENTS.map(d => (
                    <button key={d.value} className={`dept-chip${department === d.value ? " active" : ""}`} onClick={() => setDepartment(d.value)} type="button">
                      <span>{d.icon}</span> {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ borderTop:"1px solid rgba(56,189,248,0.08)", margin:"4px 0" }} />

              {/* Preview */}
              {(name || age || phone) && (
                <div style={{ background:"rgba(56,189,248,0.05)", border:"1px solid rgba(56,189,248,0.12)", borderRadius:12, padding:"16px 18px", animation:"slideDown 0.3s ease" }}>
                  <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", color:"#38bdf8", marginBottom:10 }}>Preview</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:"8px 28px" }}>
                    {[
                      { label:"Name",   val: name || "—" },
                      { label:"Age",    val: age ? `${age} yrs` : "—" },
                      { label:"Gender", val: gender },
                      { label:"Phone",  val: phone || "—" },
                      { label:"Dept",   val: DEPARTMENTS.find(d => d.value === department)?.label || department },
                    ].map(r => (
                      <div key={r.label}>
                        <div style={{ fontSize:11, color:"#4a5568", textTransform:"uppercase", letterSpacing:"0.07em" }}>{r.label}</div>
                        <div style={{ fontSize:14, color:"#e8edf5", fontWeight:500, marginTop:2 }}>{r.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button className="submit-btn" onClick={handleSubmit} disabled={loading} style={{ marginTop:4 }}>
                {loading ? (
                  <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
                    <span className="spinner" /> Registering patient…
                  </span>
                ) : "Register Patient →"}
              </button>
            </div>
          )}

          {/* ════════════════ EXISTING PATIENT TAB ════════════════ */}
          {tab === "existing" && (
            <div style={{ display:"flex", flexDirection:"column", gap:24 }}>

              {/* Search box */}
              <div>
                <label className="label">Search Patient</label>
                <div style={{ position:"relative" }}>
                  <input
                    style={{
                      width:"100%",
                      background:"rgba(8,12,20,0.8)",
                      border:`1px solid ${searchFocused ? "rgba(56,189,248,0.6)" : "rgba(56,189,248,0.14)"}`,
                      borderRadius:10,
                      padding:"13px 44px 13px 44px",
                      fontSize:15,
                      color:"#e8edf5",
                      fontFamily:"'DM Sans',sans-serif",
                      outline:"none",
                      transition:"border-color 0.25s, box-shadow 0.25s",
                      boxShadow: searchFocused ? "0 0 0 3px rgba(56,189,248,0.1)" : "none",
                      caretColor:"#38bdf8",
                    }}
                    placeholder="Search by name or phone number…"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setSelectedPatient(null); }}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                  />
                  <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:16, opacity:0.5 }}>🔍</span>
                  {searching && (
                    <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)" }}>
                      <span className="spinner-sm" />
                    </span>
                  )}
                  {searchQuery && !searching && (
                    <button
                      onClick={() => { setSearchQuery(""); setSearchResults([]); setSelectedPatient(null); setNoResults(false); }}
                      style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#4a5568", cursor:"pointer", fontSize:16, lineHeight:1 }}
                    >✕</button>
                  )}
                </div>
                <p style={{ fontSize:12, color:"#4a5568", marginTop:6 }}>Type at least 2 characters to search</p>
              </div>

              {/* Search results */}
              {searchResults.length > 0 && (
                <div style={{ animation:"slideDown 0.25s ease" }}>
                  <label className="label">Results ({searchResults.length})</label>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {searchResults.map(p => (
                      <div
                        key={p.id}
                        className={`patient-card${selectedPatient?.id === p.id ? " selected" : ""}`}
                        onClick={() => setSelectedPatient(selectedPatient?.id === p.id ? null : p)}
                      >
                        {/* Avatar */}
                        <div style={{
                          width:40, height:40, borderRadius:10, flexShrink:0,
                          background: selectedPatient?.id === p.id ? "rgba(52,211,153,0.15)" : "rgba(56,189,248,0.1)",
                          border: `1px solid ${selectedPatient?.id === p.id ? "rgba(52,211,153,0.3)" : "rgba(56,189,248,0.2)"}`,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:18,
                        }}>
                          {p.gender === "Female" ? "👩" : "👨"}
                        </div>

                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:14, color:"#e8edf5", marginBottom:2 }}>{p.name}</div>
                          <div style={{ fontSize:12, color:"#8b9ab5", display:"flex", gap:12 }}>
                            <span>🎂 {p.age} yrs</span>
                            <span>📱 {p.phone}</span>
                            <span style={{ textTransform:"capitalize" }}>{p.gender}</span>
                          </div>
                        </div>

                        {selectedPatient?.id === p.id && (
                          <div style={{ flexShrink:0, width:22, height:22, borderRadius:"50%", background:"#34d399", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>✓</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No results */}
              {noResults && searchQuery.length >= 2 && (
                <div style={{ textAlign:"center", padding:"28px 0", animation:"slideDown 0.25s ease" }}>
                  <div style={{ fontSize:32, marginBottom:10 }}>🔎</div>
                  <div style={{ fontSize:14, color:"#8b9ab5", marginBottom:4 }}>No patients found for "{searchQuery}"</div>
                  <button
                    onClick={() => setTab("new")}
                    style={{ marginTop:12, background:"none", border:"1px solid rgba(56,189,248,0.3)", borderRadius:8, padding:"8px 18px", color:"#38bdf8", fontSize:13, fontFamily:"'DM Sans',sans-serif", cursor:"pointer", transition:"all 0.2s" }}
                  >
                    ➕ Register as new patient
                  </button>
                </div>
              )}

              {/* Selected patient + department booking */}
              {selectedPatient && (
                <div style={{ animation:"slideDown 0.3s ease" }}>
                  <div style={{ borderTop:"1px solid rgba(56,189,248,0.08)", marginBottom:24 }} />

                  {/* Patient summary card */}
                  <div style={{ background:"rgba(52,211,153,0.06)", border:"1px solid rgba(52,211,153,0.2)", borderRadius:12, padding:"16px 18px", marginBottom:24 }}>
                    <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", color:"#34d399", marginBottom:10 }}>Selected Patient</div>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:44, height:44, borderRadius:10, background:"rgba(52,211,153,0.12)", border:"1px solid rgba(52,211,153,0.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>
                        {selectedPatient.gender === "Female" ? "👩" : "👨"}
                      </div>
                      <div>
                        <div style={{ fontWeight:700, fontSize:15, color:"#e8edf5" }}>{selectedPatient.name}</div>
                        <div style={{ fontSize:12, color:"#8b9ab5", marginTop:2 }}>
                          {selectedPatient.age} yrs · {selectedPatient.gender} · 📱 {selectedPatient.phone}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Department selection */}
                  <div>
                    <label className="label">Assign Department</label>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginTop:2 }}>
                      {DEPARTMENTS.map(d => (
                        <button
                          key={d.value}
                          className={`dept-chip dept-chip-green${existingDept === d.value ? " active" : ""}`}
                          onClick={() => setExistingDept(d.value)}
                          type="button"
                        >
                          <span>{d.icon}</span> {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop:24 }}>
                    <button className="book-btn" onClick={handleBookAppointment} disabled={bookingLoading}>
                      {bookingLoading ? (
                        <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
                          <span className="spinner" /> Booking appointment…
                        </span>
                      ) : `Book Appointment for ${selectedPatient.name} →`}
                    </button>
                  </div>
                </div>
              )}

              {/* Empty state (no search yet) */}
              {!searchQuery && searchResults.length === 0 && !selectedPatient && (
                <div style={{ textAlign:"center", padding:"32px 0", color:"#4a5568" }}>
                  <div style={{ fontSize:36, marginBottom:12, opacity:0.5 }}>👥</div>
                  <div style={{ fontSize:14 }}>Search for a patient by name or phone number</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <p style={{ textAlign:"center", fontSize:12, color:"#4a5568", marginTop:24 }}>
          Patient data is encrypted and stored securely · MediLingua AI © 2026
        </p>
      </div>
    </div>
  )
}