import { useEffect, useRef, useState } from "react";
import {
  Ambulance,
  CheckCircle2,
  Circle,
  CloudRain,
  Flame,
  Gauge,
  ListChecks,
  LoaderCircle,
  Move3d,
  Pause,
  Play,
  RotateCcw,
  Siren,
  Video,
  X,
} from "lucide-react";

import { SimEngine, formatClock } from "../sim3d/SimEngine";
import { SCENARIOS } from "../sim3d/scenarios";

const SCENARIO_ICONS = { accident: Ambulance, fire: Flame, flood: CloudRain };
const SCENARIO_ORDER = ["accident", "fire", "flood"];

const LOG_TONE = {
  stage: "text-sky-300 font-semibold",
  alert: "text-rose-300",
  ai: "text-violet-300",
  action: "text-amber-200",
  success: "text-emerald-300",
  info: "text-slate-300",
};

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function Timeline({ scenario, state, compact = false }) {
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [state?.logs?.length]);

  if (!scenario || !state) return null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="text-[11px] font-bold tracking-[0.16em] text-slate-400">RESPONSE WORKFLOW</div>
      <ol className="mt-3 space-y-1.5">
        {scenario.stages.map((stage, index) => {
          const done = index < state.stageIndex || (state.finished && index === state.stageIndex);
          const active = index === state.stageIndex && !state.finished;
          return (
            <li
              key={stage.title}
              className={`flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition ${
                active ? "bg-sky-500/10 ring-1 ring-sky-400/40" : ""
              }`}
            >
              <span className="mt-0.5 shrink-0">
                {done ? (
                  <CheckCircle2 size={15} className="text-emerald-400" />
                ) : active ? (
                  <LoaderCircle size={15} className="animate-spin text-sky-300" />
                ) : (
                  <Circle size={15} className="text-slate-600" />
                )}
              </span>
              <span className="min-w-0">
                <span className={`block text-[12px] leading-tight ${active ? "text-white" : done ? "text-slate-300" : "text-slate-500"}`}>
                  {stage.title}
                </span>
                {!compact && (active || done) && (
                  <span className="mt-0.5 block text-[10px] text-slate-500">{stage.system}</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 text-[11px] font-bold tracking-[0.16em] text-slate-400">EVENT LOG</div>
      <div ref={logRef} className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 font-mono text-[11px] leading-snug">
        {state.logs.map((entry) => (
          <div key={entry.id} className="flex gap-2">
            <span className="shrink-0 text-slate-600">{formatClock(entry.time)}</span>
            <span className={LOG_TONE[entry.kind] || LOG_TONE.info}>
              {entry.kind === "stage" ? `▸ ${entry.text}` : entry.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmergencySim3D({ initialScenario = "accident" }) {
  const mountRef = useRef(null);
  const engineRef = useRef(null);
  const [state, setState] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState(() => (supportsWebGL() ? null : "WebGL is not available in this browser."));

  useEffect(() => {
    if (error || !mountRef.current) return undefined;
    let engine;
    try {
      engine = new SimEngine(mountRef.current, { onChange: setState });
      engine.start(SCENARIOS[initialScenario] ? initialScenario : "accident");
      engineRef.current = engine;
    } catch (failure) {
      console.error(failure);
      queueMicrotask(() => setError("The 3D engine could not start on this device."));
    }
    return () => {
      engine?.dispose();
      engineRef.current = null;
    };
    // The engine is created once; scenario switches go through engine.start().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scenario = state ? SCENARIOS[state.scenarioId] : null;
  const stage = scenario?.stages[state.stageIndex];
  const engine = engineRef.current;
  const progress = scenario ? ((state.stageIndex + (state.finished ? 1 : 0.5)) / scenario.stages.length) * 100 : 0;

  const choose = (id) => {
    engine?.start(id);
    setSheetOpen(false);
  };

  const nextScenario = () => {
    const index = SCENARIO_ORDER.indexOf(state.scenarioId);
    choose(SCENARIO_ORDER[(index + 1) % SCENARIO_ORDER.length]);
  };

  return (
    <div className="relative h-[calc(100dvh-64px)] w-full overflow-hidden bg-[#050a12] lg:h-[calc(100dvh-72px)]">
      <div ref={mountRef} className="absolute inset-0 isolate" />

      {error && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <div className="max-w-sm rounded-2xl border border-rose-500/30 bg-slate-950/90 p-6">
            <Siren className="mx-auto text-rose-400" />
            <p className="mt-3 font-semibold">3D simulation unavailable</p>
            <p className="mt-1 text-sm text-slate-400">{error} Try a recent version of Chrome, Edge, Safari or Firefox.</p>
          </div>
        </div>
      )}

      {!state && !error && (
        <div className="absolute inset-0 grid place-items-center text-sm text-slate-400">
          <span className="flex items-center gap-2">
            <LoaderCircle className="animate-spin" size={18} /> Building the city…
          </span>
        </div>
      )}

      {state && scenario && (
        <>
          {/* Scenario picker + clock */}
          <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="pointer-events-auto flex gap-1.5 overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-950/80 p-1.5 backdrop-blur-md">
              {SCENARIO_ORDER.map((id) => {
                const Icon = SCENARIO_ICONS[id];
                const active = state.scenarioId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => choose(id)}
                    className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`}
                    style={active ? { boxShadow: `inset 0 0 0 1px ${SCENARIOS[id].color}88` } : undefined}
                  >
                    <Icon size={15} style={{ color: SCENARIOS[id].color }} />
                    {SCENARIOS[id].title}
                  </button>
                );
              })}
            </div>

            <div className="pointer-events-auto flex items-center gap-2 self-start rounded-xl border border-slate-700/50 bg-slate-950/80 px-3 py-2 backdrop-blur-md">
              <span className={`h-2 w-2 rounded-full ${state.finished ? "bg-emerald-400" : "animate-pulse bg-rose-500"}`} />
              <span className="text-[10px] font-bold tracking-[0.14em] text-slate-400">MISSION CLOCK</span>
              <span className="font-mono text-sm font-bold tabular-nums text-white">{formatClock(state.clock)}</span>
            </div>
          </div>

          {/* Live KPIs */}
          <div className="pointer-events-none absolute left-3 top-[108px] hidden gap-2 sm:top-[64px] md:flex md:flex-col">
            {[
              ["Signals pre-empted", state.overrides, "text-emerald-300"],
              ["Vehicles gave way", state.yielded, "text-amber-200"],
            ].map(([label, value, tone]) => (
              <div key={label} className="rounded-xl border border-slate-700/50 bg-slate-950/75 px-3 py-2 backdrop-blur-md">
                <div className="text-[9px] font-bold tracking-[0.14em] text-slate-500">{label.toUpperCase()}</div>
                <div className={`font-mono text-lg font-bold tabular-nums ${tone}`}>{value}</div>
              </div>
            ))}
          </div>

          {/* Desktop timeline */}
          <aside className="absolute bottom-3 right-3 top-[64px] hidden w-[330px] flex-col rounded-2xl border border-slate-700/50 bg-slate-950/80 p-4 backdrop-blur-md lg:flex">
            <Timeline scenario={scenario} state={state} />
          </aside>

          {/* Stage caption + controls */}
          <div className="absolute inset-x-3 bottom-3 flex flex-col gap-2 lg:right-[348px]">
            <div className="flex items-center gap-1.5 self-start rounded-xl border border-slate-700/50 bg-slate-950/85 p-1.5 backdrop-blur-md">
              <button
                type="button"
                onClick={() => engine?.togglePlay()}
                className="grid h-9 w-9 place-items-center rounded-lg bg-sky-500 text-white hover:bg-sky-400"
                aria-label={state.playing ? "Pause" : "Play"}
              >
                {state.playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button
                type="button"
                onClick={() => engine?.restart()}
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 hover:bg-white/10"
                aria-label="Restart"
              >
                <RotateCcw size={16} />
              </button>
              <span className="mx-1 h-6 w-px bg-slate-700" />
              <Gauge size={14} className="ml-1 text-slate-500" />
              {[1, 2, 4].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => engine?.setSpeed(speed)}
                  className={`h-9 rounded-lg px-2.5 font-mono text-xs font-bold ${
                    state.speed === speed ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {speed}×
                </button>
              ))}
              <span className="mx-1 h-6 w-px bg-slate-700" />
              <button
                type="button"
                onClick={() => engine?.setCameraMode(state.cameraMode === "auto" ? "free" : "auto")}
                className={`flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold ${
                  state.cameraMode === "auto" ? "bg-violet-500/20 text-violet-200" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Auto camera follows the action. Drag the scene to look around freely."
              >
                {state.cameraMode === "auto" ? <Video size={14} /> : <Move3d size={14} />}
                <span className="hidden sm:inline">{state.cameraMode === "auto" ? "Auto camera" : "Free camera"}</span>
              </button>
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 lg:hidden"
              >
                <ListChecks size={15} /> Steps
              </button>
            </div>

            <div className="rounded-2xl border border-slate-700/50 bg-slate-950/85 p-4 backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] text-slate-500">
                  STEP {state.stageIndex + 1}/{scenario.stages.length}
                </span>
                <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold text-sky-200">
                  {stage.system}
                </span>
              </div>
              <div className="mt-1.5 text-base font-bold text-white sm:text-lg">{stage.title}</div>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-400">{stage.desc}</p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progress}%`, background: scenario.color }}
                />
              </div>
            </div>
          </div>

          {/* Mobile steps sheet */}
          {sheetOpen && (
            <div className="absolute inset-0 z-20 flex items-end bg-black/50 lg:hidden" onClick={() => setSheetOpen(false)}>
              <div
                className="flex h-[72%] w-full flex-col rounded-t-2xl border-t border-slate-700 bg-slate-950 p-4"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold">{scenario.title}</span>
                  <button type="button" onClick={() => setSheetOpen(false)} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Close">
                    <X size={18} />
                  </button>
                </div>
                <Timeline scenario={scenario} state={state} compact />
              </div>
            </div>
          )}

          {/* Summary */}
          {state.finished && state.summary && (
            <div className="absolute inset-0 z-30 grid place-items-center bg-black/45 p-4 backdrop-blur-[2px]">
              <div className="w-full max-w-md rounded-2xl border border-emerald-400/30 bg-slate-950/95 p-6 shadow-[0_0_60px_rgba(16,185,129,0.15)]">
                <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.16em] text-emerald-300">
                  <CheckCircle2 size={16} /> INCIDENT RESOLVED
                </div>
                <h2 className="mt-2 text-xl font-bold">{scenario.title} — response summary</h2>
                <p className="mt-1 text-sm text-slate-400">Times are simulated city time on the mission clock.</p>
                <dl className="mt-4 divide-y divide-slate-800 rounded-xl border border-slate-800">
                  {state.summary.map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <dt className="text-slate-400">{label}</dt>
                      <dd className="font-mono font-semibold text-white">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => engine?.restart()}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold hover:bg-white/5"
                  >
                    <RotateCcw size={15} /> Replay
                  </button>
                  <button
                    type="button"
                    onClick={nextScenario}
                    className="flex-1 rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-400"
                  >
                    Next scenario
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default EmergencySim3D;
