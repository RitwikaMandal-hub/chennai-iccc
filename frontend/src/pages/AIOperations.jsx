import { useEffect, useMemo, useState } from "react";
import { io } from "../lib/socket";
import { API_URL, AI_URL, SOCKET_URL } from "../lib/config";
import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  CloudRain,
  Gauge,
  GitBranch,
  Loader2,
  Radio,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  TrafficCone,
  TriangleAlert,
  Truck,
  Waves,
  XCircle,
} from "lucide-react";


const scenarios = [
  {
    id: "traffic",
    title: "Traffic Surge",
    description:
      "Simulate a sudden increase in city-wide traffic and evaluate mobility impact.",
    icon: TrafficCone,
    prompt:
      "Run a Chennai ICCC what-if analysis for a 40% increase in traffic. Explain the predicted impact, affected mobility conditions, emergency-response implications, and recommended mitigation actions. Use available tools if appropriate. Clearly label this as a simulation.",
  },
  {
    id: "rainfall",
    title: "Extreme Rainfall",
    description:
      "Evaluate severe rainfall conditions and their possible flood-response implications.",
    icon: CloudRain,
    prompt:
      "Run a Chennai ICCC what-if analysis for extreme rainfall conditions with a 60% increase in rainfall. Assess possible flood-risk consequences, affected mobility, emergency routes, and recommended response actions. Clearly label this as a simulation.",
  },
  {
    id: "closure",
    title: "Road Closure",
    description:
      "Simulate a major road closure and evaluate congestion and emergency routing.",
    icon: GitBranch,
    prompt:
      "Run a Chennai ICCC what-if analysis for a major road closure. Assess congestion propagation, emergency-route implications, alternative routing considerations, and recommended response actions. Clearly label this as a simulation.",
  },
  {
    id: "sensor",
    title: "Sensor Failure",
    description:
      "Test how the digital twin responds when a critical sensor becomes unreliable.",
    icon: Radio,
    prompt:
      "Run a Chennai ICCC what-if analysis for a critical sensor failure. Explain how the system should validate the sensor against nearby observations, identify unreliable data, estimate the situation, and maintain safe city operations. Clearly label this as a simulation.",
  },
];

function getTrafficLevel(value) {
  if (value >= 75) return "HIGH";
  if (value >= 50) return "MODERATE";
  return "NORMAL";
}

function getTrafficClass(value) {
  if (value >= 75) {
    return "text-red-400";
  }

  if (value >= 50) {
    return "text-amber-400";
  }

  return "text-emerald-400";
}

function getSensorStatus(sensor) {
  const status = String(sensor?.status || "").toUpperCase();

  if (
    status.includes("OFF") ||
    status.includes("FAIL") ||
    status.includes("INACTIVE")
  ) {
    return "OFFLINE";
  }

  return "ONLINE";
}

function AIOperations() {
  const [roads, setRoads] = useState([]);
  const [junctions, setJunctions] = useState([]);
  const [sensors, setSensors] = useState([]);

  const [liveVehicles, setLiveVehicles] = useState([]);
  const [liveIncidents, setLiveIncidents] = useState([]);
  const [, setLiveSignals] = useState([]);

  const [prompt, setPrompt] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);

  const [approvalPlan, setApprovalPlan] = useState(null);
  const [approvalLoading, setApprovalLoading] = useState(false);

  const [execution, setExecution] = useState(null);
  const [rejected, setRejected] = useState(false);

  const [lastUpdated, setLastUpdated] = useState(null);
  const [aiOnline, setAiOnline] = useState(true);

  /* =========================================================
     LOAD CITY DATA
     ========================================================= */

  useEffect(() => {
    async function loadCityData() {
      try {
        const [roadsResponse, junctionsResponse, sensorsResponse] =
          await Promise.all([
            fetch(`${API_URL}/api/roads`),
            fetch(`${API_URL}/api/junctions`),
            fetch(`${API_URL}/api/sensors`),
          ]);

        const roadsData = await roadsResponse.json();
        const junctionsData = await junctionsResponse.json();
        const sensorsData = await sensorsResponse.json();

        setRoads(Array.isArray(roadsData) ? roadsData : []);
        setJunctions(
          Array.isArray(junctionsData) ? junctionsData : []
        );
        setSensors(
          Array.isArray(sensorsData) ? sensorsData : []
        );

        setLastUpdated(new Date());
      } catch (error) {
        console.error("AI Operations city data error:", error);
      }
    }

    loadCityData();
  }, []);

  /* =========================================================
     LIVE SOCKET.IO DATA
     ========================================================= */

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on("simulation-update", (data) => {
      if (data.vehicles) {
        setLiveVehicles(data.vehicles);
      }

      if (data.incidents) {
        setLiveIncidents(data.incidents);
      }

      if (data.signals) {
        setLiveSignals(data.signals);
      }

      if (data.junctions) {
        setJunctions((previous) =>
          previous.map((junction) => {
            const live = data.junctions.find(
              (item) =>
                item.junction_id === junction.junction_id
            );

            if (!live) {
              return junction;
            }

            return {
              ...junction,
              traffic_level:
                live.traffic_level ??
                junction.traffic_level,
              congestion_level:
                live.congestion_level ??
                junction.congestion_level,
              status:
                live.status ??
                junction.status,
            };
          })
        );
      }

      setLastUpdated(new Date());
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  /* =========================================================
     LIVE CITY METRICS
     ========================================================= */

  const trafficAverage = useMemo(() => {
    const values = junctions
      .map((item) => Number(item.traffic_level))
      .filter((value) => Number.isFinite(value));

    if (values.length > 0) {
      return Math.round(
        values.reduce((sum, value) => sum + value, 0) /
          values.length
      );
    }

    const roadValues = roads
      .map((item) => Number(item.traffic_level))
      .filter((value) => Number.isFinite(value));

    if (roadValues.length > 0) {
      return Math.round(
        roadValues.reduce(
          (sum, value) => sum + value,
          0
        ) / roadValues.length
      );
    }

    return 0;
  }, [junctions, roads]);

  const trafficLabel = getTrafficLevel(trafficAverage);

  const onlineSensors = useMemo(
    () =>
      sensors.filter(
        (sensor) => getSensorStatus(sensor) === "ONLINE"
      ).length,
    [sensors]
  );

  const offlineSensors = sensors.length - onlineSensors;

  const activeIncidents = liveIncidents.length;

  const activeVehicles = liveVehicles.length;

  const congestedJunctions = useMemo(
    () =>
      junctions.filter(
        (junction) =>
          Number(junction.congestion_level) >= 70 ||
          Number(junction.traffic_level) >= 75
      ).length,
    [junctions]
  );

  const highestTrafficJunction = useMemo(() => {
    if (!junctions.length) {
      return null;
    }

    return junctions.reduce((highest, current) => {
      const currentValue =
        Number(current.traffic_level) || 0;

      const highestValue =
        Number(highest?.traffic_level) || 0;

      return currentValue > highestValue
        ? current
        : highest;
    }, junctions[0]);
  }, [junctions]);

  /* =========================================================
     AI ANALYSIS
     ========================================================= */

  async function runAnalysis(customPrompt = null) {
    const selectedPrompt =
      customPrompt !== null ? customPrompt : prompt;

    if (!selectedPrompt.trim()) {
      return;
    }

    setPrompt(selectedPrompt);
    setAnalysis("");
    setApprovalPlan(null);
    setExecution(null);
    setRejected(false);
    setLoading(true);

    try {
      const response = await fetch(
        `${AI_URL}/agent?prompt=${encodeURIComponent(
          selectedPrompt
        )}`
      );

      if (!response.ok) {
        throw new Error(
          `AI service returned ${response.status}`
        );
      }

      const data = await response.json();

      setAnalysis(
        data.response ||
          data.message ||
          "No AI response was returned."
      );

      setAiOnline(true);
    } catch (error) {
      console.error("AI Operations error:", error);

      setAiOnline(false);

      setAnalysis(
        "AI service could not be reached. Make sure the AI service is running on port 8100."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================================
     HUMAN APPROVAL
     ========================================================= */

  async function requestApproval() {
    setApprovalLoading(true);
    setRejected(false);
    setExecution(null);

    try {
      const response = await fetch(
        `${AI_URL}/approval-plan`
      );

      if (!response.ok) {
        throw new Error(
          `Approval API returned ${response.status}`
        );
      }

      const data = await response.json();

      setApprovalPlan(
        data.plan ||
          data.approved_actions ||
          data.actions ||
          data
      );
    } catch (error) {
      console.error("Approval plan error:", error);

      setApprovalPlan([
        {
          action: "NO_ACTIONS_AVAILABLE",
          allowed: false,
          reason:
            "Approval plan could not be retrieved.",
        },
      ]);
    } finally {
      setApprovalLoading(false);
    }
  }

  async function approvePlan() {
    setApprovalLoading(true);
    setRejected(false);

    try {
      const response = await fetch(
        `${AI_URL}/approval/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Approval execution returned ${response.status}`
        );
      }

      const data = await response.json();

      setExecution(data.execution || null);

      setApprovalPlan(
        data.approved_actions ||
          approvalPlan
      );
    } catch (error) {
      console.error(
        "Approval execution error:",
        error
      );
    } finally {
      setApprovalLoading(false);
    }
  }

  async function rejectPlan() {
    setApprovalLoading(true);

    try {
      const response = await fetch(
        `${AI_URL}/approval/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Rejection returned ${response.status}`
        );
      }

      const data = await response.json();

      setRejected(true);
      setExecution(data.execution || null);
    } catch (error) {
      console.error("Rejection error:", error);
    } finally {
      setApprovalLoading(false);
    }
  }

  function resetAll() {
    setPrompt("");
    setAnalysis("");
    setApprovalPlan(null);
    setExecution(null);
    setRejected(false);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="border-b border-slate-800 px-6 py-6">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-center gap-3">

            <div className="rounded-xl bg-violet-500/10 p-3">
              <BrainCircuit
                size={27}
                className="text-violet-400"
              />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                AI Operations
              </h1>

              <p className="text-sm text-slate-400">
                Chennai AI ICCC • Command Intelligence
                & Digital Twin
              </p>
            </div>

          </div>

          <div className="flex flex-wrap items-center gap-3">

            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              CITY DATA LIVE
            </div>

            <div
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${
                aiOnline
                  ? "border-violet-500/20 bg-violet-500/10 text-violet-300"
                  : "border-red-500/20 bg-red-500/10 text-red-300"
              }`}
            >
              <Sparkles size={15} />
              {aiOnline
                ? "AI AGENT ONLINE"
                : "AI AGENT OFFLINE"}
            </div>

          </div>

        </div>
      </div>

      <div className="p-6">

        {/* =====================================================
            LIVE CITY INTELLIGENCE
            ===================================================== */}

        <div className="mb-6">

          <div className="mb-4 flex items-end justify-between">

            <div>
              <h2 className="text-lg font-semibold">
                Live City Intelligence
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Current digital-twin conditions from the
                ICCC data layer.
              </p>
            </div>

            {lastUpdated && (
              <div className="hidden text-xs text-slate-600 md:block">
                Updated{" "}
                {lastUpdated.toLocaleTimeString()}
              </div>
            )}

          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">

            {/* Traffic */}

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

              <div className="flex items-center justify-between">
                <TrafficCone
                  size={19}
                  className="text-amber-400"
                />

                <span
                  className={`text-xs font-semibold ${getTrafficClass(
                    trafficAverage
                  )}`}
                >
                  {trafficLabel}
                </span>
              </div>

              <div className="mt-4 text-3xl font-bold">
                {trafficAverage}%
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Average traffic load
              </div>

            </div>

            {/* Congestion */}

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

              <div className="flex items-center justify-between">
                <Gauge
                  size={19}
                  className="text-red-400"
                />

                <span className="text-xs text-slate-500">
                  JUNCTIONS
                </span>
              </div>

              <div className="mt-4 text-3xl font-bold">
                {congestedJunctions}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                High congestion zones
              </div>

            </div>

            {/* Incidents */}

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

              <div className="flex items-center justify-between">
                <TriangleAlert
                  size={19}
                  className="text-amber-400"
                />

                <span className="text-xs text-slate-500">
                  LIVE
                </span>
              </div>

              <div className="mt-4 text-3xl font-bold">
                {activeIncidents}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Active incidents
              </div>

            </div>

            {/* Sensors */}

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

              <div className="flex items-center justify-between">
                <Radio
                  size={19}
                  className="text-cyan-400"
                />

                <span className="text-xs text-emerald-400">
                  {onlineSensors} ONLINE
                </span>
              </div>

              <div className="mt-4 text-3xl font-bold">
                {sensors.length}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Registered sensors
              </div>

            </div>

            {/* Vehicles */}

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

              <div className="flex items-center justify-between">
                <Truck
                  size={19}
                  className="text-violet-400"
                />

                <span className="text-xs text-slate-500">
                  SOCKET.IO
                </span>
              </div>

              <div className="mt-4 text-3xl font-bold">
                {activeVehicles}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Simulated vehicles
              </div>

            </div>

          </div>
        </div>

        {/* =====================================================
            OPERATIONS SNAPSHOT
            ===================================================== */}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* Current situation */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <div className="flex items-center gap-3">
              <Activity
                size={20}
                className="text-cyan-400"
              />

              <div>
                <h2 className="font-semibold">
                  Current City Situation
                </h2>

                <p className="text-xs text-slate-500">
                  Digital-twin operational snapshot
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">

              <div className="flex items-center justify-between rounded-xl bg-slate-950 p-4">
                <span className="text-sm text-slate-400">
                  Traffic condition
                </span>

                <span
                  className={`text-sm font-semibold ${getTrafficClass(
                    trafficAverage
                  )}`}
                >
                  {trafficLabel}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-950 p-4">
                <span className="text-sm text-slate-400">
                  Highest traffic point
                </span>

                <span className="text-right text-sm font-semibold">
                  {highestTrafficJunction?.junction_name ||
                    "N/A"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-950 p-4">
                <span className="text-sm text-slate-400">
                  Active incidents
                </span>

                <span className="text-sm font-semibold text-amber-400">
                  {activeIncidents}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-950 p-4">
                <span className="text-sm text-slate-400">
                  Sensor availability
                </span>

                <span className="text-sm font-semibold text-emerald-400">
                  {onlineSensors}/{sensors.length}
                </span>
              </div>

              {offlineSensors > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-300">
                  <TriangleAlert size={15} />
                  {offlineSensors} sensor
                  {offlineSensors > 1 ? "s" : ""} currently
                  unavailable.
                </div>
              )}

            </div>

          </div>

          {/* AI architecture */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <div className="flex items-center gap-3">
              <BrainCircuit
                size={20}
                className="text-violet-400"
              />

              <div>
                <h2 className="font-semibold">
                  AI Intelligence Stack
                </h2>

                <p className="text-xs text-slate-500">
                  Agent reasoning pipeline
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">

              <div className="flex items-center justify-between rounded-xl bg-slate-950 p-4">
                <div className="flex items-center gap-3">
                  <Radio
                    size={16}
                    className="text-cyan-400"
                  />
                  <span className="text-sm">
                    Live Data
                  </span>
                </div>

                <span className="text-xs text-emerald-400">
                  CONNECTED
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-950 p-4">
                <div className="flex items-center gap-3">
                  <Gauge
                    size={16}
                    className="text-amber-400"
                  />
                  <span className="text-sm">
                    ML Prediction
                  </span>
                </div>

                <span className="text-xs text-emerald-400">
                  READY
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-950 p-4">
                <div className="flex items-center gap-3">
                  <BrainCircuit
                    size={16}
                    className="text-violet-400"
                  />
                  <span className="text-sm">
                    RAG Knowledge
                  </span>
                </div>

                <span className="text-xs text-emerald-400">
                  READY
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-950 p-4">
                <div className="flex items-center gap-3">
                  <Route
                    size={16}
                    className="text-blue-400"
                  />
                  <span className="text-sm">
                    Tool Calling
                  </span>
                </div>

                <span className="text-xs text-emerald-400">
                  AVAILABLE
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-950 p-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck
                    size={16}
                    className="text-emerald-400"
                  />
                  <span className="text-sm">
                    Human Approval
                  </span>
                </div>

                <span className="text-xs text-emerald-400">
                  ENABLED
                </span>
              </div>

            </div>

          </div>

          {/* Operations status */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">

            <div className="flex items-center gap-3">
              <Waves
                size={20}
                className="text-blue-400"
              />

              <div>
                <h2 className="font-semibold">
                  Operational Status
                </h2>

                <p className="text-xs text-slate-500">
                  Current simulation environment
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">

              <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2
                    size={17}
                    className="text-emerald-400"
                  />

                  <div>
                    <div className="text-sm font-medium">
                      Digital Twin Online
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      City simulation layer is active.
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-violet-500/10 bg-violet-500/5 p-4">
                <div className="flex items-center gap-3">
                  <Sparkles
                    size={17}
                    className="text-violet-400"
                  />

                  <div>
                    <div className="text-sm font-medium">
                      AI Decision Support
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      Agent available for scenario analysis.
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck
                    size={17}
                    className="text-amber-400"
                  />

                  <div>
                    <div className="text-sm font-medium">
                      Execution Protected
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      Operator approval required.
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* =====================================================
            WHAT-IF SCENARIOS
            ===================================================== */}

        <div className="mt-6">

          <div className="mb-4">
            <h2 className="text-lg font-semibold">
              Digital Twin What-If Scenarios
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Test hypothetical conditions without affecting
              the simulated city environment.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

            {scenarios.map((scenario) => {
              const Icon = scenario.icon;

              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() =>
                    runAnalysis(scenario.prompt)
                  }
                  disabled={loading}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-violet-500/40 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >

                  <div className="flex items-start justify-between">

                    <div className="rounded-xl bg-violet-500/10 p-3">
                      <Icon
                        size={21}
                        className="text-violet-400"
                      />
                    </div>

                    <Sparkles
                      size={15}
                      className="text-slate-600"
                    />

                  </div>

                  <h3 className="mt-4 font-semibold">
                    {scenario.title}
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {scenario.description}
                  </p>

                  <div className="mt-4 text-xs font-medium text-violet-400">
                    RUN SIMULATION →
                  </div>

                </button>
              );
            })}

          </div>
        </div>

        {/* =====================================================
            AI COMMAND CENTER
            ===================================================== */}

        <div className="mt-6 rounded-2xl border border-violet-500/20 bg-slate-900">

          <div className="border-b border-slate-800 px-5 py-4">

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-violet-500/10 p-2">
                  <Sparkles
                    size={20}
                    className="text-violet-400"
                  />
                </div>

                <div>
                  <h2 className="font-semibold">
                    AI Operations Agent
                  </h2>

                  <p className="text-xs text-slate-500">
                    Ask Gemini to reason over the simulated
                    Chennai city environment.
                  </p>
                </div>

              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Agent endpoint connected
              </div>

            </div>

          </div>

          <div className="p-5">

            <textarea
              value={prompt}
              onChange={(event) =>
                setPrompt(event.target.value)
              }
              placeholder="Example: Analyze a major accident near Anna Nagar and recommend an emergency response plan."
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500"
            />

            <div className="mt-4 flex flex-wrap gap-3">

              <button
                type="button"
                onClick={() => runAnalysis()}
                disabled={
                  loading ||
                  !prompt.trim()
                }
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-medium transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
              >

                {loading ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Sparkles size={17} />
                )}

                {loading
                  ? "Agent Reasoning..."
                  : "Run AI Analysis"}

              </button>

              <button
                type="button"
                onClick={resetAll}
                className="flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <RefreshCw size={16} />
                Reset
              </button>

            </div>

          </div>

        </div>

        {/* =====================================================
            AI RESPONSE
            ===================================================== */}

        {analysis && (
          <div className="mt-6 rounded-2xl border border-violet-500/20 bg-violet-500/5">

            <div className="border-b border-violet-500/10 px-5 py-4">

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">

                  <BrainCircuit
                    size={20}
                    className="text-violet-400"
                  />

                  <div>
                    <h2 className="font-semibold text-violet-300">
                      AI Analysis
                    </h2>

                    <p className="text-xs text-slate-500">
                      Gemini agent response
                    </p>
                  </div>

                </div>

                <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
                  DIGITAL TWIN
                </span>

              </div>

            </div>

            <div className="p-5">

              <div className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                {analysis}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="text-xs text-slate-500">
                    Data Context
                  </div>

                  <div className="mt-2 text-sm font-medium">
                    Live City Data
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="text-xs text-slate-500">
                    Reasoning Layer
                  </div>

                  <div className="mt-2 text-sm font-medium">
                    Gemini Agent
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="text-xs text-slate-500">
                    Execution
                  </div>

                  <div className="mt-2 text-sm font-medium text-amber-400">
                    Approval Required
                  </div>
                </div>

              </div>

              <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">

                <TriangleAlert
                  size={17}
                  className="mt-0.5 shrink-0 text-amber-400"
                />

                <p className="text-xs leading-5 text-slate-400">
                  AI output is a recommendation for the
                  digital-twin environment. Operational
                  actions require human approval.
                </p>

              </div>

            </div>
          </div>
        )}

        {/* =====================================================
            HUMAN APPROVAL
            ===================================================== */}

        {analysis && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900">

            <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 md:flex-row md:items-center md:justify-between">

              <div className="flex items-center gap-3">

                <ShieldCheck
                  size={20}
                  className="text-emerald-400"
                />

                <div>
                  <h2 className="font-semibold">
                    Human Approval Gate
                  </h2>

                  <p className="text-xs text-slate-500">
                    AI recommendations remain non-operational
                    until approved.
                  </p>
                </div>

              </div>

              <button
                type="button"
                onClick={requestApproval}
                disabled={approvalLoading}
                className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400 transition hover:bg-emerald-500/20 disabled:opacity-50"
              >

                {approvalLoading ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <ShieldCheck size={16} />
                )}

                Review Action Plan

              </button>

            </div>

            {approvalPlan && (
              <div className="p-5">

                <div className="mb-4 flex items-center gap-2 text-xs text-amber-400">
                  <TriangleAlert size={15} />
                  Operator review required
                </div>

                <div className="space-y-3">

                  {Array.isArray(approvalPlan) &&
                    approvalPlan.map(
                      (action, index) => (
                        <div
                          key={index}
                          className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                        >

                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

                            <div>
                              <div className="font-medium">
                                {action.action ??
                                  "Action"}
                              </div>

                              <div className="mt-1 text-xs leading-5 text-slate-500">
                                {action.reason ??
                                  "Human approval required before simulated execution."}
                              </div>
                            </div>

                            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-400">
                              APPROVAL REQUIRED
                            </span>

                          </div>

                        </div>
                      )
                    )}

                </div>

                <div className="mt-5 flex flex-wrap gap-3">

                  <button
                    type="button"
                    onClick={approvePlan}
                    disabled={approvalLoading}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-medium transition hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <CheckCircle2 size={17} />
                    Approve & Simulate
                  </button>

                  <button
                    type="button"
                    onClick={rejectPlan}
                    disabled={approvalLoading}
                    className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <XCircle size={17} />
                    Reject
                  </button>

                </div>

              </div>
            )}

          </div>
        )}

        {/* =====================================================
            EXECUTION
            ===================================================== */}

        {execution && (
          <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">

            <div className="flex items-start gap-4">

              <div className="rounded-xl bg-emerald-500/10 p-3">
                <CheckCircle2
                  size={23}
                  className="text-emerald-400"
                />
              </div>

              <div className="min-w-0">

                <h2 className="font-semibold text-emerald-300">
                  Simulation Executed
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Human approval accepted by the
                  simulation layer.
                </p>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">

                  <div className="rounded-xl bg-slate-950 p-4">
                    <div className="text-xs text-slate-500">
                      Execution ID
                    </div>

                    <div className="mt-1 break-all font-mono text-sm">
                      {execution.last_execution_id ??
                        "N/A"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-950 p-4">
                    <div className="text-xs text-slate-500">
                      Status
                    </div>

                    <div className="mt-1 font-semibold text-emerald-400">
                      {execution.status ??
                        "SIMULATION_EXECUTED"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-950 p-4">
                    <div className="text-xs text-slate-500">
                      Timestamp
                    </div>

                    <div className="mt-1 break-all text-xs text-slate-300">
                      {execution.timestamp ??
                        "N/A"}
                    </div>
                  </div>

                </div>

                {execution.actions?.length > 0 && (
                  <div className="mt-5">

                    <div className="mb-3 text-sm font-medium">
                      Executed Simulation Actions
                    </div>

                    <div className="space-y-2">

                      {execution.actions.map(
                        (action, index) => (
                          <div
                            key={index}
                            className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950 p-4 md:flex-row md:items-center md:justify-between"
                          >

                            <span className="text-sm">
                              {action.action}
                            </span>

                            <span className="text-xs text-emerald-400">
                              {action.status}
                            </span>

                          </div>
                        )
                      )}

                    </div>

                  </div>
                )}

                <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-5 text-slate-400">
                  All actions shown above are simulated.
                  No real ambulance dispatch, traffic
                  signal change, or external notification
                  was performed.
                </div>

              </div>
            </div>
          </div>
        )}

        {/* =====================================================
            REJECTION
            ===================================================== */}

        {rejected && !execution && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-6">

            <div className="flex items-start gap-4">

              <div className="rounded-xl bg-red-500/10 p-3">
                <XCircle
                  size={23}
                  className="text-red-400"
                />
              </div>

              <div>
                <h2 className="font-semibold text-red-300">
                  Actions Rejected
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  No operational actions were executed.
                  The simulation remains unchanged.
                </p>
              </div>

            </div>

          </div>
        )}

        {/* =====================================================
            ARCHITECTURE
            ===================================================== */}

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">

          <div className="flex items-start gap-4">

            <ShieldCheck
              size={22}
              className="mt-1 text-emerald-400"
            />

            <div className="min-w-0">

              <h2 className="font-semibold">
                AI Safety & Control Architecture
              </h2>

              <p className="mt-2 max-w-5xl text-sm leading-6 text-slate-400">
                The AI Operations layer separates AI
                reasoning from operational execution. Live
                city data is provided to the intelligence
                layer, where the agent can use RAG knowledge
                and approved tools to analyse a situation.
                Recommended actions then pass through a
                human approval gate before simulated
                execution.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">

                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
                  Live Data
                </span>

                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
                  Gemini
                </span>

                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
                  Function Calling
                </span>

                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
                  RAG
                </span>

                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
                  ML
                </span>

                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
                  Human Approval
                </span>

                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
                  Safe Simulation
                </span>

              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

export default AIOperations;