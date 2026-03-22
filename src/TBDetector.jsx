import { useState, useRef, useCallback, useEffect } from "react";

const API_URL = "http://localhost:8000/predict";

/* ─── Animated Background Canvas ─── */
function MedicalBackground() {
  const canvasRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;
    let W, H;

    const resize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    /* floating particles */
    const PARTICLE_COUNT = 55;
    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.35,
      dy: (Math.random() - 0.5) * 0.35,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    /* cross icons */
    const CROSS_COUNT = 9;
    const crosses = Array.from({ length: CROSS_COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 14 + 8,
      alpha: Math.random() * 0.07 + 0.03,
      dy: -(Math.random() * 0.3 + 0.1),
    }));

    /* heartbeat wave */
    let waveOffset = 0;

    const drawCross = (x, y, size, alpha) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "#2d8de8";
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, y - size / 2);
      ctx.lineTo(x, y + size / 2);
      ctx.moveTo(x - size / 2, y);
      ctx.lineTo(x + size / 2, y);
      ctx.stroke();
      ctx.restore();
    };

    const drawHeartbeat = (yBase, alpha) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "#1e6fbe";
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      const seg = W / 3;
      for (let s = -1; s < 3; s++) {
        const ox = s * seg - (waveOffset % seg);
        const pts = [
          [ox,           yBase],
          [ox + seg * 0.3,  yBase],
          [ox + seg * 0.38, yBase - 28],
          [ox + seg * 0.44, yBase + 22],
          [ox + seg * 0.50, yBase - 14],
          [ox + seg * 0.55, yBase],
          [ox + seg,     yBase],
        ];
        pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
      }
      ctx.stroke();
      ctx.restore();
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      /* subtle grid */
      ctx.save();
      ctx.strokeStyle = "rgba(30,111,190,0.04)";
      ctx.lineWidth = 1;
      const GRID = 52;
      for (let x = 0; x < W; x += GRID) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += GRID) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.restore();

      /* heartbeat lines */
      drawHeartbeat(H * 0.28, 0.13);
      drawHeartbeat(H * 0.72, 0.08);

      /* crosses */
      crosses.forEach(c => {
        drawCross(c.x, c.y, c.size, c.alpha);
        c.y += c.dy;
        if (c.y < -20) { c.y = H + 20; c.x = Math.random() * W; }
      });

      /* particles + connections */
      particles.forEach(p => {
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > W) p.dx *= -1;
        if (p.y < 0 || p.y > H) p.dy *= -1;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = "#2d8de8";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      /* connect nearby particles */
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.save();
            ctx.globalAlpha = (1 - dist / 110) * 0.08;
            ctx.strokeStyle = "#1e6fbe";
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      waveOffset += 0.6;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}
    />
  );
}

/* ─── Probability Bar ─── */
function ProbBar({ label, value, color, trackColor, delay = 0 }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "#3d5a7a", fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#0a2342" }}>{value != null ? `${value.toFixed(1)}%` : "—"}</span>
      </div>
      <div style={{ height: 8, background: trackColor, borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 999, background: color, width: value != null ? `${value}%` : "0%", transition: `width 1.1s cubic-bezier(.4,0,.2,1) ${delay}ms` }} />
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function TBDetector() {
  const [phase, setPhase]       = useState("idle");
  const [preview, setPreview]   = useState(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult]     = useState(null);
  const [errMsg, setErrMsg]     = useState("");
  const [dragging, setDragging] = useState(false);
  const [apiUrl, setApiUrl]     = useState(API_URL);
  const fileRef = useRef();

  const processFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(file);
    setPhase("loading"); setResult(null); setErrMsg("");
    const form = new FormData();
    form.append("file", file);
    fetch(apiUrl, { method: "POST", body: form })
      .then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.detail || "Server error"); }); return r.json(); })
      .then(data => { setResult(data); setPhase("result"); })
      .catch(e  => { setErrMsg(e.message); setPhase("error"); });
  }, [apiUrl]);

  const onDrop = e => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); };
  const reset  = () => { setPhase("idle"); setPreview(null); setFileName(""); setResult(null); setErrMsg(""); if (fileRef.current) fileRef.current.value = ""; };
  const isTB   = result?.prediction === "Tuberculosis";

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "'Plus Jakarta Sans','Segoe UI',sans-serif", color: "#0a2342", position: "relative" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.85)}}
        @keyframes scanLine{0%{top:0}100%{top:calc(100% - 2px)}}
        @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
        .fade-up{animation:fadeUp .4s ease forwards}
        .drop-zone{transition:border-color .2s,background .2s,box-shadow .2s}
        .drop-zone:hover,.drop-zone.drag-active{border-color:#1e6fbe!important;background:rgba(30,111,190,.04)!important;box-shadow:0 0 0 4px rgba(30,111,190,.08)!important}
        .nav-item{font-size:13px;color:#8da4c0;padding:6px 12px;border-radius:6px;cursor:pointer;transition:all .15s}
        .nav-item:hover{background:#1a3f6f;color:#fff}
        .tab-item{padding:12px 20px;font-size:13px;font-weight:600;color:#8da4c0;border-bottom:2px solid transparent;cursor:pointer;transition:all .15s;white-space:nowrap}
        .tab-item:hover{color:#fff}
        .tab-item.active{color:#fff;border-bottom-color:#2d8de8}
        .ghost-btn{background:transparent;border:1.5px solid rgba(255,255,255,.15);color:rgba(255,255,255,.7);border-radius:8px;padding:7px 16px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;font-family:'Plus Jakarta Sans',sans-serif}
        .ghost-btn:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.3);color:#fff}
        .solid-btn{background:#1e6fbe;border:none;color:#fff;border-radius:8px;padding:9px 20px;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;font-family:'Plus Jakarta Sans',sans-serif}
        .solid-btn:hover{background:#1558a0}
        .card{background:#fff;border-radius:16px;border:1px solid #d8e2ef;overflow:hidden}
        input{font-family:'Plus Jakarta Sans',sans-serif}
        input:focus{outline:none}
      `}</style>

      {/* Animated canvas background */}
      <MedicalBackground />

      {/* ── HEADER ── */}
      <header style={{ position: "relative", zIndex: 10, background: "rgba(10,35,66,.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
        {/* top bar */}
        <div style={{ background: "rgba(13,45,84,.8)", borderBottom: "1px solid rgba(255,255,255,.05)", padding: "0 32px", height: 38, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <span style={{ fontSize: 10, color: "#3d5a7a", letterSpacing: ".12em", fontWeight: 600 }}>PULMONARY DIAGNOSTIC CENTRE</span>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {["Radiology", "ICU", "Oncology", "Emergency"].map(d => (
                <span key={d} style={{ fontSize: 10, color: "#1e3a5f", cursor: "pointer" }}>{d}</span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", animation: "pulseDot 2s ease infinite" }} />
            <span style={{ fontSize: 10, color: "#4ade80", fontWeight: 600 }}>AI System Online</span>
          </div>
        </div>

        {/* brand row */}
        <div style={{ padding: "18px 32px 0", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 18 }}>
            {/* logo */}
            <div style={{ width: 48, height: 48, borderRadius: 13, background: "linear-gradient(135deg,#1e6fbe,#0891b2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 14px rgba(30,111,190,.35)" }}>
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                <path d="M10 3v14M3 10h14" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
                <h1 style={{ fontSize: 21, fontWeight: 800, color: "#fff", letterSpacing: "-.02em" }}>MediScan AI</h1>
                <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 4, background: "rgba(45,141,232,.25)", color: "#7ec8f8", fontWeight: 700, letterSpacing: ".08em", border: "1px solid rgba(45,141,232,.3)" }}>v2.1</span>
              </div>
              <p style={{ fontSize: 12, color: "#5e7a99" }}>Tuberculosis Detection · Chest Radiograph Analysis</p>
            </div>
          </div>
          <nav style={{ display: "flex", gap: 2, paddingBottom: 18 }}>
            {["Dashboard", "Patients", "Reports", "Settings"].map(n => (
              <div key={n} className="nav-item">{n}</div>
            ))}
          </nav>
        </div>

        {/* tab bar */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: "0 32px", display: "flex", gap: 0 }}>
          {["New Analysis", "History", "Guidelines"].map((t, i) => (
            <div key={t} className={`tab-item${i === 0 ? " active" : ""}`}>{t}</div>
          ))}
        </div>
      </header>

      {/* ── PAGE ── */}
      <main style={{ position: "relative", zIndex: 5, maxWidth: 860, margin: "0 auto", padding: "32px 24px 60px" }}>

        {/* breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 24 }}>
          {["Home", "Diagnostics", "TB Screening"].map((b, i, arr) => (
            <span key={b} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 12, color: i === arr.length - 1 ? "#0a2342" : "#8da4c0", fontWeight: i === arr.length - 1 ? 600 : 400 }}>{b}</span>
              {i < arr.length - 1 && <span style={{ color: "#c8d8e8", fontSize: 13 }}>›</span>}
            </span>
          ))}
        </div>

        {/* page heading */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#0a2342", letterSpacing: "-.02em", marginBottom: 8 }}>Chest X-ray Analysis</h2>
          <p style={{ fontSize: 14, color: "#5e7a99", lineHeight: 1.8, maxWidth: 520 }}>
            Upload a frontal chest radiograph for AI-assisted tuberculosis screening. Results are indicative and must be confirmed by a licensed radiologist.
          </p>
        </div>

        {/* ── MAIN CARD ── */}
        <div className="card" style={{ boxShadow: "0 4px 32px rgba(10,35,66,.08)" }}>

          {/* card header */}
          <div style={{ padding: "16px 22px", borderBottom: "1px solid #eef2f7", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafcff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#e0f0ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="2" width="14" height="12" rx="2" stroke="#1e6fbe" strokeWidth="1.4" />
                  <path d="M4 8h2l1.5-3 2 6 1-3H13" stroke="#1e6fbe" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#0a2342" }}>Radiograph Workspace</p>
                <p style={{ fontSize: 11, color: "#8da4c0" }}>Supported formats: PNG · JPG · JPEG · DICOM</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#8da4c0" }}>Endpoint</span>
              <input
                value={apiUrl}
                onChange={e => setApiUrl(e.target.value)}
                style={{ fontSize: 11, padding: "5px 10px", border: "1.5px solid #d8e2ef", borderRadius: 7, color: "#3d5a7a", fontFamily: "monospace", width: 240, background: "#f8fafc", transition: "border-color .15s" }}
              />
            </div>
          </div>

          <div style={{ padding: 24 }}>

            {/* ═══ IDLE ═══ */}
            {phase === "idle" && (
              <div
                className={`drop-zone${dragging ? " drag-active" : ""}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                style={{ border: "2px dashed #c8d8e8", borderRadius: 14, padding: "4rem 2rem", textAlign: "center", cursor: "pointer", background: "#fafcff" }}
              >
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => processFile(e.target.files[0])} />
                <div style={{ width: 68, height: 68, borderRadius: "50%", background: "linear-gradient(135deg,#e0f0ff,#cce4ff)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 4px 16px rgba(30,111,190,.12)" }}>
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path d="M14 19V9M10 13l4-4 4 4" stroke="#1e6fbe" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5 21v1a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1" stroke="#1e6fbe" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
                <p style={{ fontSize: 17, fontWeight: 700, color: "#0a2342", marginBottom: 7 }}>Drop your chest X-ray here</p>
                <p style={{ fontSize: 13, color: "#5e7a99", marginBottom: 22 }}>
                  or <span style={{ color: "#1e6fbe", fontWeight: 700 }}>click to browse</span> from your device
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                  {["Frontal AP / PA view", "Max 10 MB", "PNG · JPG · JPEG"].map(t => (
                    <span key={t} style={{ fontSize: 11, padding: "4px 12px", borderRadius: 20, background: "#fff", border: "1px solid #d8e2ef", color: "#8da4c0", fontWeight: 500 }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ LOADING ═══ */}
            {phase === "loading" && (
              <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 22 }}>
                {/* xray placeholder with scan */}
                <div style={{ borderRadius: 12, overflow: "hidden", position: "relative", background: "#000d1a", minHeight: 220 }}>
                  {preview && <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(.4) brightness(.75)", display: "block" }} />}
                  <div style={{ position: "absolute", inset: 0, background: "rgba(30,111,190,.1)" }} />
                  <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,#2d8de8,transparent)", animation: "scanLine 1.8s linear infinite" }} />
                  <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,.65)", borderRadius: 6, padding: "3px 9px" }}>
                    <span style={{ fontSize: 9, color: "#2d8de8", fontWeight: 700, letterSpacing: ".1em" }}>SCANNING…</span>
                  </div>
                </div>
                {/* steps */}
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 28, height: 28, border: "3px solid #eef2f7", borderTopColor: "#1e6fbe", borderRadius: "50%", animation: "spin .8s linear infinite", flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: "#0a2342" }}>Analyzing radiograph…</p>
                      <p style={{ fontSize: 12, color: "#8da4c0", marginTop: 2 }}>{fileName}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { label: "Image preprocessing",       done: true  },
                      { label: "VGG16 feature extraction",  done: true  },
                      { label: "Running classifier",        done: false },
                      { label: "Computing probabilities",   done: false },
                    ].map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: s.done ? "#059669" : "#eef2f7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: s.done ? "none" : "1.5px solid #d8e2ef" }}>
                          {s.done
                            ? <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5l2 2 4-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            : <div style={{ width: 7, height: 7, borderRadius: "50%", border: "1.5px solid #c8d8e8", borderTopColor: "#1e6fbe", animation: "spin .8s linear infinite" }} />
                          }
                        </div>
                        <span style={{ fontSize: 13, color: s.done ? "#3d5a7a" : "#b0c4d8" }}>{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ RESULT ═══ */}
            {phase === "result" && result && (
              <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 22 }}>
                {/* x-ray */}
                <div style={{ borderRadius: 12, overflow: "hidden", position: "relative", background: "#000d1a" }}>
                  {preview && <img src={preview} alt="X-ray" style={{ width: "100%", objectFit: "cover", display: "block", filter: isTB ? "contrast(1.08) saturate(.85)" : "brightness(.95)" }} />}
                  <div style={{ position: "absolute", inset: 0, background: isTB ? "rgba(220,38,38,.1)" : "rgba(5,150,105,.08)" }} />
                  {/* top overlay */}
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "8px 10px", background: "linear-gradient(rgba(0,0,0,.7),transparent)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 9, color: "#94a3b8" }}>{fileName}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "rgba(0,0,0,.4)", color: isTB ? "#fca5a5" : "#6ee7b7" }}>
                      {isTB ? "● POSITIVE" : "● NEGATIVE"}
                    </span>
                  </div>
                  {/* bottom confidence strip */}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "6px 10px 8px", background: "linear-gradient(transparent,rgba(0,0,0,.85))" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 9, color: "#64748b" }}>Confidence</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: isTB ? "#f87171" : "#4ade80" }}>{result.confidence.toFixed(1)}%</span>
                    </div>
                    <div style={{ height: 3, background: "rgba(255,255,255,.1)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: isTB ? "#ef4444" : "#22c55e", width: `${result.confidence}%`, transition: "width 1s ease" }} />
                    </div>
                  </div>
                </div>

                {/* result panel */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* diagnosis row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ fontSize: 10, color: "#8da4c0", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>Diagnosis</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <h3 style={{ fontSize: 26, fontWeight: 800, color: "#0a2342", letterSpacing: "-.02em" }}>{result.prediction}</h3>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20, background: isTB ? "#fee2e2" : "#d1fae5", color: isTB ? "#991b1b" : "#065f46", border: `1px solid ${isTB ? "#fca5a5" : "#6ee7b7"}` }}>
                          {isTB ? "TB Detected" : "Clear"}
                        </span>
                      </div>
                    </div>
                    
                  </div>

                  

                  {/* disclaimer */}
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10 }}>
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                      <path d="M8 2L14.9 14H1.1L8 2z" stroke="#d97706" strokeWidth="1.4" fill="none" />
                      <path d="M8 6v4M8 11.5v.5" stroke="#d97706" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                    <p style={{ fontSize: 11, color: "#92400e", lineHeight: 1.7 }}>
                      <strong>Clinical Note:</strong> This result is AI-generated and indicative only. Always confirm findings with a licensed radiologist before any clinical decision.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ ERROR ═══ */}
            {phase === "error" && (
              <div className="fade-up" style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 14, padding: 24 }}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 5v5M9 12v.5" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M7.6 2.2 1.4 12.5A1.6 1.6 0 0 0 2.8 15h12.4a1.6 1.6 0 0 0 1.4-2.5L10.4 2.2a1.6 1.6 0 0 0-2.8 0z" stroke="#dc2626" strokeWidth="1.3" fill="none" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>Cannot reach the model server</p>
                    <p style={{ fontSize: 12, color: "#b91c1c", fontFamily: "monospace", padding: "7px 11px", background: "#fee2e2", borderRadius: 7, marginBottom: 14 }}>{errMsg}</p>
                    <p style={{ fontSize: 13, color: "#7f1d1d", marginBottom: 10 }}>Start the FastAPI backend:</p>
                    <div style={{ padding: "10px 14px", background: "#fff", border: "1px solid #fecaca", borderRadius: 8, fontFamily: "monospace", fontSize: 12, color: "#7f1d1d" }}>
                      uvicorn main:app --host 0.0.0.0 --port 8000
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* card footer */}
          {phase !== "idle" && (
            <div style={{ padding: "14px 24px", borderTop: "1px solid #eef2f7", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafcff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#d97706" strokeWidth="1.3" /><path d="M7 4v3.5l2 2" stroke="#d97706" strokeWidth="1.3" strokeLinecap="round" /></svg>
                <span style={{ fontSize: 11, color: "#d97706" }}>For decision support only — not a substitute for professional diagnosis</span>
              </div>
              {phase !== "loading" && (
                <button className="solid-btn" onClick={reset}>New Analysis</button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer style={{ position: "relative", zIndex: 5, background: "rgba(10,35,66,.97)", padding: "18px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#1e6fbe,#0891b2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none"><path d="M10 3v14M3 10h14" stroke="white" strokeWidth="2.6" strokeLinecap="round" /></svg>
          </div>
          <span style={{ fontSize: 12, color: "#3d5a7a" }}>MediScan AI · Pulmonary Imaging · TB Detection</span>
        </div>
        <span style={{ fontSize: 11, color: "#1e3a5f" }}>© 2025 Medical AI Research · Educational use only</span>
      </footer>
    </div>
  );
}