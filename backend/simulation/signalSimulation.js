const pool = require("../config/db");

let signals = [];
let initialized = false;

async function loadSignals() {
  const result = await pool.query(`
    SELECT
      signal_id,
      junction_id,
      signal_status,
      green_duration,
      red_duration
    FROM traffic_signals
    ORDER BY signal_id;
  `);

  signals = result.rows.map((signal) => ({
    signal_id: signal.signal_id,
    junction_id: signal.junction_id,
    signal_status:
      signal.signal_status || "GREEN",
    green_duration:
      Number(signal.green_duration) || 30,
    red_duration:
      Number(signal.red_duration) || 30,
    elapsed: 0
  }));

  initialized = true;

  console.log(
    `[SIGNALS] Loaded ${signals.length} traffic signals`
  );
}

function getNextState(currentState) {
  if (currentState === "GREEN") {
    return "RED";
  }

  return "GREEN";
}

async function updateSignals(junctions) {
  try {
    if (!initialized) {
      await loadSignals();
    }

    for (const signal of signals) {

      signal.elapsed += 5;

      const junction =
        junctions.find(
          (item) =>
            item.junction_id ===
            signal.junction_id
        );

      let greenDuration =
        signal.green_duration;

      let redDuration =
        signal.red_duration;

      /*
       * Adaptive signal behaviour:
       * highly congested junctions receive
       * a longer green phase.
       */

      if (
        junction &&
        junction.congestion_level >= 75
      ) {
        greenDuration += 10;
      }

      if (signal.signal_status === "GREEN") {

        if (
          signal.elapsed >= greenDuration
        ) {
          signal.signal_status = "RED";
          signal.elapsed = 0;
        }

      }
      else {

        if (
          signal.elapsed >= redDuration
        ) {
          signal.signal_status = "GREEN";
          signal.elapsed = 0;
        }
      }

      await pool.query(
        `
        UPDATE traffic_signals
        SET
          signal_status = $1,
          green_duration = $2,
          red_duration = $3
        WHERE signal_id = $4
        `,
        [
          signal.signal_status,
          greenDuration,
          redDuration,
          signal.signal_id
        ]
      );
    }

    return signals.map(
      (signal) => {

        const junction =
          junctions.find(
            (item) =>
              item.junction_id ===
              signal.junction_id
          );

        return {
          signal_id:
            signal.signal_id,

          junction_id:
            signal.junction_id,

          signal_status:
            signal.signal_status,

          green_duration:
            signal.green_duration,

          red_duration:
            signal.red_duration,

          congestion_level:
            junction
              ? junction.congestion_level
              : 0
        };
      }
    );

  }
  catch (error) {

    console.error(
      "[SIGNAL SIMULATION ERROR]",
      error
    );

    return [];
  }
}

module.exports = {
  updateSignals
};
