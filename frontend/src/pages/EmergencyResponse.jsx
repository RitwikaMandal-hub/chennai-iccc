import { useEffect, useMemo, useState } from "react";
import { io } from "../lib/socket";
import { API_URL, SOCKET_URL, AI_URL } from "../lib/config";
import {
  Ambulance,
  AlertTriangle,
  Clock3,
  MapPin,
  Navigation,
  Radio,
  Route,
  ShieldAlert,
  Siren,
  Activity,
} from "lucide-react";


function EmergencyResponse() {
  const [incidents, setIncidents] = useState([]);
  const [liveData, setLiveData] = useState(null);
  const [selectedIncident, setSelectedIncident] =
    useState(null);

  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        const response = await fetch(
          `${API_URL}/api/dashboard`
        );

        const data = await response.json();

        if (!mounted) return;

        setIncidents(data.incidents || []);
      } catch (error) {
        console.error(
          "Emergency dashboard error:",
          error
        );
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on("simulation-update", (data) => {
      setLiveData(data);

      if (data.incidents) {
        setIncidents(data.incidents);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const emergencyIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const type = String(
        incident.type ??
        incident.incident_type ??
        incident.category ??
        ""
      ).toLowerCase();

      return (
        type.includes("accident") ||
        type.includes("fire") ||
        type.includes("medical") ||
        type.includes("emergency") ||
        type.includes("ambulance")
      );
    });
  }, [incidents]);

  const activeIncidents =
    emergencyIncidents.length;

  const criticalIncidents =
    emergencyIncidents.filter((incident) => {
      const severity = String(
        incident.severity ?? ""
      ).toLowerCase();

      return (
        severity === "critical" ||
        severity === "high"
      );
    }).length;

  const ambulanceCount =
    liveData?.vehicles?.filter((vehicle) => {
      const type = String(
        vehicle.type ??
        vehicle.vehicle_type ??
        ""
      ).toUpperCase();

      return type === "AMBULANCE";
    }).length || 0;

  async function runAIAnalysis() {
    setLoadingAI(true);
    setAiAnalysis(null);

    try {
      const prompt = selectedIncident
        ? `Analyze this simulated emergency incident for Chennai ICCC: ${JSON.stringify(
            selectedIncident
          )}. Provide a concise emergency response recommendation including incident assessment, ambulance requirement, route considerations, traffic considerations, and recommended next actions. Clearly state that this is a simulation and that operational actions require human approval.`
        : "Analyze the current simulated emergency situation in Chennai ICCC. Provide a concise emergency response recommendation using available traffic, ambulance and incident information. Clearly state that this is a simulation and operational actions require human approval.";

      const response = await fetch(
        `${AI_URL}/agent?prompt=${encodeURIComponent(
          prompt
        )}`
      );

      const data = await response.json();

      setAiAnalysis(
        data.response ||
        data.message ||
        "AI analysis unavailable."
      );
    } catch (error) {
      console.error(
        "AI emergency analysis error:",
        error
      );

      setAiAnalysis(
        "AI analysis could not be retrieved. Please verify that the AI service is running."
      );
    } finally {
      setLoadingAI(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-center gap-3">

            <div className="rounded-xl bg-red-500/10 p-3">
              <Siren
                size={27}
                className="text-red-400"
              />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                Emergency Response
              </h1>

              <p className="text-sm text-slate-400">
                Chennai AI ICCC • Emergency Operations
              </p>
            </div>

          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
            <Radio size={15} />
            RESPONSE SYSTEM ONLINE
          </div>

        </div>
      </div>

      <div className="p-6">

        {/* KPI cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Active Emergencies
              </span>

              <AlertTriangle
                size={20}
                className="text-red-400"
              />
            </div>

            <div className="mt-3 text-3xl font-bold text-red-400">
              {activeIncidents}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Current simulated incidents
            </div>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Critical Cases
              </span>

              <ShieldAlert
                size={20}
                className="text-orange-400"
              />
            </div>

            <div className="mt-3 text-3xl font-bold text-orange-400">
              {criticalIncidents}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              High / critical priority
            </div>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Ambulances
              </span>

              <Ambulance
                size={20}
                className="text-red-400"
              />
            </div>

            <div className="mt-3 text-3xl font-bold">
              {ambulanceCount}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              In digital twin simulation
            </div>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Response Network
              </span>

              <Route
                size={20}
                className="text-blue-400"
              />
            </div>

            <div className="mt-3 text-2xl font-bold text-blue-400">
              ACTIVE
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Route intelligence enabled
            </div>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Operator Control
              </span>

              <ShieldAlert
                size={20}
                className="text-emerald-400"
              />
            </div>

            <div className="mt-3 text-2xl font-bold text-emerald-400">
              ENABLED
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Human approval required
            </div>

          </div>

        </div>

        {/* Main grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* Incident queue */}
          <div className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-900">

            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">

              <div>
                <h2 className="font-semibold">
                  Emergency Incident Queue
                </h2>

                <p className="text-xs text-slate-500">
                  Simulated incidents requiring monitoring
                </p>
              </div>

              <Activity
                size={19}
                className="text-red-400"
              />

            </div>

            <div className="divide-y divide-slate-800">

              {emergencyIncidents.length === 0 ? (

                <div className="p-8 text-center text-slate-500">
                  No active emergency incidents.
                </div>

              ) : (

                emergencyIncidents.map(
                  (incident, index) => {

                    const severity = String(
                      incident.severity ??
                      "MEDIUM"
                    ).toUpperCase();

                    const isSelected =
                      selectedIncident ===
                      incident;

                    return (
                      <button
                        key={
                          incident.incident_id ??
                          incident.id ??
                          index
                        }
                        type="button"
                        onClick={() =>
                          setSelectedIncident(
                            incident
                          )
                        }
                        className={`w-full p-5 text-left transition hover:bg-slate-800/50 ${
                          isSelected
                            ? "bg-red-500/5"
                            : ""
                        }`}
                      >

                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                          <div className="flex items-center gap-4">

                            <div className="rounded-xl bg-red-500/10 p-3">
                              <Siren
                                size={19}
                                className="text-red-400"
                              />
                            </div>

                            <div>

                              <div className="font-medium">
                                {incident.type ??
                                  incident.incident_type ??
                                  "Emergency Incident"}
                              </div>

                              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">

                                <MapPin size={12} />

                                {incident.location ??
                                  incident.location_name ??
                                  "Chennai"}

                              </div>

                            </div>

                          </div>

                          <div className="flex items-center gap-4">

                            <div className="text-right">
                              <div className="text-xs text-slate-500">
                                Severity
                              </div>

                              <div
                                className={`font-semibold ${
                                  severity ===
                                    "CRITICAL" ||
                                  severity ===
                                    "HIGH"
                                    ? "text-red-400"
                                    : "text-amber-400"
                                }`}
                              >
                                {severity}
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-xs text-slate-500">
                                Status
                              </div>

                              <div className="font-semibold text-emerald-400">
                                ACTIVE
                              </div>
                            </div>

                          </div>

                        </div>

                      </button>
                    );
                  }
                )
              )}

            </div>
          </div>

          {/* Selected incident */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900">

            <div className="border-b border-slate-800 px-5 py-4">

              <h2 className="font-semibold">
                Response Planning
              </h2>

              <p className="text-xs text-slate-500">
                AI-assisted emergency assessment
              </p>

            </div>

            <div className="p-5">

              {!selectedIncident ? (

                <div className="flex min-h-64 flex-col items-center justify-center text-center">

                  <div className="rounded-full bg-slate-800 p-4">
                    <MapPin
                      size={25}
                      className="text-slate-500"
                    />
                  </div>

                  <p className="mt-4 text-sm text-slate-400">
                    Select an emergency incident
                    to begin response planning.
                  </p>

                </div>

              ) : (

                <div>

                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">

                    <div className="text-xs uppercase tracking-wider text-red-400">
                      Selected Incident
                    </div>

                    <div className="mt-2 font-semibold">
                      {selectedIncident.type ??
                        selectedIncident.incident_type ??
                        "Emergency"}
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                      <MapPin size={13} />

                      {selectedIncident.location ??
                        selectedIncident.location_name ??
                        "Chennai"}
                    </div>

                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">

                    <div className="rounded-xl bg-slate-950 p-3">
                      <div className="text-[10px] uppercase text-slate-500">
                        Priority
                      </div>

                      <div className="mt-1 font-semibold text-red-400">
                        {String(
                          selectedIncident.severity ??
                          "HIGH"
                        ).toUpperCase()}
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-950 p-3">
                      <div className="text-[10px] uppercase text-slate-500">
                        Response
                      </div>

                      <div className="mt-1 font-semibold text-blue-400">
                        REQUIRED
                      </div>
                    </div>

                  </div>

                  <button
                    type="button"
                    onClick={runAIAnalysis}
                    disabled={loadingAI}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Activity size={17} />

                    {loadingAI
                      ? "Analyzing..."
                      : "Run AI Response Analysis"}
                  </button>

                </div>

              )}

            </div>

          </div>

        </div>

        {/* Response intelligence */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

            <div className="flex items-center gap-3">
              <Ambulance
                size={21}
                className="text-red-400"
              />

              <h2 className="font-semibold">
                Ambulance Coordination
              </h2>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Identify the nearest available simulated
              ambulance and estimate its arrival time
              before generating an emergency response plan.
            </p>

            <div className="mt-4 rounded-xl bg-slate-950 p-4">

              <div className="flex justify-between">
                <span className="text-xs text-slate-500">
                  Example unit
                </span>

                <span className="text-xs font-medium text-emerald-400">
                  AVAILABLE
                </span>
              </div>

              <div className="mt-2 text-lg font-bold">
                AMB-07
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Anna Nagar • ETA 11 min
              </div>

            </div>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

            <div className="flex items-center gap-3">
              <Navigation
                size={21}
                className="text-blue-400"
              />

              <h2 className="font-semibold">
                Route Intelligence
              </h2>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Emergency routes can be evaluated using
              current traffic conditions and simulated
              road restrictions before dispatch.
            </p>

            <div className="mt-4 rounded-xl bg-slate-950 p-4">

              <div className="text-xs text-slate-500">
                Recommended simulation route
              </div>

              <div className="mt-2 text-sm font-medium">
                Anna Nagar → Poonamallee High Road
                → Egmore → Government General Hospital
              </div>

              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <Clock3 size={13} />
                Estimated hospital transit: 19 min
              </div>

            </div>

          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

            <div className="flex items-center gap-3">
              <ShieldAlert
                size={21}
                className="text-emerald-400"
              />

              <h2 className="font-semibold">
                Human-in-the-Loop
              </h2>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              AI can analyze incidents and recommend
              actions, but operational actions remain
              subject to authorized human approval.
            </p>

            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">

              <div className="text-sm font-medium text-emerald-400">
                APPROVAL REQUIRED
              </div>

              <div className="mt-1 text-xs text-slate-500">
                No real emergency action is triggered
                from this simulation.
              </div>

            </div>

          </div>

        </div>

        {/* AI result */}
        {aiAnalysis && (
          <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">

            <div className="flex items-start gap-4">

              <div className="rounded-xl bg-blue-500/10 p-3">
                <Activity
                  size={22}
                  className="text-blue-400"
                />
              </div>

              <div className="min-w-0">

                <h2 className="font-semibold text-blue-300">
                  AI Emergency Assessment
                </h2>

                <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {aiAnalysis}
                </div>

              </div>

            </div>

          </div>
        )}

        {/* Safety note */}
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">

          <AlertTriangle
            size={18}
            className="mt-0.5 shrink-0 text-amber-400"
          />

          <p className="text-xs leading-5 text-slate-400">
            This emergency-response module is part of
            the Chennai AI ICCC digital-twin simulation.
            Ambulance dispatches, signal changes,
            notifications and other operational actions
            are simulated only. AI recommendations require
            human approval before simulated execution.
          </p>

        </div>

      </div>
    </div>
  );
}

export default EmergencyResponse;