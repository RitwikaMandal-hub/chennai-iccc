import { useEffect, useMemo, useState } from "react";
import { io } from "../lib/socket";
import { API_URL, SOCKET_URL } from "../lib/config";
import {
  Droplets,
  CloudRain,
  TriangleAlert,
  Waves,
  Activity,
  MapPin,
  Route,
  ShieldAlert,
  Radio,
} from "lucide-react";


function getRiskClass(risk) {
  const value = String(risk || "").toUpperCase();

  if (value === "HIGH") {
    return "text-red-400 bg-red-500/10 border-red-500/20";
  }

  if (value === "MODERATE") {
    return "text-amber-400 bg-amber-500/10 border-amber-500/20";
  }

  return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
}

function getWaterRisk(value) {
  if (value >= 75) return "HIGH";
  if (value >= 50) return "MODERATE";
  return "LOW";
}

function FloodDisaster() {
  const [sensors, setSensors] = useState([]);
  const [roads, setRoads] = useState([]);
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [sensorResponse, roadResponse] =
          await Promise.all([
            fetch(`${API_URL}/api/sensors`),
            fetch(`${API_URL}/api/roads`),
          ]);

        const sensorData = await sensorResponse.json();
        const roadData = await roadResponse.json();

        if (!mounted) return;

        setSensors(
          Array.isArray(sensorData)
            ? sensorData
            : sensorData.sensors || []
        );

        setRoads(
          Array.isArray(roadData)
            ? roadData
            : roadData.roads || []
        );
      } catch (error) {
        console.error(
          "Flood data error:",
          error
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on("simulation-update", (data) => {
      setLiveData(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const floodSensors = useMemo(() => {
    return sensors.filter((sensor) => {
      const type = String(
        sensor.sensor_type ??
        sensor.type ??
        ""
      ).toLowerCase();

      return (
        type.includes("flood") ||
        type.includes("water")
      );
    });
  }, [sensors]);

  const waterLevels = useMemo(() => {
  if (
    liveData?.water_level === undefined ||
    liveData?.water_level === null
  ) {
    return [];
  }

  return [
    {
      sensor_id: 2,
      location_name: "Chennai Flood Sensor",
      value: Number(liveData.water_level),
    },
  ];
}, [liveData]);

  const averageWaterLevel = useMemo(() => {
    if (!waterLevels.length) return 0;

    const values = waterLevels
      .map((item) =>
        Number(
          item.value ??
          item.reading_value ??
          item.water_level ??
          0
        )
      )
      .filter((value) => !Number.isNaN(value));

    if (!values.length) return 0;

    return Math.round(
      values.reduce(
        (sum, value) => sum + value,
        0
      ) / values.length
    );
  }, [waterLevels]);

  const highWaterSensors = useMemo(() => {
    return waterLevels.filter((item) => {
      const value = Number(
        item.value ??
        item.reading_value ??
        item.water_level ??
        0
      );

      return value >= 75;
    }).length;
  }, [waterLevels]);

  const highRiskRoads = useMemo(() => {
    return roads.filter((road) => {
      const traffic = Number(
        road.traffic_level ??
        road.trafficLevel ??
        0
      );

      return traffic >= 75;
    });
  }, [roads]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-500/10 p-3">
              <Droplets
                size={26}
                className="text-cyan-400"
              />
            </div>

            <div>
              <h1 className="text-2xl font-bold">
                Flood & Disaster
              </h1>

              <p className="text-sm text-slate-400">
                Chennai AI ICCC • Disaster Intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
            <Radio size={15} />
            LIVE DISASTER SIMULATION
          </div>

        </div>
      </div>

      <div className="p-6">

        {/* KPI cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Avg Water Level
              </span>

              <Waves
                size={20}
                className="text-cyan-400"
              />
            </div>

            <div className="mt-3 text-3xl font-bold">
              {averageWaterLevel}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Current simulated reading
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Flood Sensors
              </span>

              <Droplets
                size={20}
                className="text-blue-400"
              />
            </div>

            <div className="mt-3 text-3xl font-bold">
              {floodSensors.length}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Water-level monitoring points
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                High-Risk Sensors
              </span>

              <TriangleAlert
                size={20}
                className="text-red-400"
              />
            </div>

            <div className="mt-3 text-3xl font-bold text-red-400">
              {highWaterSensors}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Water level ≥ 75
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                At-Risk Roads
              </span>

              <Route
                size={20}
                className="text-orange-400"
              />
            </div>

            <div className="mt-3 text-3xl font-bold text-orange-400">
              {highRiskRoads.length}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              High traffic / response priority
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Disaster Status
              </span>

              <ShieldAlert
                size={20}
                className="text-amber-400"
              />
            </div>

            <div className="mt-3 text-2xl font-bold">
              {averageWaterLevel >= 75
                ? "HIGH"
                : averageWaterLevel >= 50
                ? "MODERATE"
                : "NORMAL"}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Simulation assessment
            </div>
          </div>

        </div>

        {/* Main panels */}
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* Water monitoring */}
          <div className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-900">

            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h2 className="font-semibold">
                  Water-Level Monitoring
                </h2>

                <p className="text-xs text-slate-500">
                  Live simulated flood sensors
                </p>
              </div>

              <CloudRain
                size={19}
                className="text-cyan-400"
              />
            </div>

            <div className="divide-y divide-slate-800">

              {loading ? (
                <div className="p-8 text-center text-slate-500">
                  Loading flood sensors...
                </div>
              ) : waterLevels.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  Waiting for live water-level data...
                </div>
              ) : (
                waterLevels.map((item, index) => {

                  const value = Number(
                    item.value ??
                    item.reading_value ??
                    item.water_level ??
                    0
                  );

                  const risk =
                    getWaterRisk(value);

                  return (
                    <div
                      key={
                        item.sensor_id ??
                        item.id ??
                        index
                      }
                      className="flex flex-col gap-4 p-5 transition hover:bg-slate-800/40 md:flex-row md:items-center md:justify-between"
                    >

                      <div className="flex items-center gap-4">

                        <div className="rounded-xl bg-cyan-500/10 p-3">
                          <Droplets
                            size={19}
                            className="text-cyan-400"
                          />
                        </div>

                        <div>
                          <div className="font-medium">
                            {item.location_name ??
                              item.location ??
                              `Water Sensor ${index + 1}`}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            Sensor ID:{" "}
                            {item.sensor_id ??
                              item.id ??
                              "N/A"}
                          </div>
                        </div>

                      </div>

                      <div className="flex items-center gap-6">

                        <div className="text-right">
                          <div className="text-xs text-slate-500">
                            Water Level
                          </div>

                          <div className="text-xl font-bold">
                            {value}
                          </div>
                        </div>

                        <div
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${getRiskClass(
                            risk
                          )}`}
                        >
                          {risk}
                        </div>

                      </div>

                    </div>
                  );
                })
              )}

            </div>
          </div>

          {/* Disaster response */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900">

            <div className="border-b border-slate-800 px-5 py-4">
              <h2 className="font-semibold">
                Disaster Response
              </h2>

              <p className="text-xs text-slate-500">
                Operational priorities
              </p>
            </div>

            <div className="space-y-4 p-5">

              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-red-400">
                  <TriangleAlert size={16} />
                  Flood Risk
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Continuously evaluate rising water
                  levels and nearby sensor agreement
                  before escalating a flood condition.
                </p>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-400">
                  <Route size={16} />
                  Road Accessibility
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Identify roads where congestion or
                  flood conditions could affect emergency
                  response routes.
                </p>
              </div>

              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-400">
                  <Activity size={16} />
                  AI Assessment
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  ML flood-risk predictions can be combined
                  with traffic and sensor data to support
                  disaster-response planning.
                </p>
              </div>

            </div>
          </div>

        </div>

        {/* Road impact */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900">

          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">

            <div>
              <h2 className="font-semibold">
                Potentially Affected Road Network
              </h2>

              <p className="text-xs text-slate-500">
                Mobility conditions relevant to disaster response
              </p>
            </div>

            <MapPin
              size={19}
              className="text-orange-400"
            />

          </div>

          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">

            {highRiskRoads.length === 0 ? (
              <div className="text-sm text-slate-500">
                No high-priority road segments detected.
              </div>
            ) : (
              highRiskRoads.map((road, index) => {

                const traffic = Number(
                  road.traffic_level ??
                  road.trafficLevel ??
                  0
                );

                return (
                  <div
                    key={
                      road.road_id ??
                      road.id ??
                      index
                    }
                    className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div>
                        <div className="font-medium">
                          {road.road_name ??
                            road.name ??
                            "Road"}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Response-priority segment
                        </div>
                      </div>

                      <Route
                        size={18}
                        className="text-orange-400"
                      />

                    </div>

                    <div className="mt-5">

                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">
                          Traffic
                        </span>

                        <span className="font-medium">
                          {traffic}
                        </span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-orange-500"
                          style={{
                            width: `${Math.min(
                              traffic,
                              100
                            )}%`,
                          }}
                        />
                      </div>

                    </div>

                  </div>
                );
              })
            )}

          </div>
        </div>

        {/* AI disaster intelligence */}
        <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6">

          <div className="flex items-start gap-4">

            <div className="rounded-xl bg-cyan-500/10 p-3">
              <ShieldAlert
                size={22}
                className="text-cyan-400"
              />
            </div>

            <div>

              <h2 className="font-semibold text-cyan-300">
                AI Disaster Intelligence
              </h2>

              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
                The disaster layer combines water-level
                sensors, simulated rainfall conditions,
                ML flood-risk prediction and mobility
                information. The AI Operations Agent can
                later use these signals to identify
                vulnerable areas, evaluate emergency routes
                and generate response plans for operator
                approval.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">

                <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400">
                  Flood Prediction
                </span>

                <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400">
                  Sensor Validation
                </span>

                <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400">
                  Emergency Routes
                </span>

                <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400">
                  What-If Simulation
                </span>

              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

export default FloodDisaster;