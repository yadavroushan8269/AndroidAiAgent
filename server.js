require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET is not configured.");
}

// --------------------------------------------------
// DATABASE
// --------------------------------------------------

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL error:", err);
});

// --------------------------------------------------
// MIDDLEWARE
// --------------------------------------------------

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Frontend
app.use(express.static(path.join(__dirname, "public")));

// --------------------------------------------------
// DATABASE INITIALIZATION
// --------------------------------------------------

async function initializeDatabase() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // USERS
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        mobile VARCHAR(30),
        password_hash TEXT NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'Security Guard',
        company VARCHAR(150),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // VEHICLES
    await client.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        vehicle_number VARCHAR(50) UNIQUE NOT NULL,
        vehicle_type VARCHAR(100) NOT NULL,
        driver_name VARCHAR(150),
        contractor VARCHAR(150),
        status VARCHAR(30) NOT NULL DEFAULT 'Available',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ENTRIES
    await client.query(`
      CREATE TABLE IF NOT EXISTS entries (
        id SERIAL PRIMARY KEY,

        vehicle_id INTEGER NOT NULL
          REFERENCES vehicles(id)
          ON DELETE CASCADE,

        user_id INTEGER NOT NULL
          REFERENCES users(id)
          ON DELETE CASCADE,

        vehicle_number VARCHAR(50) NOT NULL,
        vehicle_type VARCHAR(100) NOT NULL,
        driver_name VARCHAR(150),
        contractor VARCHAR(150),

        entry_date DATE NOT NULL,
        entry_time TIME NOT NULL,
        exit_time TIME,

        duration INTEGER,

        purpose TEXT,
        notes TEXT,

        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // NOTIFICATIONS
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,

        user_id INTEGER NOT NULL
          REFERENCES users(id)
          ON DELETE CASCADE,

        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',

        is_read BOOLEAN NOT NULL DEFAULT FALSE,

        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // INDEXES
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_entries_vehicle_id
      ON entries(vehicle_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_entries_user_id
      ON entries(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_entries_entry_date
      ON entries(entry_date);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id
      ON notifications(user_id);
    `);

    await client.query("COMMIT");

    console.log("PostgreSQL database initialized.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Database initialization failed:", error);
    throw error;
  } finally {
    client.release();
  }
}

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required."
    });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token."
    });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== "Admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required."
    });
  }

  next();
}

function calculateDurationMinutes(entryTime, exitTime) {
  if (!entryTime || !exitTime) {
    return null;
  }

  const entry = entryTime.split(":").map(Number);
  const exit = exitTime.split(":").map(Number);

  let entryMinutes = entry[0] * 60 + entry[1];
  let exitMinutes = exit[0] * 60 + exit[1];

  // Supports overnight duration.
  if (exitMinutes < entryMinutes) {
    exitMinutes += 24 * 60;
  }

  return exitMinutes - entryMinutes;
}

function formatDuration(minutes) {
  if (minutes === null || minutes === undefined) {
    return null;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${hours}h ${mins}m`;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      success: true,
      message: "MY-HOME-GROUP server is running.",
      database: "connected"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed."
    });
  }
});

// ==================================================
// AUTHENTICATION
// ==================================================

// REGISTER
app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      name,
      mobile,
      email,
      password,
      company
    } = req.body;

    const normalizedEmail = normalizeEmail(email);

    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters."
      });
    }

    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `
      INSERT INTO users
        (name, email, mobile, password_hash, role, company)
      VALUES
        ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, mobile, role, company, created_at
      `,
      [
        name.trim(),
        normalizedEmail,
        mobile || null,
        passwordHash,
        "Security Guard",
        company || null
      ]
    );

    const user = result.rows[0];

    const token = createToken(user);

    res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create account."
    });
  }
});

// LOGIN
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, mobile, password } = req.body;

    if ((!email && !mobile) || !password) {
      return res.status(400).json({
        success: false,
        message: "Mobile/email and password are required."
      });
    }

    let result;

    if (email) {
      result = await pool.query(
        `
        SELECT *
        FROM users
        WHERE email = $1
        LIMIT 1
        `,
        [normalizeEmail(email)]
      );
    } else {
      result = await pool.query(
        `
        SELECT *
        FROM users
        WHERE mobile = $1
        LIMIT 1
        `,
        [String(mobile).trim()]
      );
    }

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid login credentials."
      });
    }

    const user = result.rows[0];

    const passwordValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid login credentials."
      });
    }

    const token = createToken(user);

    delete user.password_hash;

    res.json({
      success: true,
      message: "Login successful.",
      token,
      user
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to login."
    });
  }
});

// PROFILE
app.get("/api/auth/profile", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        mobile,
        role,
        company,
        created_at
      FROM users
      WHERE id = $1
      `,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error("Profile error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load profile."
    });
  }
});

// CHANGE PASSWORD
app.post(
  "/api/auth/change-password",
  authMiddleware,
  async (req, res) => {
    try {
      const {
        currentPassword,
        newPassword
      } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Current and new password are required."
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 6 characters."
        });
      }

      const result = await pool.query(
        "SELECT password_hash FROM users WHERE id = $1",
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found."
        });
      }

      const valid = await bcrypt.compare(
        currentPassword,
        result.rows[0].password_hash
      );

      if (!valid) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect."
        });
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);

      await pool.query(
        `
        UPDATE users
        SET password_hash = $1
        WHERE id = $2
        `,
        [passwordHash, req.user.id]
      );

      res.json({
        success: true,
        message: "Password changed successfully."
      });
    } catch (error) {
      console.error("Change password error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to change password."
      });
    }
  }
);

// ==================================================
// VEHICLES
// ==================================================

const VEHICLE_TYPES = [
  "TM / Transit Mixer",
  "Truck",
  "Dumper",
  "Excavator",
  "JCB",
  "Loader",
  "Crane",
  "Tractor",
  "Water Tanker",
  "Other"
];

// VEHICLE TYPES
app.get("/api/vehicles/types", authMiddleware, (req, res) => {
  res.json({
    success: true,
    vehicleTypes: VEHICLE_TYPES
  });
});

// ADD VEHICLE
app.post("/api/vehicles", authMiddleware, async (req, res) => {
  try {
    const {
      vehicle_number,
      vehicle_type,
      driver_name,
      contractor
    } = req.body;

    if (!vehicle_number || !vehicle_type) {
      return res.status(400).json({
        success: false,
        message: "Vehicle number and vehicle type are required."
      });
    }

    const result = await pool.query(
      `
      INSERT INTO vehicles
        (vehicle_number, vehicle_type, driver_name, contractor, status)
      VALUES
        ($1, $2, $3, $4, 'Available')
      RETURNING *
      `,
      [
        vehicle_number.trim().toUpperCase(),
        vehicle_type,
        driver_name || null,
        contractor || null
      ]
    );

    res.status(201).json({
      success: true,
      message: "Vehicle added successfully.",
      vehicle: result.rows[0]
    });
  } catch (error) {
    console.error("Add vehicle error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Vehicle number already exists."
      });
    }

    res.status(500).json({
      success: false,
      message: "Unable to add vehicle."
    });
  }
});

// LIST VEHICLES
app.get("/api/vehicles", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM vehicles
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      vehicles: result.rows
    });
  } catch (error) {
    console.error("List vehicles error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load vehicles."
    });
  }
});

// GET VEHICLE
app.get("/api/vehicles/:id", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM vehicles
      WHERE id = $1
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found."
      });
    }

    res.json({
      success: true,
      vehicle: result.rows[0]
    });
  } catch (error) {
    console.error("Get vehicle error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load vehicle."
    });
  }
});

// EDIT VEHICLE
app.put("/api/vehicles/:id", authMiddleware, async (req, res) => {
  try {
    const {
      vehicle_number,
      vehicle_type,
      driver_name,
      contractor,
      status
    } = req.body;

    const result = await pool.query(
      `
      UPDATE vehicles
      SET
        vehicle_number = COALESCE($1, vehicle_number),
        vehicle_type = COALESCE($2, vehicle_type),
        driver_name = $3,
        contractor = $4,
        status = COALESCE($5, status)
      WHERE id = $6
      RETURNING *
      `,
      [
        vehicle_number
          ? vehicle_number.trim().toUpperCase()
          : null,
        vehicle_type || null,
        driver_name || null,
        contractor || null,
        status || null,
        req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found."
      });
    }

    res.json({
      success: true,
      message: "Vehicle updated successfully.",
      vehicle: result.rows[0]
    });
  } catch (error) {
    console.error("Edit vehicle error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update vehicle."
    });
  }
});

// DELETE VEHICLE
app.delete("/api/vehicles/:id", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      DELETE FROM vehicles
      WHERE id = $1
      RETURNING id
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found."
      });
    }

    res.json({
      success: true,
      message: "Vehicle deleted successfully."
    });
  } catch (error) {
    console.error("Delete vehicle error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to delete vehicle."
    });
  }
});

// ==================================================
// ENTRIES
// ==================================================

// ADD ENTRY
app.post("/api/entries", authMiddleware, async (req, res) => {
  try {
    const {
      vehicle_id,
      driver_name,
      contractor,
      entry_date,
      entry_time,
      exit_time,
      purpose,
      notes
    } = req.body;

    if (!vehicle_id || !entry_date || !entry_time) {
      return res.status(400).json({
        success: false,
        message: "Vehicle, date and entry time are required."
      });
    }

    const vehicleResult = await pool.query(
      `
      SELECT *
      FROM vehicles
      WHERE id = $1
      `,
      [vehicle_id]
    );

    if (vehicleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found."
      });
    }

    const vehicle = vehicleResult.rows[0];

    const duration = calculateDurationMinutes(
      entry_time,
      exit_time
    );

    const result = await pool.query(
      `
      INSERT INTO entries
      (
        vehicle_id,
        user_id,
        vehicle_number,
        vehicle_type,
        driver_name,
        contractor,
        entry_date,
        entry_time,
        exit_time,
        duration,
        purpose,
        notes
      )
      VALUES
      (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12
      )
      RETURNING *
      `,
      [
        vehicle.id,
        req.user.id,
        vehicle.vehicle_number,
        vehicle.vehicle_type,
        driver_name || vehicle.driver_name || null,
        contractor || vehicle.contractor || null,
        entry_date,
        entry_time,
        exit_time || null,
        duration,
        purpose || null,
        notes || null
      ]
    );

    // Update vehicle status
    await pool.query(
      `
      UPDATE vehicles
      SET status = $1
      WHERE id = $2
      `,
      [
        exit_time ? "Available" : "Running",
        vehicle.id
      ]
    );

    // Notification
    await pool.query(
      `
      INSERT INTO notifications
      (user_id, title, message, type)
      VALUES ($1, $2, $3, $4)
      `,
      [
        req.user.id,
        "Vehicle Entry Added",
        `${vehicle.vehicle_type} ${vehicle.vehicle_number} entry saved.`,
        "entry"
      ]
    );

    res.status(201).json({
      success: true,
      message: "Entry saved successfully.",
      entry: {
        ...result.rows[0],
        duration_formatted: formatDuration(duration)
      }
    });
  } catch (error) {
    console.error("Add entry error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to save entry."
    });
  }
});

// LIST ENTRIES
app.get("/api/entries", authMiddleware, async (req, res) => {
  try {
    const {
      date,
      vehicle_id,
      driver,
      contractor
    } = req.query;

    const values = [req.user.id];
    const conditions = ["e.user_id = $1"];

    if (date) {
      values.push(date);
      conditions.push(`e.entry_date = $${values.length}`);
    }

    if (vehicle_id) {
      values.push(vehicle_id);
      conditions.push(`e.vehicle_id = $${values.length}`);
    }

    if (driver) {
      values.push(driver);
      conditions.push(`e.driver_name = $${values.length}`);
    }

    if (contractor) {
      values.push(contractor);
      conditions.push(`e.contractor = $${values.length}`);
    }

    const result = await pool.query(
      `
      SELECT
        e.*,
        CASE
          WHEN e.duration IS NULL THEN NULL
          ELSE
            FLOOR(e.duration / 60)::int || 'h ' ||
            (e.duration % 60)::int || 'm'
        END AS duration_formatted
      FROM entries e
      WHERE ${conditions.join(" AND ")}
      ORDER BY e.entry_date DESC, e.entry_time DESC
      `,
      values
    );

    res.json({
      success: true,
      entries: result.rows
    });
  } catch (error) {
    console.error("List entries error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load entries."
    });
  }
});

// GET SINGLE ENTRY
app.get("/api/entries/:id", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        e.*,
        CASE
          WHEN e.duration IS NULL THEN NULL
          ELSE
            FLOOR(e.duration / 60)::int || 'h ' ||
            (e.duration % 60)::int || 'm'
        END AS duration_formatted
      FROM entries e
      WHERE e.id = $1
        AND e.user_id = $2
      `,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Entry not found."
      });
    }

    res.json({
      success: true,
      entry: result.rows[0]
    });
  } catch (error) {
    console.error("Get entry error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load entry."
    });
  }
});

// DELETE ENTRY
app.delete("/api/entries/:id", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `
      DELETE FROM entries
      WHERE id = $1
        AND user_id = $2
      RETURNING vehicle_id
      `,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Entry not found."
      });
    }

    // Check if vehicle has another running entry.
    const running = await pool.query(
      `
      SELECT id
      FROM entries
      WHERE vehicle_id = $1
        AND exit_time IS NULL
      LIMIT 1
      `,
      [result.rows[0].vehicle_id]
    );

    await pool.query(
      `
      UPDATE vehicles
      SET status = $1
      WHERE id = $2
      `,
      [
        running.rows.length > 0 ? "Running" : "Available",
        result.rows[0].vehicle_id
      ]
    );

    res.json({
      success: true,
      message: "Entry deleted successfully."
    });
  } catch (error) {
    console.error("Delete entry error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to delete entry."
    });
  }
});

// ==================================================
// DASHBOARD
// ==================================================

app.get(
  "/api/dashboard",
  authMiddleware,
  async (req, res) => {
    try {
      const vehicleCount = await pool.query(`
        SELECT COUNT(*)::int AS total
        FROM vehicles
      `);

      const runningCount = await pool.query(`
        SELECT COUNT(*)::int AS total
        FROM vehicles
        WHERE status = 'Running'
      `);

      const durationResult = await pool.query(
        `
        SELECT COALESCE(SUM(duration), 0)::int AS total_minutes
        FROM entries
        WHERE user_id = $1
        `,
        [req.user.id]
      );

      const todayResult = await pool.query(
        `
        SELECT
          e.*,
          CASE
            WHEN e.duration IS NULL THEN NULL
            ELSE
              FLOOR(e.duration / 60)::int || 'h ' ||
              (e.duration % 60)::int || 'm'
          END AS duration_formatted
        FROM entries e
        WHERE e.user_id = $1
          AND e.entry_date = CURRENT_DATE
        ORDER BY e.entry_time DESC
        `,
        [req.user.id]
      );

      res.json({
        success: true,

        statistics: {
          vehicles: vehicleCount.rows[0].total,
          running: runningCount.rows[0].total,
          total_duration_minutes:
            durationResult.rows[0].total_minutes,
          total_duration:
            formatDuration(
              durationResult.rows[0].total_minutes
            )
        },

        today_activity: todayResult.rows
      });
    } catch (error) {
      console.error("Dashboard error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to load dashboard."
      });
    }
  }
);

// ==================================================
// CALENDAR
// ==================================================

app.get(
  "/api/calendar/:date",
  authMiddleware,
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          e.*,
          CASE
            WHEN e.duration IS NULL THEN NULL
            ELSE
              FLOOR(e.duration / 60)::int || 'h ' ||
              (e.duration % 60)::int || 'm'
          END AS duration_formatted
        FROM entries e
        WHERE e.user_id = $1
          AND e.entry_date = $2
        ORDER BY e.entry_time ASC
        `,
        [req.user.id, req.params.date]
      );

      const totalMinutes = result.rows.reduce(
        (total, entry) =>
          total + (entry.duration || 0),
        0
      );

      res.json({
        success: true,
        date: req.params.date,
        entries: result.rows,
        total_minutes: totalMinutes,
        total_duration: formatDuration(totalMinutes)
      });
    } catch (error) {
      console.error("Calendar error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to load calendar data."
      });
    }
  }
);

// ==================================================
// REPORTS
// ==================================================

app.get(
  "/api/reports",
  authMiddleware,
  async (req, res) => {
    try {
      const {
        from,
        to,
        vehicle_id,
        driver,
        contractor
      } = req.query;

      const values = [req.user.id];
      const conditions = ["e.user_id = $1"];

      if (from) {
        values.push(from);
        conditions.push(
          `e.entry_date >= $${values.length}`
        );
      }

      if (to) {
        values.push(to);
        conditions.push(
          `e.entry_date <= $${values.length}`
        );
      }

      if (vehicle_id) {
        values.push(vehicle_id);
        conditions.push(
          `e.vehicle_id = $${values.length}`
        );
      }

      if (driver) {
        values.push(driver);
        conditions.push(
          `e.driver_name = $${values.length}`
        );
      }

      if (contractor) {
        values.push(contractor);
        conditions.push(
          `e.contractor = $${values.length}`
        );
      }

      const result = await pool.query(
        `
        SELECT
          e.*,
          CASE
            WHEN e.duration IS NULL THEN NULL
            ELSE
              FLOOR(e.duration / 60)::int || 'h ' ||
              (e.duration % 60)::int || 'm'
          END AS duration_formatted
        FROM entries e
        WHERE ${conditions.join(" AND ")}
        ORDER BY e.entry_date DESC, e.entry_time DESC
        `,
        values
      );

      const totalVehicles = new Set(
        result.rows.map((entry) => entry.vehicle_id)
      ).size;

      const totalEntries = result.rows.length;

      const totalDuration = result.rows.reduce(
        (total, entry) =>
          total + (entry.duration || 0),
        0
      );

      res.json({
        success: true,

        summary: {
          total_vehicles: totalVehicles,
          total_entries: totalEntries,
          total_duration_minutes: totalDuration,
          total_duration: formatDuration(totalDuration)
        },

        entries: result.rows
      });
    } catch (error) {
      console.error("Reports error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to generate report."
      });
    }
  }
);

// ==================================================
// NOTIFICATIONS
// ==================================================

// LIST NOTIFICATIONS
app.get(
  "/api/notifications",
  authMiddleware,
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT *
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        `,
        [req.user.id]
      );

      res.json({
        success: true,
        notifications: result.rows
      });
    } catch (error) {
      console.error("Notifications error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to load notifications."
      });
    }
  }
);

// CREATE NOTIFICATION
app.post(
  "/api/notifications",
  authMiddleware,
  async (req, res) => {
    try {
      const {
        title,
        message,
        type
      } = req.body;

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          message: "Title and message are required."
        });
      }

      const result = await pool.query(
        `
        INSERT INTO notifications
          (user_id, title, message, type)
        VALUES
          ($1, $2, $3, $4)
        RETURNING *
        `,
        [
          req.user.id,
          title,
          message,
          type || "info"
        ]
      );

      res.status(201).json({
        success: true,
        notification: result.rows[0]
      });
    } catch (error) {
      console.error("Create notification error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to create notification."
      });
    }
  }
);

// MARK ONE READ
app.patch(
  "/api/notifications/:id/read",
  authMiddleware,
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        UPDATE notifications
        SET is_read = TRUE
        WHERE id = $1
          AND user_id = $2
        RETURNING *
        `,
        [req.params.id, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Notification not found."
        });
      }

      res.json({
        success: true,
        notification: result.rows[0]
      });
    } catch (error) {
      console.error("Mark notification error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to mark notification."
      });
    }
  }
);

// MARK ALL READ
app.patch(
  "/api/notifications/read-all",
  authMiddleware,
  async (req, res) => {
    try {
      await pool.query(
        `
        UPDATE notifications
        SET is_read = TRUE
        WHERE user_id = $1
        `,
        [req.user.id]
      );

      res.json({
        success: true,
        message: "All notifications marked as read."
      });
    } catch (error) {
      console.error("Mark all read error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to update notifications."
      });
    }
  }
);

// DELETE NOTIFICATION
app.delete(
  "/api/notifications/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        DELETE FROM notifications
        WHERE id = $1
          AND user_id = $2
        RETURNING id
        `,
        [req.params.id, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Notification not found."
        });
      }

      res.json({
        success: true,
        message: "Notification deleted."
      });
    } catch (error) {
      console.error("Delete notification error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to delete notification."
      });
    }
  }
);

// CLEAR ALL NOTIFICATIONS
app.delete(
  "/api/notifications",
  authMiddleware,
  async (req, res) => {
    try {
      await pool.query(
        `
        DELETE FROM notifications
        WHERE user_id = $1
        `,
        [req.user.id]
      );

      res.json({
        success: true,
        message: "All notifications cleared."
      });
    } catch (error) {
      console.error("Clear notifications error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to clear notifications."
      });
    }
  }
);

// ==================================================
// ADMIN
// ==================================================

// USER MANAGEMENT
app.get(
  "/api/admin/users",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          id,
          name,
          email,
          mobile,
          role,
          company,
          created_at
        FROM users
        ORDER BY created_at DESC
      `);

      res.json({
        success: true,
        users: result.rows
      });
    } catch (error) {
      console.error("Admin users error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to load users."
      });
    }
  }
);

// ==================================================
// FRONTEND ROUTES
// ==================================================

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

app.get("/login", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "public",
      "pages",
      "login.html"
    )
  );
});

app.get("/register", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "public",
      "pages",
      "register.html"
    )
  );
});

app.get("/dashboard", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "public",
      "pages",
      "dashboard.html"
    )
  );
});

// ==================================================
// 404 API HANDLER
// ==================================================

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found."
  });
});

// ==================================================
// START SERVER
// ==================================================

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(
        `MY-HOME-GROUP server running on port ${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Server could not start:",
      error
    );

    process.exit(1);
  }
}

startServer();
