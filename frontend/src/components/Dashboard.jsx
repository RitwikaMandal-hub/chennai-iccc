import { useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import {
  Ambulance,
  Bot,
  Boxes,
  Car,
  ChevronRight,
  CloudRain,
  Cpu,
  Database,
  Droplets,
  Flame,
  Leaf,
  LoaderCircle,
  Map as MapIcon,
  Radio,
  Recycle,
  Route,
  Send,
  Siren,
  Sparkles,
  TrafficCone,
  TriangleAlert,
  Video,
  Waves,
  Wifi,
  Zap,
} from "lucide-react";

import ChennaiMap from "./ChennaiMap";
import CameraFeed from "./CameraFeed";
import { io } from "../lib/socket";
import { navigate } from "../lib/router";
import { API_URL, AI_URL, DEMO_MODE, SOCKET_URL } from "../lib/config";

const HISTORY = 24;

const INCIDENT_STYLE = {
  ACCIDENT: { icon: TriangleAlert, label: "Road Accident", tone: "bg-rose-500" },
  FIRE: { icon: Flame, label: "Fire", tone: "bg-orange-500" },
  MEDICAL_EMERGENCY: { icon: Ambulance, label: "Medical Emergency", tone: "bg-pink-500" },
  ROAD_BLOCKAGE: { icon: TrafficCone, label: "Road Blockage", tone: "bg-amber-500" },
  FLOOD_ALERT: { icon: Waves, label: "Flood Risk", tone: "bg-sky-500" },
  TRAFFIC_CONGESTION: { icon: Car, label: "Traffic Congestion", tone: "bg-amber-500" },
};

const SEVERITY_TONE = {
  CRITICAL: "text-rose-400",
  HIGH: "text-rose-300",
  MEDIUM: "text-amber-300",
  LOW: "text-emerald-300",
};

function incidentPlace(incident) {
  const match = /near ([^.]+)|in ([^.]+)|on ([^.]+)/i.exec(incident.description || "");
  return match ? (match[1] || match[2] || match[3]).trim() : "Chennai";
}

function timeOf(value) {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function Sparkline({ data, color }) {
  const id = `spark-${color.replace("#", "")}`;
  return (
    <ResponsiveContainer width="100%" height={44}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.45} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={["dataMin - 2", "dataMax + 2"]} />
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${id})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function KpiCard({ icon: Icon, title, value, unit, caption, footer, series, color, delta, onClick }) {
  const up = delta >= 0;
  return (
    <button type="button" onClick={onClick} className="iccc-panel group flex flex-col p-4 text-left transition hover:border-sky-400/40">
      <div className="iccc-panel-title">
        <Icon size={16} style={{ color }} />
        {title}
      </div>
      <div className="mt-3 flex items-end gap-3">
        <div className="min-w-0">
          <div className="text-[28px] font-bold leading-none tabular-nums">
            {value}
            <span className="ml-1 text-base font-semibold text-slate-400">{unit}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">{caption}</div>
        </div>
        <div className="min-w-0 flex-1">
          <Sparkline data={series} color={color} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-800 pt-2 text-[10px] text-slate-500">
        <span className="truncate">{footer}</span>
        {Number.isFinite(delta) && (
          <span className={`shrink-0 font-semibold ${up ? "text-rose-300" : "text-emerald-300"}`}>
            {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}
          </span>
        )}
      </div>
    </button>
  );
}

function PanelHeader({ icon: Icon, title, action, onAction, color = "#38bdf8" }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="iccc-panel-title">
        <Icon size={16} style={{ color }} />
        {title}
      </div>
      {action && (
        <button type="button" onClick={onAction} className="text-[11px] font-semibold text-sky-400 hover:text-sky-300">
          {action}
        </button>
      )}
    </div>
  );
}

/* =================================================================
   AI ASSISTANT — insight, Q&A and human-approved action plans
   ================================================================= */

function AiAssistant({ metrics }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [approval, setApproval] = useState("");
  const [execution, setExecution] = useState(null);

  const insight = useMemo(() => {
    if (metrics.water_level >= 70) {
      return {
        text: `Water level in Velachery is ${metrics.water_level.toFixed(0)} cm and rising. Flood risk is elevated — run the flood simulation or review recommended actions?`,
        scenario: "flood",
        prompt: "Water level is rising in Velachery. What should the control room do?",
      };
    }
    if (metrics.traffic_flow >= 80) {
      return {
        text: `Traffic index at ${metrics.traffic_flow.toFixed(0)}% on Anna Salai. Accident risk is higher in heavy congestion — rehearse an ambulance green corridor?`,
        scenario: "accident",
        prompt: "An accident has been reported on Anna Salai. Coordinate an emergency response.",
      };
    }
    return {
      text: `City conditions are stable: traffic ${metrics.traffic_flow.toFixed(0)}%, AQI ${metrics.air_quality.toFixed(0)}, water ${metrics.water_level.toFixed(0)} cm. Want a full situation analysis?`,
      scenario: "accident",
      prompt: "Analyze the current city situation.",
    };
  }, [metrics.water_level, metrics.traffic_flow, metrics.air_quality]);

  const ask = async (prompt, withPlan = false) => {
    if (!prompt.trim()) return;
    setLoading(true);
    setAnswer("");
    setPlan(null);
    setApproval("");
    setExecution(null);
    try {
      const response = await fetch(`${AI_URL}/agent?prompt=${encodeURIComponent(prompt)}`);
      if (!response.ok) throw new Error(`AI service returned ${response.status}`);
      const data = await response.json();
      setAnswer(data.response || data.message || "No response.");
      if (withPlan) {
        const planResponse = await fetch(`${AI_URL}/approval-plan`);
        if (planResponse.ok) {
          const planData = await planResponse.json();
          setPlan(planData.actions || []);
          setApproval(planData.status || "PENDING_APPROVAL");
        }
      }
    } catch (error) {
      console.error("AI assistant error:", error);
      setAnswer("The AI Operations service could not be reached.");
    } finally {
      setLoading(false);
    }
  };

  const decide = async (approve) => {
    setApproval(approve ? "APPROVING" : "REJECTING");
    try {
      const response = await fetch(`${AI_URL}/approval/${approve ? "approve" : "reject"}`, { method: "POST" });
      const data = await response.json();
      setApproval(data.status || (approve ? "APPROVED" : "REJECTED"));
      setExecution(data.execution || null);
    } catch (error) {
      console.error("Approval error:", error);
      setApproval("ERROR");
    }
  };

  return (
    <div className="iccc-panel p-4">
      <PanelHeader icon={Bot} title="AI Assistant" color="#a78bfa" action="Open AI Ops" onAction={() => navigate("ai")} />

      <div className="rounded-xl border border-violet-400/15 bg-violet-500/5 p-3 text-[13px] leading-relaxed text-slate-300">
        {insight.text}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => navigate("simulation", { scenario: insight.scenario })}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold hover:bg-sky-500"
        >
          <Boxes size={14} /> Run 3D Simulation
        </button>
        <button
          type="button"
          onClick={() => ask(insight.prompt, true)}
          className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5"
        >
          Show Actions
        </button>
      </div>

      {(loading || answer) && (
        <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-violet-300">
              <LoaderCircle size={14} className="animate-spin" /> Analysing live city data…
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-300">{answer}</p>
          )}

          {plan && plan.length > 0 && (
            <div className="mt-3 border-t border-slate-800 pt-3">
              <div className="text-[10px] font-bold tracking-wider text-amber-300">HUMAN APPROVAL REQUIRED</div>
              <ol className="mt-2 space-y-1.5">
                {plan.map((item, index) => (
                  <li key={item.action} className="text-xs text-slate-300">
                    <span className="mr-1.5 font-mono text-slate-500">{index + 1}.</span>
                    <span className="capitalize">{item.action.replaceAll("_", " ").toLowerCase()}</span>
                    {item.reason && <span className="block pl-4 text-[11px] text-slate-500">{item.reason}</span>}
                  </li>
                ))}
              </ol>
              {approval === "PENDING_APPROVAL" && (
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => decide(true)} className="flex-1 rounded-md bg-emerald-600 py-1.5 text-xs font-semibold hover:bg-emerald-500">
                    Approve
                  </button>
                  <button type="button" onClick={() => decide(false)} className="flex-1 rounded-md border border-rose-500/40 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10">
                    Reject
                  </button>
                </div>
              )}
              {(approval === "APPROVING" || approval === "REJECTING") && <div className="mt-2 text-xs text-slate-400">Processing…</div>}
              {approval === "APPROVED" && (
                <div className="mt-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-200">
                  Executed in simulation{execution?.last_execution_id ? ` · ${execution.last_execution_id}` : ""}.{" "}
                  <button type="button" onClick={() => navigate("simulation", { scenario: "accident" })} className="font-semibold underline">
                    Watch it in 3D
                  </button>
                </div>
              )}
              {approval === "REJECTED" && <div className="mt-2 text-xs text-rose-300">Rejected — no actions executed.</div>}
              {approval === "ERROR" && <div className="mt-2 text-xs text-rose-300">Approval service error.</div>}
            </div>
          )}
        </div>
      )}

      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          ask(question);
        }}
      >
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask anything about the city…"
          className="h-10 min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950/70 px-3 text-sm outline-none placeholder:text-slate-500 focus:border-violet-400/60"
        />
        <button type="submit" disabled={loading} className="grid h-10 w-10 place-items-center rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50" aria-label="Ask">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

/* =================================================================
   DASHBOARD
   ================================================================= */

function Dashboard() {
  const [metrics, setMetrics] = useState({ traffic_flow: 0, air_quality: 0, water_level: 0, temperature: 0 });
  const [history, setHistory] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [eWaste, setEWaste] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const seen = useRef(new Set());

  useEffect(() => {
    fetch(`${API_URL}/api/dashboard`)
      .then((response) => response.json())
      .then((data) => {
        setMetrics((previous) => ({
          ...previous,
          traffic_flow: data.traffic_flow ?? previous.traffic_flow,
          air_quality: data.air_quality ?? previous.air_quality,
          water_level: data.average_water_level ?? previous.water_level,
        }));
        if (Array.isArray(data.incidents)) setIncidents(data.incidents);
      })
      .catch((error) => console.error("Dashboard API error:", error));
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("simulation-update", (data) => {
      const next = {
        traffic_flow: Number(data.traffic_1) || 0,
        air_quality: Number(data.air_quality) || 0,
        water_level: Number(data.water_level) || 0,
        temperature: Number(data.temperature) || 0,
      };
      const fill = (data.e_waste || []).map((p) => (Number(p.current_load_kg) / Number(p.capacity_kg)) * 100);
      const wasteFill = fill.length ? fill.reduce((a, b) => a + b, 0) / fill.length : 0;

      setMetrics(next);
      setHistory((previous) => [...previous, { ...next, waste: wasteFill, incidents: (data.incidents || []).length }].slice(-HISTORY));
      if (data.incidents) setIncidents(data.incidents);
      if (data.e_waste) setEWaste(data.e_waste);
      if (data.vehicles) setVehicles(data.vehicles);

      const fresh = [];
      for (const incident of data.incidents || []) {
        if (seen.current.has(incident.incident_id)) continue;
        seen.current.add(incident.incident_id);
        const style = INCIDENT_STYLE[incident.incident_type];
        fresh.push({
          id: `i-${incident.incident_id}`,
          time: timeOf(incident.reported_at),
          text: `${style?.label || incident.incident_type} reported near ${incidentPlace(incident)}`,
          icon: style?.icon || TriangleAlert,
          tone: "text-rose-300",
        });
      }
      if (next.water_level >= 75 && Math.random() < 0.3) {
        fresh.push({ id: `w-${Date.now()}`, time: timeOf(), text: `AI flagged high water level at Velachery (${next.water_level} cm)`, icon: Droplets, tone: "text-sky-300" });
      }
      if (next.traffic_flow >= 85 && Math.random() < 0.3) {
        fresh.push({ id: `t-${Date.now()}`, time: timeOf(), text: "Adaptive signal timing extended at Guindy Junction", icon: Zap, tone: "text-amber-300" });
      }
      if (fresh.length) setEvents((previous) => [...fresh.reverse(), ...previous].slice(0, 8));
    });
    return () => socket.disconnect();
  }, []);

  const series = (field) => history.map((point) => ({ v: point[field] }));
  const delta = (field) => (history.length > 1 ? history[history.length - 1][field] - history[history.length - 2][field] : NaN);
  const wasteFill = history.length ? history[history.length - 1].waste : 0;
  const ambulances = vehicles.filter((vehicle) => vehicle.vehicle_type === "AMBULANCE").length;
  const airLabel = metrics.air_quality >= 150 ? "Poor" : metrics.air_quality >= 100 ? "Moderate" : "Satisfactory";

  const keyMetrics = [
    ["Live Traffic Flow", `${metrics.traffic_flow.toFixed(0)}%`, "bg-emerald-400"],
    ["Air Quality (AQI)", metrics.air_quality.toFixed(0), "bg-lime-400"],
    ["Water Level", `${metrics.water_level.toFixed(0)} cm`, "bg-sky-400"],
    ["Active Incidents", incidents.length, "bg-rose-500"],
  ];

  return (
    <div className="space-y-4 p-3 sm:p-4 lg:p-5">
      {/* ================= MAP + RIGHT RAIL ================= */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <div className="iccc-panel relative h-[420px] overflow-hidden sm:h-[520px] xl:h-[600px]">
            <ChennaiMap showHud={false} />

            <div className="pointer-events-none absolute left-14 top-3 z-[1000] flex flex-col gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-sky-400/25 bg-slate-950/85 px-3 py-2 backdrop-blur-md">
                <MapIcon size={16} className="text-sky-300" />
                <span className="text-xs font-bold tracking-wider">LIVE CITY OVERVIEW</span>
                <span className="rounded-md border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300">2.5D Twin</span>
              </div>
              <div className="hidden w-56 rounded-xl border border-sky-400/20 bg-slate-950/85 p-3 backdrop-blur-md sm:block">
                <div className="text-[10px] font-bold tracking-[0.14em] text-slate-400">KEY METRICS</div>
                <div className="mt-2 space-y-2">
                  {keyMetrics.map(([label, value, dot]) => (
                    <div key={label} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-slate-300">
                        <span className={`h-2.5 w-2.5 rounded-sm ${dot}`} />
                        {label}
                      </span>
                      <span className="font-mono font-bold tabular-nums">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ================= KPI CARDS ================= */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            <KpiCard icon={Car} title="Traffic" value={metrics.traffic_flow.toFixed(0)} unit="%" caption="Avg. flow index"
              footer="Peak 08:00–10:00 · 18:00–21:00" series={series("traffic_flow")} color="#f59e0b" delta={delta("traffic_flow")}
              onClick={() => navigate("mobility")} />
            <KpiCard icon={Droplets} title="Flood & Water" value={metrics.water_level.toFixed(0)} unit="cm" caption="Velachery basin"
              footer="Critical zones: 1 · Sensors: 2" series={series("water_level")} color="#38bdf8" delta={delta("water_level")}
              onClick={() => navigate("flood")} />
            <KpiCard icon={Leaf} title="Air Quality" value={metrics.air_quality.toFixed(0)} unit="AQI" caption={airLabel}
              footer="Monitoring station: T. Nagar" series={series("air_quality")} color="#22c55e" delta={delta("air_quality")}
              onClick={() => navigate("ai")} />
            <KpiCard icon={Recycle} title="E-Waste" value={wasteFill.toFixed(0)} unit="%" caption="Avg. bin fill level"
              footer={`${eWaste.length} collection points`} series={series("waste")} color="#a3e635" delta={delta("waste")}
              onClick={() => navigate("waste")} />
            <KpiCard icon={Siren} title="Emergency" value={incidents.length} unit="active" caption={`${ambulances} ambulances on patrol`}
              footer="Avg. response: 6.8 min" series={series("incidents")} color="#f43f5e" delta={delta("incidents")}
              onClick={() => navigate("emergency")} />
          </div>
        </div>

        {/* ================= RIGHT RAIL ================= */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1 xl:content-start">
          <div className="iccc-panel p-4">
            <PanelHeader icon={Radio} title="Active Incidents" color="#f43f5e" action="View all" onAction={() => navigate("emergency")} />
            <div className="space-y-1">
              {incidents.length === 0 && <div className="py-6 text-center text-xs text-slate-500">No active incidents</div>}
              {incidents.slice(0, 5).map((incident) => {
                const style = INCIDENT_STYLE[incident.incident_type] || INCIDENT_STYLE.ACCIDENT;
                const Icon = style.icon;
                return (
                  <button
                    key={incident.incident_id}
                    type="button"
                    onClick={() => navigate("emergency")}
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-white/5"
                  >
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${style.tone}`}>
                      <Icon size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">
                        {style.label} — {incidentPlace(incident)}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        <span className={SEVERITY_TONE[incident.severity] || ""}>{incident.severity}</span> · {timeOf(incident.reported_at)}
                      </span>
                    </span>
                    <ChevronRight size={16} className="text-slate-600" />
                  </button>
                );
              })}
            </div>
          </div>

          <AiAssistant metrics={metrics} />

          <div className="iccc-panel p-4 md:col-span-2 xl:col-span-1">
            <PanelHeader icon={Video} title="Live Cameras" color="#38bdf8" action="Mobility" onAction={() => navigate("mobility")} />
            <CameraFeed />
          </div>
        </div>
      </div>

      {/* ================= BOTTOM ROW ================= */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <div className="iccc-panel p-4">
          <PanelHeader icon={Sparkles} title="Recent Events" color="#38bdf8" />
          <div className="space-y-2.5">
            {events.length === 0 && <div className="py-6 text-center text-xs text-slate-500">Waiting for live events…</div>}
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-3 text-xs">
                <span className="w-10 shrink-0 font-mono text-slate-500">{event.time}</span>
                <event.icon size={14} className={`mt-0.5 shrink-0 ${event.tone}`} />
                <span className="text-slate-300">{event.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="iccc-panel p-4">
          <PanelHeader icon={Boxes} title="3D Scenario Simulation" color="#a78bfa" />
          <div className="relative overflow-hidden rounded-xl border border-violet-400/20 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.35),transparent_55%),radial-gradient(circle_at_80%_80%,rgba(14,165,233,0.3),transparent_50%),#050a12] p-4">
            <div className="text-sm font-bold">See how Chennai ICCC responds</div>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Step-by-step 3D replay: detection → AI triage → human approval → dispatch with green corridor → resolution.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                ["accident", "Accident", Ambulance, "#ef4444"],
                ["fire", "Fire", Flame, "#f97316"],
                ["flood", "Flood", CloudRain, "#38bdf8"],
              ].map(([id, label, Icon, color]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => navigate("simulation", { scenario: id })}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-950/60 px-2.5 py-1.5 text-xs font-semibold hover:border-slate-400"
                >
                  <Icon size={14} style={{ color }} /> {label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("simulation")}
            className="mt-3 w-full rounded-lg bg-violet-600 py-2 text-xs font-semibold hover:bg-violet-500"
          >
            Open 3D Emergency Simulation
          </button>
        </div>

        <div className="iccc-panel p-4">
          <PanelHeader icon={Zap} title="Quick Actions" color="#f59e0b" />
          <div className="space-y-1">
            {[
              ["Simulate road accident response", Ambulance, () => navigate("simulation", { scenario: "accident" })],
              ["Simulate building fire", Flame, () => navigate("simulation", { scenario: "fire" })],
              ["Simulate heavy rainfall (60 mm/hr)", CloudRain, () => navigate("simulation", { scenario: "flood" })],
              ["Optimize ambulance routing", Route, () => navigate("ai")],
              ["Generate waste collection route", Recycle, () => navigate("waste")],
            ].map(([label, Icon, action]) => (
              <button
                key={label}
                type="button"
                onClick={action}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-xs text-slate-300 hover:bg-white/5 hover:text-white"
              >
                <Icon size={15} className="text-slate-400" />
                <span className="flex-1">{label}</span>
                <ChevronRight size={14} className="text-slate-600" />
              </button>
            ))}
          </div>
        </div>

        <div className="iccc-panel p-4">
          <PanelHeader icon={Cpu} title="System Status" color="#22c55e" />
          <div className="space-y-2.5 text-xs">
            {[
              ["IoT Sensors", Radio, "6 / 6 online", true],
              ["Camera Feeds", Video, DEMO_MODE ? "Simulated" : "Online", true],
              ["AI Services", Bot, DEMO_MODE ? "Demo engine" : "Gemini + RAG", true],
              ["Database", Database, DEMO_MODE ? "In-browser" : "PostgreSQL + PostGIS", true],
              ["Real-time Link", Wifi, connected ? "Connected" : "Connecting…", connected],
            ].map(([label, Icon, status, ok]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-300">
                  <Icon size={14} className="text-slate-500" />
                  {label}
                </span>
                <span className="flex items-center gap-2 text-slate-400">
                  <span className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-amber-400"}`} />
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
