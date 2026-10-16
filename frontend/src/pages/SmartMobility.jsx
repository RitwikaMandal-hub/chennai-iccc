import { useEffect, useMemo, useState } from "react";
import { io } from "../lib/socket";
import { API_URL, SOCKET_URL } from "../lib/config";
import {
  Activity,
  Car,
  Bus,
  Ambulance,
  Gauge,
  MapPin,
  Radio,
  Route,
  Siren,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";


function getTrafficClass(value) {
  if (value >= 75) {
    return {
      label: "HIGH",
      className: "text-red-400 bg-red-500/10 border-red-500/20",
    };
  }

  if (value >= 55) {
    return {
      label: "MODERATE",
      className: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    };
  }

  return {
    label: "NORMAL",
    className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  };
}

function SmartMobility() {
  const [roads, setRoads] = useState([]);
  const [junctions, setJunctions] = useState([]);
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [roadsResponse, junctionsResponse] =
          await Promise.all([
            fetch(`${API_URL}/api/roads`),
            fetch(`${API_URL}/api/junctions`),
          ]);

        const roadsData = await roadsResponse.json();
        const junctionsData = await junctionsResponse.json();

        if (!mounted) return;

        setRoads(
          Array.isArray(roadsData)
            ? roadsData
            : roadsData.roads || []
        );

        setJunctions(
          Array.isArray(junctionsData)
            ? junctionsData
            : junctionsData.junctions || []
        );
      } catch (error) {
        console.error(
          "Smart Mobility data error:",
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

  const roadStats = useMemo(() => {
    if (!roads.length) {
      return {
        average: 0,
        high: 0,
        normal: 0,
      };
    }

    const values = roads
      .map((road) =>
        Number(
          road.traffic_level ??
          road.trafficLevel ??
          0
        )
      )
      .filter((value) => !Number.isNaN(value));

    const average =
      values.reduce(
        (sum, value) => sum + value,
        0
      ) / (values.length || 1);

    return {
      average: Math.round(average),
      high: values.filter(
        (value) => value >= 75
      ).length,
      normal: values.filter(
        (value) => value < 55
      ).length,
    };
  }, [roads]);

  const highCongestionJunctions =
    junctions.filter((junction) => {
      const value = Number(
        junction.congestion_level ??
        junction.congestionLevel ??
        0
      );

      return value >= 70;
    });

  const simulatedVehicles =
    liveData?.vehicles || [];

  const vehicleCounts = simulatedVehicles.reduce(
    (result, vehicle) => {
      const type = String(
        vehicle.type || vehicle.vehicle_type || "CAR"
      ).toUpperCase();

      if (type === "BUS") {
        result.bus += 1;
      } else if (type === "AMBULANCE") {
        result.ambulance += 1;
      } else {
        result.car += 1;
      }

      return result;
    },
    {
      car: 0,
      bus: 0,
      ambulance: 0,
    }
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-950 px-6 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-500/10 p-3">
                <Route
                  size={26}
                  className="text-blue-400"
                />
              </div>

              <div>
                <h1 className="text-2xl font-bold">
                  Smart Mobility
                </h1>

                <p className="text-sm text-slate-400">
                  Chennai AI ICCC • Mobility Operations
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
            <Radio size={15} />
            LIVE CITY SIMULATION
          </div>
        </div>
      </div>

      <div className="p-6">

        {/* KPI cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Traffic Index
              </span>

              <Gauge
                size={20}
                className="text-blue-400"
              />
            </div>

            <div className="mt-3 text-3xl font-bold">
              {roadStats.average}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Average road traffic
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Congested Roads
              </span>

              <TriangleAlert
                size={20}
                className="text-red-400"
              />
            </div>

            <div className="mt-3 text-3xl font-bold text-red-400">
              {roadStats.high}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              High traffic segments
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Junctions
              </span>

              <Activity
                size={20}
                className="text-amber-400"
              />
            </div>

            <div className="mt-3 text-3xl font-bold">
              {junctions.length}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Monitored junctions
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Simulated Vehicles
              </span>

              <Car
                size={20}
                className="text-cyan-400"
              />
            </div>

            <div className="mt-3 text-3xl font-bold">
              {simulatedVehicles.length}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Moving in digital twin
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                High-Risk Junctions
              </span>

              <Siren
                size={20}
                className="text-orange-400"
              />
            </div>

            <div className="mt-3 text-3xl font-bold text-orange-400">
              {highCongestionJunctions.length}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Congestion ≥ 70
            </div>
          </div>

        </div>

        {/* Main content */}
        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* Road intelligence */}
          <div className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-900">

            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <div>
                <h2 className="font-semibold">
                  Road Network Intelligence
                </h2>

                <p className="text-xs text-slate-500">
                  Live simulated mobility conditions
                </p>
              </div>

              <TrendingUp
                size={19}
                className="text-blue-400"
              />
            </div>

            <div className="divide-y divide-slate-800">

              {loading ? (
                <div className="p-8 text-center text-slate-500">
                  Loading road network...
                </div>
              ) : roads.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No road data available.
                </div>
              ) : (
                roads.map((road, index) => {
                  const traffic = Number(
                    road.traffic_level ??
                    road.trafficLevel ??
                    0
                  );

                  const state =
                    getTrafficClass(traffic);

                  return (
                    <div
                      key={
                        road.road_id ??
                        road.id ??
                        index
                      }
                      className="flex flex-col gap-4 p-5 transition hover:bg-slate-800/40 md:flex-row md:items-center md:justify-between"
                    >

                      <div className="flex items-center gap-4">
                        <div className="rounded-xl bg-slate-800 p-3">
                          <Route
                            size={19}
                            className="text-slate-300"
                          />
                        </div>

                        <div>
                          <div className="font-medium">
                            {road.road_name ??
                              road.name ??
                              "Unnamed Road"}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            Road segment • Live simulation
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">

                        <div className="text-right">
                          <div className="text-xs text-slate-500">
                            Traffic
                          </div>

                          <div className="font-semibold">
                            {traffic}
                          </div>
                        </div>

                        <div
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${state.className}`}
                        >
                          {state.label}
                        </div>

                      </div>

                    </div>
                  );
                })
              )}

            </div>
          </div>

          {/* Mobility assets */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900">

            <div className="border-b border-slate-800 px-5 py-4">
              <h2 className="font-semibold">
                Mobility Assets
              </h2>

              <p className="text-xs text-slate-500">
                Digital twin vehicle activity
              </p>
            </div>

            <div className="space-y-4 p-5">

              <div className="flex items-center justify-between rounded-xl bg-slate-800/60 p-4">
                <div className="flex items-center gap-3">
                  <Car
                    size={20}
                    className="text-cyan-400"
                  />

                  <span>Cars</span>
                </div>

                <span className="font-bold">
                  {vehicleCounts.car}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-800/60 p-4">
                <div className="flex items-center gap-3">
                  <Bus
                    size={20}
                    className="text-blue-400"
                  />

                  <span>Buses</span>
                </div>

                <span className="font-bold">
                  {vehicleCounts.bus}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-800/60 p-4">
                <div className="flex items-center gap-3">
                  <Ambulance
                    size={20}
                    className="text-red-400"
                  />

                  <span>Ambulances</span>
                </div>

                <span className="font-bold">
                  {vehicleCounts.ambulance}
                </span>
              </div>

              <div className="mt-5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-400">
                  <MapPin size={16} />
                  Digital Twin
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Vehicle positions are simulated in real
                  time and represent the mobility layer of
                  the Chennai urban digital twin.
                </p>
              </div>

            </div>
          </div>

        </div>

        {/* Junction intelligence */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900">

          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <div>
              <h2 className="font-semibold">
                Junction & Signal Intelligence
              </h2>

              <p className="text-xs text-slate-500">
                Congestion-aware signal monitoring
              </p>
            </div>

            <Activity
              size={19}
              className="text-emerald-400"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">

            {junctions.length === 0 ? (
              <div className="text-sm text-slate-500">
                No junction data available.
              </div>
            ) : (
              junctions.map((junction, index) => {
                const traffic = Number(
                  junction.traffic_level ??
                  junction.trafficLevel ??
                  0
                );

                const congestion = Number(
                  junction.congestion_level ??
                  junction.congestionLevel ??
                  0
                );

                const state =
                  getTrafficClass(congestion);

                return (
                  <div
                    key={
                      junction.junction_id ??
                      junction.id ??
                      index
                    }
                    className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                  >

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">
                          {junction.junction_name ??
                            junction.name ??
                            "Junction"}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Signal monitoring
                        </div>
                      </div>

                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] ${state.className}`}
                      >
                        {state.label}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">

                      <div className="rounded-lg bg-slate-900 p-3">
                        <div className="text-[10px] uppercase text-slate-500">
                          Traffic
                        </div>

                        <div className="mt-1 text-xl font-bold">
                          {traffic}
                        </div>
                      </div>

                      <div className="rounded-lg bg-slate-900 p-3">
                        <div className="text-[10px] uppercase text-slate-500">
                          Congestion
                        </div>

                        <div className="mt-1 text-xl font-bold">
                          {congestion}
                        </div>
                      </div>

                    </div>

                  </div>
                );
              })
            )}

          </div>
        </div>

        {/* AI insight */}
        <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">

          <div className="flex items-start gap-4">

            <div className="rounded-xl bg-blue-500/10 p-3">
              <Activity
                size={22}
                className="text-blue-400"
              />
            </div>

            <div>
              <h2 className="font-semibold text-blue-300">
                AI Mobility Intelligence
              </h2>

              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
                The mobility layer combines simulated
                vehicle movement, road traffic levels,
                junction congestion and machine-learning
                predictions. This layer can later feed the
                AI Operations Agent for congestion response,
                emergency routing and signal optimization.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">

                <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400">
                  ML Traffic Prediction
                </span>

                <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400">
                  Live Simulation
                </span>

                <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400">
                  Signal Intelligence
                </span>

                <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400">
                  Emergency Routing
                </span>

              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

export default SmartMobility;