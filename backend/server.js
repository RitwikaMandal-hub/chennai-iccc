const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

require("dotenv").config();

const pool = require("./config/db");

const {
  generateSimulation
} = require("./simulation/simulationEngine");

const zoneRoutes = require("./routes/zones");
const roadRoutes = require("./routes/roads");
const junctionRoutes = require("./routes/junctions");
const sensorRoutes = require("./routes/sensors");
const sensorReadingRoutes = require("./routes/sensorReadings");
const dashboardRoutes = require("./routes/dashboard");
const eWasteRoutes = require("./routes/eWaste");

const app = express();


// ENVIRONMENT CONFIGURATION

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";

const PORT =
  process.env.PORT || 5000;


// MIDDLEWARE

app.use(
  cors({
    origin: FRONTEND_URL
  })
);

app.use(express.json());


// API ROUTES

app.use("/api/zones", zoneRoutes);
app.use("/api/roads", roadRoutes);
app.use("/api/junctions", junctionRoutes);
app.use("/api/sensors", sensorRoutes);
app.use("/api/sensor-readings", sensorReadingRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/e-waste", eWasteRoutes);


// BASIC ROUTES

app.get("/", (req, res) => {
  res.json({
    message: "Chennai AI ICCC Backend is running"
  });
});


app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    system: "Chennai AI ICCC"
  });
});


app.get("/api/db-test", async (req, res) => {

  try {

    const result = await pool.query("SELECT NOW()");

    res.json({
      status: "connected",
      database: "chennai_iccc",
      time: result.rows[0].now
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      status: "database connection failed"
    });

  }

});


// HTTP SERVER

const server = http.createServer(app);


// SOCKET.IO SERVER

const io = new Server(server, {

  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"]
  }

});


// SOCKET CONNECTION

io.on("connection", (socket) => {

  console.log("Frontend connected:", socket.id);

  socket.emit("system-status", {
    status: "online",
    message: "Connected to Chennai AI ICCC"
  });


  socket.on("disconnect", () => {

    console.log("Frontend disconnected:", socket.id);

  });

});


// REAL-TIME CITY SIMULATION

setInterval(async () => {

  try {

    const simulationData = await generateSimulation();

    if (simulationData) {

      io.emit(
        "simulation-update",
        simulationData
      );

    }

  } catch (error) {

    console.error(
      "Simulation error:",
      error
    );

  }

}, 5000);


// START SERVER

server.listen(PORT, () => {

  console.log(
    `Backend running on port ${PORT}`
  );

  console.log(
    `Frontend allowed origin: ${FRONTEND_URL}`
  );

  console.log(
    "Socket.IO real-time server enabled"
  );

  console.log(
    "City simulation engine started"
  );

});