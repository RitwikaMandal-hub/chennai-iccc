import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Boxes,
  BrainCircuit,
  Car,
  CloudRain,
  CloudSun,
  House,
  LoaderCircle,
  Menu,
  Recycle,
  Search,
  Siren,
  X,
} from "lucide-react";

import Dashboard from "./components/Dashboard";
import { DEMO_MODE, SOCKET_URL } from "./lib/config";
import { navigate, readRoute } from "./lib/router";
import { io } from "./lib/socket";

const SmartMobility = lazy(() => import("./pages/SmartMobility"));
const FloodDisaster = lazy(() => import("./pages/FloodDisaster"));
const EmergencyResponse = lazy(() => import("./pages/EmergencyResponse"));
const AIOperations = lazy(() => import("./pages/AIOperations"));
const WasteEWaste = lazy(() => import("./pages/WasteEWaste"));
const EmergencySim3D = lazy(() => import("./pages/EmergencySim3D"));

const navItems = [
  { id: "dashboard", label: "Command Center", icon: House },
  { id: "simulation", label: "3D Simulation", icon: Boxes, badge: "3D" },
  { id: "mobility", label: "Smart Mobility", icon: Car },
  { id: "flood", label: "Flood & Disaster", icon: CloudRain },
  { id: "emergency", label: "Emergency Response", icon: Siren },
  { id: "ai", label: "AI Operations", icon: BrainCircuit },
  { id: "waste", label: "Waste & E-Waste", icon: Recycle },
];

const pageIds = navItems.map((item) => item.id);

function useRoute() {
  const [route, setRoute] = useState(() => readRoute(pageIds));
  useEffect(() => {
    const update = () => {
      setRoute(readRoute(pageIds));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return route;
}

function useHeaderFeed() {
  const [feed, setFeed] = useState({ online: false, temperature: null });
  useEffect(() => {
    const socket = io(SOCKET_URL);
    socket.on("connect", () => setFeed((previous) => ({ ...previous, online: true })));
    socket.on("disconnect", () => setFeed((previous) => ({ ...previous, online: false })));
    socket.on("simulation-update", (data) => setFeed({ online: true, temperature: data.temperature }));
    return () => socket.disconnect();
  }, []);
  return feed;
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="hidden text-right md:block">
      <div className="text-[11px] text-slate-400">
        {now.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
      </div>
      <div className="font-mono text-lg font-bold tabular-nums leading-tight text-white">
        {now.toLocaleTimeString("en-IN", { hour12: false })}
      </div>
    </div>
  );
}

function SearchBox() {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return [];
    return navItems.filter((item) => item.label.toLowerCase().includes(text) || item.id.includes(text));
  }, [query]);

  const go = (item) => {
    navigate(item.id);
    setQuery("");
  };

  return (
    <div className="relative hidden max-w-md flex-1 lg:block">
      <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && matches[0]) go(matches[0]);
          if (event.key === "Escape") setQuery("");
        }}
        placeholder="Search modules — traffic, flood, 3D simulation…"
        className="h-10 w-full rounded-full border border-slate-700/60 bg-slate-900/60 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-500/60"
      />
      {matches.length > 0 && (
        <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl">
          {matches.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => go(item)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-sky-500/10"
            >
              <item.icon size={16} className="text-sky-300" />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NavList({ page, onSelect }) {
  return (
    <nav className="flex flex-col gap-1 p-3">
      {navItems.map(({ id, label, icon: Icon, badge }) => {
        const active = page === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`group relative flex h-11 items-center gap-3 rounded-lg px-3 text-left text-[13px] font-medium transition ${
              active
                ? "bg-gradient-to-r from-sky-500/25 to-sky-500/5 text-white"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
            }`}
          >
            {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-sky-400 shadow-[0_0_10px_#38bdf8]" />}
            <Icon size={18} className={active ? "text-sky-300" : "text-slate-500 group-hover:text-slate-300"} />
            <span className="flex-1">{label}</span>
            {badge && (
              <span className="rounded-md border border-violet-400/40 bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-bold text-violet-200">
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

function PageFallback() {
  return (
    <div className="grid h-[60vh] place-items-center text-sm text-slate-400">
      <span className="flex items-center gap-2">
        <LoaderCircle size={18} className="animate-spin" /> Loading module…
      </span>
    </div>
  );
}

function App() {
  const { page, params } = useRoute();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const feed = useHeaderFeed();

  const select = (id) => {
    navigate(id);
    setDrawerOpen(false);
  };

  const content = {
    dashboard: <Dashboard />,
    simulation: <EmergencySim3D key={params.scenario || "default"} initialScenario={params.scenario} />,
    mobility: <SmartMobility />,
    flood: <FloodDisaster />,
    emergency: <EmergencyResponse />,
    ai: <AIOperations />,
    waste: <WasteEWaste />,
  }[page];

  return (
    <div className="min-h-dvh bg-[#020a14] text-white">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-[1100] h-16 border-b border-sky-500/15 bg-[#030d1a]/95 backdrop-blur-xl lg:h-[72px]">
        <div className="flex h-full items-center gap-3 px-3 sm:px-4 lg:gap-6 lg:px-5">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-lg text-slate-300 hover:bg-white/5 lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <button type="button" onClick={() => select("dashboard")} className="flex items-center gap-3 text-left lg:w-[232px]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-sky-400/40 bg-gradient-to-br from-sky-500/30 to-emerald-500/10 text-sky-200 shadow-[0_0_20px_rgba(56,189,248,0.25)] lg:h-11 lg:w-11">
              <Activity size={21} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-extrabold tracking-wide lg:text-[17px]">CHENNAI AI ICCC</span>
              <span className="hidden whitespace-nowrap text-[10px] text-slate-400 sm:block">Integrated Command &amp; Control Centre</span>
              <span className="hidden text-[9px] tracking-wide text-sky-300/80 lg:block">• Safer • Smarter • Greener</span>
            </span>
          </button>

          <SearchBox />

          <div className="ml-auto flex items-center gap-3 lg:gap-5">
            <Clock />
            <div className="hidden items-center gap-2 border-l border-slate-700/50 pl-4 sm:flex">
              <CloudSun size={26} className="text-sky-300" />
              <div className="leading-tight">
                <div className="text-[10px] text-slate-400">Chennai</div>
                <div className="font-mono text-base font-bold">
                  {feed.temperature != null ? `${Number(feed.temperature).toFixed(1)}°C` : "—"}
                </div>
              </div>
            </div>
            <div
              className="flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300"
              title={DEMO_MODE ? "Running on the built-in city simulation (no backend required)" : "Connected to the ICCC backend"}
            >
              <span className={`h-2 w-2 rounded-full ${feed.online ? "animate-pulse bg-emerald-400" : "bg-amber-400"}`} />
              <span className="hidden sm:inline">{DEMO_MODE ? "Live Demo" : feed.online ? "System Online" : "Connecting"}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
        {/* ================= SIDEBAR (desktop) ================= */}
        <aside className="sticky top-[72px] hidden h-[calc(100dvh-72px)] flex-col border-r border-sky-500/10 bg-[#030c18] lg:flex">
          <NavList page={page} onSelect={select} />
          <div className="mt-auto p-4">
            <div className="rounded-xl border border-sky-500/15 bg-gradient-to-b from-sky-500/10 to-transparent p-4">
              <div className="text-sm font-bold">Chennai</div>
              <div className="text-[11px] text-slate-400">A Smarter Tomorrow, Together</div>
              <button
                type="button"
                onClick={() => select("simulation")}
                className="mt-3 w-full rounded-lg bg-sky-500/90 px-3 py-2 text-xs font-semibold hover:bg-sky-400"
              >
                Launch 3D simulation
              </button>
            </div>
          </div>
        </aside>

        {/* ================= DRAWER (mobile) ================= */}
        {drawerOpen && (
          <div className="fixed inset-0 z-[1200] lg:hidden" onClick={() => setDrawerOpen(false)}>
            <div className="absolute inset-0 bg-black/60" />
            <div
              className="absolute inset-y-0 left-0 w-[78%] max-w-[300px] border-r border-slate-800 bg-[#030c18]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
                <span className="text-sm font-bold">Modules</span>
                <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-lg p-2 hover:bg-white/5" aria-label="Close menu">
                  <X size={18} />
                </button>
              </div>
              <NavList page={page} onSelect={select} />
            </div>
          </div>
        )}

        <main className="min-w-0">
          <Suspense fallback={<PageFallback />}>{content}</Suspense>
        </main>
      </div>
    </div>
  );
}

export default App;
