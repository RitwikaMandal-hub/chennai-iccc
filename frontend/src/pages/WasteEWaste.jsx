import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  Gauge,
  Package,
  Radio,
  Recycle,
  Truck,
} from "lucide-react";
import { io } from "../lib/socket";
import { API_URL, SOCKET_URL } from "../lib/config";


function WasteEWaste() {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    async function loadWastePoints() {
      try {
        const response = await fetch(
          `${API_URL}/api/e-waste`
        );

        if (!response.ok) {
          throw new Error("Failed to load e-waste data");
        }

        const data = await response.json();

        setPoints(
          Array.isArray(data)
            ? data
            : data.data || data.points || []
        );
      } catch (error) {
        console.error(
          "E-waste loading error:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    loadWastePoints();

    const socket = io(SOCKET_URL);

    socket.on(
      "simulation-update",
      (data) => {
        if (
          data?.eWaste &&
          Array.isArray(data.eWaste)
        ) {
          setPoints(data.eWaste);
          setLastUpdate(
            new Date().toLocaleTimeString()
          );
        }

        if (
          data?.e_waste &&
          Array.isArray(data.e_waste)
        ) {
          setPoints(data.e_waste);
          setLastUpdate(
            new Date().toLocaleTimeString()
          );
        }

        if (
          data?.ewaste &&
          Array.isArray(data.ewaste)
        ) {
          setPoints(data.ewaste);
          setLastUpdate(
            new Date().toLocaleTimeString()
          );
        }
      }
    );

    return () => {
      socket.disconnect();
    };
  }, []);

  const statistics = useMemo(() => {
    const totalCapacity = points.reduce(
      (sum, point) =>
        sum + Number(point.capacity_kg || 0),
      0
    );

    const totalLoad = points.reduce(
      (sum, point) =>
        sum + Number(point.current_load_kg || 0),
      0
    );

    const highRisk = points.filter(
      (point) =>
        String(point.status).toUpperCase() ===
          "HIGH" ||
        String(point.status).toUpperCase() ===
          "OVERFLOW"
    ).length;

    const filling = points.filter(
      (point) =>
        String(point.status).toUpperCase() ===
        "FILLING"
    ).length;

    const utilization =
      totalCapacity > 0
        ? (totalLoad / totalCapacity) * 100
        : 0;

    return {
      totalCapacity,
      totalLoad,
      highRisk,
      filling,
      utilization,
    };
  }, [points]);

  function getLoadPercentage(point) {
    const capacity = Number(
      point.capacity_kg || 0
    );

    const load = Number(
      point.current_load_kg || 0
    );

    if (!capacity) {
      return 0;
    }

    return Math.min(
      100,
      Math.round((load / capacity) * 100)
    );
  }

  function getStatusClass(status) {
    const normalized =
      String(status).toUpperCase();

    if (
      normalized === "HIGH" ||
      normalized === "OVERFLOW"
    ) {
      return "border-red-500/20 bg-red-500/5 text-red-400";
    }

    if (normalized === "FILLING") {
      return "border-amber-500/20 bg-amber-500/5 text-amber-400";
    }

    return "border-emerald-500/20 bg-emerald-500/5 text-emerald-400";
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-6">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-center gap-3">

            <div className="rounded-xl bg-emerald-500/10 p-3">
              <Recycle
                size={27}
                className="text-emerald-400"
              />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                Smart Waste & E-Waste
              </h1>

              <p className="text-sm text-slate-400">
                Chennai AI ICCC • Intelligent Waste
                Monitoring & Collection
              </p>
            </div>

          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
            <Radio size={15} />
            LIVE SIMULATION
          </div>

        </div>
      </div>

      <div className="p-6">

        {/* Metrics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">

          <Metric
            icon={Recycle}
            title="Collection Points"
            value={points.length}
            subtitle="Tracked locations"
          />

          <Metric
            icon={Package}
            title="Current Load"
            value={`${statistics.totalLoad.toFixed(1)} kg`}
            subtitle="Simulated live load"
          />

          <Metric
            icon={Gauge}
            title="Capacity"
            value={`${statistics.utilization.toFixed(
              0
            )}%`}
            subtitle="Network utilization"
          />

          <Metric
            icon={AlertTriangle}
            title="High Risk"
            value={statistics.highRisk}
            subtitle="Require attention"
          />

          <Metric
            icon={Truck}
            title="Filling"
            value={statistics.filling}
            subtitle="Collection candidates"
          />

        </div>

        {/* Main grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* Collection network */}
          <div className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-900">

            <div className="border-b border-slate-800 px-5 py-4">

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-3">
                  <Recycle
                    size={20}
                    className="text-emerald-400"
                  />

                  <div>
                    <h2 className="font-semibold">
                      E-Waste Collection Network
                    </h2>

                    <p className="text-xs text-slate-500">
                      Live simulated collection-point
                      intelligence
                    </p>
                  </div>
                </div>

                {lastUpdate && (
                  <span className="text-xs text-slate-500">
                    Updated {lastUpdate}
                  </span>
                )}

              </div>

            </div>

            <div className="p-5">

              {loading ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  Loading collection network...
                </div>
              ) : points.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  No e-waste collection points
                  available.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                  {points.map((point) => {

                    const percentage =
                      getLoadPercentage(point);

                    return (
                      <div
                        key={
                          point.point_id ??
                          point.id ??
                          point.point_name
                        }
                        className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div>
                            <h3 className="font-medium">
                              {point.point_name}
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              {point.location_name}
                            </p>
                          </div>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${getStatusClass(
                              point.status
                            )}`}
                          >
                            {point.status ||
                              "NORMAL"}
                          </span>

                        </div>

                        <div className="mt-5">

                          <div className="mb-2 flex justify-between text-xs">

                            <span className="text-slate-500">
                              Capacity utilization
                            </span>

                            <span className="font-medium text-slate-300">
                              {percentage}%
                            </span>

                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-800">

                            <div
                              className={`h-full rounded-full ${
                                percentage >= 90
                                  ? "bg-red-500"
                                  : percentage >= 70
                                  ? "bg-amber-400"
                                  : "bg-emerald-500"
                              }`}
                              style={{
                                width: `${percentage}%`,
                              }}
                            />

                          </div>

                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">

                          <div className="rounded-lg bg-slate-900 p-3">
                            <div className="text-[10px] text-slate-500">
                              Current load
                            </div>

                            <div className="mt-1 text-sm font-semibold">
                              {Number(
                                point.current_load_kg ||
                                  0
                              ).toFixed(1)}{" "}
                              kg
                            </div>
                          </div>

                          <div className="rounded-lg bg-slate-900 p-3">
                            <div className="text-[10px] text-slate-500">
                              Capacity
                            </div>

                            <div className="mt-1 text-sm font-semibold">
                              {Number(
                                point.capacity_kg ||
                                  0
                              ).toFixed(0)}{" "}
                              kg
                            </div>
                          </div>

                        </div>

                      </div>
                    );
                  })}

                </div>
              )}

            </div>
          </div>

          {/* AI intelligence */}
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5">

            <div className="border-b border-violet-500/10 px-5 py-4">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-violet-500/10 p-2">
                  <BrainCircuit
                    size={20}
                    className="text-violet-400"
                  />
                </div>

                <div>
                  <h2 className="font-semibold">
                    AI Waste Intelligence
                  </h2>

                  <p className="text-xs text-slate-500">
                    Predictive collection reasoning
                  </p>
                </div>

              </div>

            </div>

            <div className="space-y-4 p-5">

              <Insight
                icon={Gauge}
                title="Load Forecasting"
                text="The ML layer can estimate future e-waste accumulation using simulated historical readings."
              />

              <Insight
                icon={AlertTriangle}
                title="Overflow Detection"
                text="High-capacity locations can be prioritized before they reach critical levels."
              />

              <Insight
                icon={Truck}
                title="Collection Priority"
                text="Collection routes can be prioritized using predicted load, location and operational urgency."
              />

              <Insight
                icon={Cpu}
                title="Sensor Intelligence"
                text="Sensor anomalies can be cross-checked against neighboring observations before triggering a response."
              />

            </div>

          </div>

        </div>

        {/* Collection priority */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900">

          <div className="border-b border-slate-800 px-5 py-4">

            <h2 className="font-semibold">
              Collection Priority Analysis
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Locations ordered by simulated current
              capacity utilization.
            </p>

          </div>

          <div className="p-5">

            {points.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                No collection data available.
              </div>
            ) : (
              <div className="space-y-3">

                {[...points]
                  .sort(
                    (a, b) =>
                      getLoadPercentage(b) -
                      getLoadPercentage(a)
                  )
                  .map((point, index) => {

                    const percentage =
                      getLoadPercentage(point);

                    return (
                      <div
                        key={
                          point.point_id ??
                          point.point_name
                        }
                        className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 md:flex-row md:items-center"
                      >

                        <div className="flex items-center gap-3 md:w-1/3">

                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-slate-400">
                            {index + 1}
                          </div>

                          <div>
                            <div className="text-sm font-medium">
                              {point.point_name}
                            </div>

                            <div className="text-xs text-slate-500">
                              {point.location_name}
                            </div>
                          </div>

                        </div>

                        <div className="flex-1">

                          <div className="h-2 overflow-hidden rounded-full bg-slate-800">

                            <div
                              className={`h-full rounded-full ${
                                percentage >= 90
                                  ? "bg-red-500"
                                  : percentage >= 70
                                  ? "bg-amber-400"
                                  : "bg-emerald-500"
                              }`}
                              style={{
                                width: `${percentage}%`,
                              }}
                            />

                          </div>

                        </div>

                        <div className="text-sm font-semibold md:w-20 md:text-right">
                          {percentage}%
                        </div>

                      </div>
                    );
                  })}

              </div>
            )}

          </div>
        </div>

        {/* System note */}
        <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">

          <div className="flex items-start gap-3">

            <AlertTriangle
              size={18}
              className="mt-0.5 shrink-0 text-amber-400"
            />

            <div>

              <h3 className="text-sm font-semibold text-amber-300">
                Simulation Data Notice
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                Collection loads, sensor readings and
                real-time updates shown on this screen are
                simulated digital-twin data. The architecture
                is designed so that equivalent live IoT data
                can later replace the simulation layer.
              </p>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  title,
  value,
  subtitle,
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">

      <div className="flex items-center justify-between">

        <div className="rounded-xl bg-emerald-500/10 p-2.5">
          <Icon
            size={19}
            className="text-emerald-400"
          />
        </div>

        <CheckCircle2
          size={15}
          className="text-slate-700"
        />

      </div>

      <div className="mt-4 text-2xl font-bold">
        {value}
      </div>

      <div className="mt-1 text-sm font-medium text-slate-300">
        {title}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {subtitle}
      </div>

    </div>
  );
}

function Insight({
  icon: Icon,
  title,
  text,
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">

      <div className="flex items-center gap-3">

        <Icon
          size={17}
          className="text-violet-400"
        />

        <span className="text-sm font-medium">
          {title}
        </span>

      </div>

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {text}
      </p>

    </div>
  );
}

export default WasteEWaste;