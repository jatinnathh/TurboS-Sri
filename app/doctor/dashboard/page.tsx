import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"

const DEPT_ICONS: Record<string, string> = {
  GENERAL_MEDICINE: "🩺",
  PEDIATRICS:       "👶",
  GYNECOLOGY:       "🌸",
  ORTHOPEDICS:      "🦴",
  ENT:              "👂",
}

export default async function DoctorDashboard() {

  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (session.user.role !== "DOCTOR") redirect("/dashboard")

  const doctor = await prisma.user.findUnique({ where: { id: session.user.id } })

  if (!doctor?.department) {
    return (
      <div style={{
        minHeight: "100vh", background: "#080c14",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'DM Sans',sans-serif",
      }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Syne:wght@700;800&display=swap');`}</style>
        <div style={{
          background: "rgba(13,19,33,0.9)", border: "1px solid rgba(248,113,113,0.25)",
          borderRadius: 16, padding: "40px 48px", textAlign: "center",
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 700, color: "#e8edf5", marginBottom: 8 }}>
            No Department Assigned
          </div>
          <div style={{ fontSize: 14, color: "#8b9ab5" }}>
            Please contact your administrator to assign a department.
          </div>
        </div>
      </div>
    )
  }

  const visits = await prisma.visit.findMany({
    where: { department: doctor.department },
    include: { patient: true },
    orderBy: { createdAt: "asc" },
  })

  const deptIcon  = DEPT_ICONS[doctor.department] ?? "🏥"
  const deptLabel = doctor.department.replace(/_/g, " ")

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
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body::after {
          content: '';
          position: fixed; inset: 0;
          background: repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px);
          pointer-events: none; z-index: 9999;
        }

        @keyframes fadeSlideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn      { from { opacity:0; }                            to { opacity:1; } }
        @keyframes shimmer     { 0% { background-position:-200% center; }      100% { background-position:200% center; } }
        @keyframes orbFloat    { 0%,100% { transform:translateY(0); }          50% { transform:translateY(-18px); } }
        @keyframes pulseDot    { 0%,100% { box-shadow:0 0 4px #34d399; }       50% { box-shadow:0 0 14px #34d399, 0 0 24px rgba(52,211,153,0.3); } }
        @keyframes rowIn       { from { opacity:0; transform:translateX(-12px); } to { opacity:1; transform:translateX(0); } }

        .visit-row {
          background: rgba(13,19,33,0.85);
          border: 1px solid rgba(56,189,248,0.12);
          border-radius: 14px;
          padding: 20px 24px;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s;
          animation: rowIn 0.4s ease both;
          position: relative; overflow: hidden;
        }
        .visit-row::before {
          content: '';
          position: absolute; top: 0; left: 0; bottom: 0; width: 3px;
          background: linear-gradient(180deg, #38bdf8, #0ea5e9);
          opacity: 0; transition: opacity 0.25s;
          border-radius: 3px 0 0 3px;
        }
        .visit-row:hover {
          border-color: rgba(56,189,248,0.35);
          transform: translateX(4px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.4);
        }
        .visit-row:hover::before { opacity: 1; }

        .consult-btn {
          background: linear-gradient(135deg, #38bdf8, #0ea5e9);
          color: #080c14;
          padding: 10px 20px;
          border-radius: 9px;
          text-decoration: none;
          font-weight: 700;
          font-size: 13px;
          font-family: 'DM Sans', sans-serif;
          white-space: nowrap;
          transition: all 0.25s;
          display: inline-flex; align-items: center; gap: 7px;
          position: relative; overflow: hidden;
          flex-shrink: 0;
        }
        .consult-btn::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.2), transparent);
          opacity: 0; transition: opacity 0.25s;
        }
        .consult-btn:hover::before { opacity: 1; }
        .consult-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(56,189,248,0.3);
        }

        .stat-card {
          background: rgba(13,19,33,0.85);
          border: 1px solid rgba(56,189,248,0.12);
          border-radius: 14px;
          padding: 22px 24px;
          transition: border-color 0.25s, transform 0.25s;
          animation: fadeSlideUp 0.5s ease both;
        }
        .stat-card:hover {
          border-color: rgba(56,189,248,0.28);
          transform: translateY(-3px);
        }

        .queue-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(56,189,248,0.1);
          border: 1px solid rgba(56,189,248,0.25);
          border-radius: 100px;
          padding: 5px 13px;
          font-size: 12px; font-weight: 600; color: #38bdf8;
        }

        .empty-state {
          text-align: center; padding: 72px 24px;
          animation: fadeIn 0.6s ease both;
        }
      `}</style>

      {/* Ambient orbs */}
      <div style={{ position:"fixed", width:420, height:420, background:"radial-gradient(circle,rgba(56,189,248,0.07) 0%,transparent 65%)", top:-60, right:"5%", borderRadius:"50%", pointerEvents:"none", animation:"orbFloat 9s ease-in-out infinite", zIndex:0 }} />
      <div style={{ position:"fixed", width:250, height:250, background:"radial-gradient(circle,rgba(14,165,233,0.05) 0%,transparent 70%)", bottom:60, left:"3%", borderRadius:"50%", pointerEvents:"none", animation:"orbFloat 7s 2s ease-in-out infinite", zIndex:0 }} />

      {/* ── Navbar ── */}
      <nav style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"18px 40px",
        background:"rgba(8,12,20,0.9)", backdropFilter:"blur(20px)",
        borderBottom:"1px solid rgba(56,189,248,0.1)",
        position:"sticky", top:0, zIndex:100,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:32, height:32,
            background:"linear-gradient(135deg,#38bdf8,#0ea5e9)",
            borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:15, boxShadow:"0 0 16px rgba(56,189,248,0.35)",
          }}>⚕</div>
          <span style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700, color:"#e8edf5", letterSpacing:"-0.02em" }}>
            MediLingua <span style={{ color:"#38bdf8" }}>AI</span>
          </span>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          {/* Doctor chip */}
          <div style={{
            display:"flex", alignItems:"center", gap:8,
            background:"rgba(13,19,33,0.9)",
            border:"1px solid rgba(56,189,248,0.15)",
            borderRadius:100, padding:"7px 14px",
          }}>
            <div style={{
              width:26, height:26, borderRadius:"50%",
              background:"linear-gradient(135deg,rgba(56,189,248,0.3),rgba(14,165,233,0.2))",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:12,
            }}>👨‍⚕️</div>
            <span style={{ fontSize:13, color:"#e8edf5", fontWeight:500 }}>Dr. {session.user.name ?? "Doctor"}</span>
          </div>

          {/* Status badge */}
          <div style={{
            display:"flex", alignItems:"center", gap:7,
            background:"rgba(52,211,153,0.08)",
            border:"1px solid rgba(52,211,153,0.2)",
            borderRadius:100, padding:"6px 14px",
          }}>
            <span style={{ width:6, height:6, background:"#34d399", borderRadius:"50%", display:"inline-block", animation:"pulseDot 2s infinite" }} />
            <span style={{ fontSize:12, color:"#34d399", fontWeight:500 }}>On Duty</span>
          </div>
        </div>
      </nav>

      {/* ── Page body ── */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div style={{ marginBottom: 40, animation: "fadeSlideUp 0.5s ease both" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <div style={{
              width:44, height:44,
              background:"rgba(56,189,248,0.1)",
              border:"1px solid rgba(56,189,248,0.3)",
              borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:22,
            }}>{deptIcon}</div>
            <div>
              <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.14em", textTransform:"uppercase", color:"#38bdf8", marginBottom:2 }}>
                Doctor Dashboard
              </div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(22px,4vw,32px)", fontWeight:800, letterSpacing:"-0.02em", color:"#e8edf5", lineHeight:1.1 }}>
                {deptLabel}
              </div>
            </div>
          </div>
          <p style={{ fontSize:14, color:"#8b9ab5", lineHeight:1.6, maxWidth:500 }}>
            Patients assigned to your department are listed below. Start a consultation to begin recording and transcription.
          </p>
        </div>

        {/* ── Stat cards ── */}
        <div style={{
          display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
          gap:16, marginBottom:40,
        }}>
          {[
            { icon:"👥", label:"Patients Waiting",    val: visits.length,                            delay:"0.05s" },
            { icon:"✅", label:"Seen Today",           val: 0,                                        delay:"0.10s" },
            { icon:"⏱",  label:"Avg. Consult Time",   val: "—",                                      delay:"0.15s" },
            { icon:"🏥", label:"Department",           val: deptLabel,                               delay:"0.20s", small: true },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ animationDelay: s.delay }}>
              <div style={{ fontSize:20, marginBottom:10 }}>{s.icon}</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize: s.small ? 15 : 26, fontWeight:700, color:"#e8edf5", marginBottom:4, lineHeight:1.1 }}>{s.val}</div>
              <div style={{ fontSize:11, color:"#4a5568", textTransform:"uppercase", letterSpacing:"0.08em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Queue header ── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700, color:"#e8edf5" }}>
              Patient Queue
            </h2>
            {visits.length > 0 && (
              <span className="queue-badge">
                <span style={{ width:5, height:5, background:"#38bdf8", borderRadius:"50%", display:"inline-block" }} />
                {visits.length} waiting
              </span>
            )}
          </div>
          <div style={{ fontSize:12, color:"#4a5568" }}>Ordered by arrival time</div>
        </div>

        {/* ── Visit list ── */}
        {visits.length === 0 ? (
          <div className="empty-state" style={{
            background:"rgba(13,19,33,0.7)",
            border:"1px solid rgba(56,189,248,0.1)",
            borderRadius:20,
          }}>
            <div style={{ fontSize:52, marginBottom:16 }}>🎉</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontSize:20, fontWeight:700, color:"#e8edf5", marginBottom:8 }}>All clear!</div>
            <div style={{ fontSize:14, color:"#8b9ab5" }}>No patients waiting in {deptLabel} right now.</div>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {visits.map((visit, i) => (
              <div
                key={visit.id}
                className="visit-row"
                style={{ animationDelay: `${0.05 + i * 0.06}s` }}
              >
                {/* Queue position */}
                <div style={{
                  width:36, height:36, borderRadius:"50%", flexShrink:0,
                  background: i === 0 ? "linear-gradient(135deg,#38bdf8,#0ea5e9)" : "rgba(56,189,248,0.08)",
                  border: i === 0 ? "none" : "1px solid rgba(56,189,248,0.2)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14,
                  color: i === 0 ? "#080c14" : "#8b9ab5",
                  boxShadow: i === 0 ? "0 0 16px rgba(56,189,248,0.35)" : "none",
                }}>{i + 1}</div>

                {/* Patient info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                    <span style={{ fontFamily:"'Syne',sans-serif", fontSize:16, fontWeight:700, color:"#e8edf5" }}>
                      {visit.patient.name}
                    </span>
                    {i === 0 && (
                      <span style={{
                        fontSize:10, fontWeight:700, letterSpacing:"0.1em",
                        background:"rgba(56,189,248,0.15)",
                        border:"1px solid rgba(56,189,248,0.3)",
                        color:"#38bdf8", borderRadius:100, padding:"2px 9px",
                        textTransform:"uppercase",
                      }}>Next</span>
                    )}
                  </div>
                  <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                    <span style={{ fontSize:13, color:"#8b9ab5" }}>
                      Age <span style={{ color:"#e8edf5", fontWeight:500 }}>{visit.patient.age}</span>
                    </span>
                    {(visit.patient as { gender?: string }).gender && (
                      <span style={{ fontSize:13, color:"#8b9ab5" }}>
                        {(visit.patient as { gender?: string }).gender}
                      </span>
                    )}
                    {(visit.patient as { phone?: string }).phone && (
                      <span style={{ fontSize:13, color:"#8b9ab5" }}>
                        📱 {(visit.patient as { phone?: string }).phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Consult CTA */}
                <Link href={`/consultation/${visit.id}`} className="consult-btn">
                  {i === 0 ? "▶ Start" : "Start"} Consultation
                  <span style={{ fontSize:15 }}>→</span>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Footer note */}
        <p style={{ textAlign:"center", fontSize:12, color:"#4a5568", marginTop:36 }}>
          MediLingua AI · Secure & Encrypted · © 2026
        </p>
      </div>
    </div>
  )
}