const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 10000;

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error("ERROR: JWT_SECRET is missing or too short.");
  process.exit(1);
}

// ============================================================
// DATABASE
// ============================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL error:", err);
});

// ============================================================
// EXPRESS
// ============================================================

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// HELPERS
// ============================================================

function cleanString(value, maxLength = 255) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, maxLength);
}

function cleanEmail(value) {
  return cleanString(value, 255).toLowerCase();
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    role: user.role,
    company: user.company,
    created_at: user.created_at,
  };
}

// ============================================================
// AUTH MIDDLEWARE
// ============================================================

function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const token = authHeader.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token missing.",
      });
    }

    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Session expired or invalid. Please login again.",
    });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "Admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required.",
    });
  }

  next();
}

// ============================================================
// DATABASE INITIALIZATION
// ============================================================

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      mobile VARCHAR(30),
      password_hash TEXT NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'Security Guard',
      company VARCHAR(150),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id SERIAL PRIMARY KEY,
      vehicle_number VARCHAR(100) UNIQUE NOT NULL,
      vehicle_type VARCHAR(100) NOT NULL,
      driver_name VARCHAR(150),
      contractor VARCHAR(150),
      status VARCHAR(50) DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS entries (
      id SERIAL PRIMARY KEY,
      vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      vehicle_number VARCHAR(100) NOT NULL,
      vehicle_type VARCHAR(100),
      driver_name VARCHAR(150),
      contractor VARCHAR(150),
      entry_date DATE NOT NULL,
      entry_time TIME NOT NULL,
      exit_time TIME,
      duration INTEGER DEFAULT 0,
      purpose VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ==========================================================
  // NOTIFICATIONS TABLE
  // ==========================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'info',
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    ALTER TABLE users
    ALTER COLUMN role SET DEFAULT 'Security Guard'
  `);

  console.log("Database initialized successfully.");
}

// ============================================================
// HEALTH
// ============================================================

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      status: "ok",
      database: "connected",
      service: "My Home Group Vehicle Duration Management",
    });
  } catch (error) {
    console.error("Health check error:", error);

    res.status(500).json({
      status: "error",
      database: "disconnected",
    });
  }
});

// ============================================================
// AUTH - REGISTER
// ============================================================

app.post("/api/auth/register", async (req, res) => {
  try {
    const name = cleanString(req.body.name, 150);
    const email = cleanEmail(req.body.email);
    const mobile = cleanString(req.body.mobile, 30);
    const password = String(req.body.password || "");
    const company = cleanString(req.body.company, 150);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required.",
      });
    }

    if (!email || !validEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    const existing = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Public registration can never create Admin.
    const role = "Security Guard";

    const result = await pool.query(
      `
      INSERT INTO users
      (name, email, mobile, password_hash, role, company)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, mobile, role, company, created_at
      `,
      [
        name,
        email,
        mobile || null,
        passwordHash,
        role,
        company || null,
      ]
    );

    const user = result.rows[0];
    const token = createToken(user);

    res.status(201).json({
      success: true,
      message: "Registration successful.",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
    });
  }
});

// ============================================================
// AUTH - LOGIN
// ============================================================

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = cleanEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        mobile,
        password_hash,
        role,
        company,
        created_at
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = createToken(user);

    res.json({
      success: true,
      message: "Login successful.",
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
});

// ============================================================
// CURRENT USER
// ============================================================

app.get("/api/me", authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, name, email, mobile, role, company, created_at
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.json({
      success: true,
      user: publicUser(result.rows[0]),
    });
  } catch (error) {
    console.error("Get me error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load profile.",
    });
  }
});

// ============================================================
// UPDATE PROFILE
// ============================================================

app.put("/api/me", authenticate, async (req, res) => {
  try {
    const name = cleanString(req.body.name, 150);
    const mobile = cleanString(req.body.mobile, 30);
    const company = cleanString(req.body.company, 150);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required.",
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET
        name = $1,
        mobile = $2,
        company = $3
      WHERE id = $4
      RETURNING id, name, email, mobile, role, company, created_at
      `,
      [
        name,
        mobile || null,
        company || null,
        req.user.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully.",
      user: publicUser(result.rows[0]),
    });
  } catch (error) {
    console.error("Update profile error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update profile.",
    });
  }
});

// ============================================================
// CHANGE PASSWORD
// ============================================================

app.post("/api/auth/change-password", authenticate, async (req, res) => {
  try {
    const currentPassword = String(
      req.body.currentPassword || ""
    );

    const newPassword = String(
      req.body.newPassword || ""
    );

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current and new password are required.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters.",
      });
    }

    const result = await pool.query(
      `
      SELECT id, password_hash
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await pool.query(
      `
      UPDATE users
      SET password_hash = $1
      WHERE id = $2
      `,
      [newHash, req.user.id]
    );

    res.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Change password error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to change password.",
    });
  }
});

// ============================================================
// VEHICLES - GET
// ============================================================

app.get("/api/vehicles", authenticate, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        vehicle_number,
        vehicle_type,
        driver_name,
        contractor,
        status,
        created_at
      FROM vehicles
      ORDER BY vehicle_number ASC
    `);

    res.json({
      success: true,
      vehicles: result.rows,
    });
  } catch (error) {
    console.error("Get vehicles error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load vehicles.",
    });
  }
});

// ============================================================
// VEHICLES - CREATE
// ============================================================

app.post("/api/vehicles", authenticate, async (req, res) => {
  try {
    const vehicleNumber = cleanString(
      req.body.vehicle_number || req.body.vehicleNumber,
      100
    ).toUpperCase();

    const vehicleType = cleanString(
      req.body.vehicle_type || req.body.vehicleType,
      100
    );

    const driverName = cleanString(
      req.body.driver_name || req.body.driverName,
      150
    );

    const contractor = cleanString(
      req.body.contractor,
      150
    );

    const status =
      cleanString(req.body.status, 50) || "Active";

    if (!vehicleNumber || !vehicleType) {
      return res.status(400).json({
        success: false,
        message: "Vehicle number and type are required.",
      });
    }

    const existing = await pool.query(
      `
      SELECT id
      FROM vehicles
      WHERE UPPER(vehicle_number) = UPPER($1)
      `,
      [vehicleNumber]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Vehicle already exists.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO vehicles
      (vehicle_number, vehicle_type, driver_name, contractor, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        vehicleNumber,
        vehicleType,
        driverName || null,
        contractor || null,
        status,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Vehicle added successfully.",
      vehicle: result.rows[0],
    });
  } catch (error) {
    console.error("Create vehicle error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to add vehicle.",
    });
  }
});

// ============================================================
// VEHICLES - UPDATE
// ============================================================

app.put("/api/vehicles/:id", authenticate, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID.",
      });
    }

    const vehicleNumber = cleanString(
      req.body.vehicle_number || req.body.vehicleNumber,
      100
    ).toUpperCase();

    const vehicleType = cleanString(
      req.body.vehicle_type || req.body.vehicleType,
      100
    );

    const driverName = cleanString(
      req.body.driver_name || req.body.driverName,
      150
    );

    const contractor = cleanString(
      req.body.contractor,
      150
    );

    const status =
      cleanString(req.body.status, 50) || "Active";

    if (!vehicleNumber || !vehicleType) {
      return res.status(400).json({
        success: false,
        message: "Vehicle number and type are required.",
      });
    }

    const duplicate = await pool.query(
      `
      SELECT id
      FROM vehicles
      WHERE UPPER(vehicle_number) = UPPER($1)
      AND id <> $2
      `,
      [vehicleNumber, id]
    );

    if (duplicate.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Another vehicle already uses this number.",
      });
    }

    const result = await pool.query(
      `
      UPDATE vehicles
      SET
        vehicle_number = $1,
        vehicle_type = $2,
        driver_name = $3,
        contractor = $4,
        status = $5
      WHERE id = $6
      RETURNING *
      `,
      [
        vehicleNumber,
        vehicleType,
        driverName || null,
        contractor || null,
        status,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found.",
      });
    }

    res.json({
      success: true,
      message: "Vehicle updated successfully.",
      vehicle: result.rows[0],
    });
  } catch (error) {
    console.error("Update vehicle error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update vehicle.",
    });
  }
});

// ============================================================
// VEHICLES - DELETE
// ============================================================

app.delete("/api/vehicles/:id", authenticate, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID.",
      });
    }

    if (req.user.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Only Admin can delete vehicles.",
      });
    }

    const result = await pool.query(
      `
      DELETE FROM vehicles
      WHERE id = $1
      RETURNING id
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found.",
      });
    }

    res.json({
      success: true,
      message: "Vehicle deleted successfully.",
    });
  } catch (error) {
    console.error("Delete vehicle error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to delete vehicle.",
    });
  }
});

// ============================================================
// ENTRIES - GET
// ============================================================

app.get("/api/entries", authenticate, async (req, res) => {
  try {
    const date = cleanString(req.query.date, 20);
    const vehicleId = cleanString(req.query.vehicle_id, 30);
    const from = cleanString(req.query.from, 20);
    const to = cleanString(req.query.to, 20);

    let query = `
      SELECT
        e.id,
        e.vehicle_id,
        e.user_id,
        e.vehicle_number,
        e.vehicle_type,
        e.driver_name,
        e.contractor,
        e.entry_date,
        e.entry_time,
        e.exit_time,
        e.duration,
        e.purpose,
        e.notes,
        e.created_at
      FROM entries e
      WHERE 1 = 1
    `;

    const values = [];
    let index = 1;

    if (date) {
      query += ` AND e.entry_date = $${index}`;
      values.push(date);
      index++;
    }

    if (vehicleId) {
      query += ` AND e.vehicle_id = $${index}`;
      values.push(Number(vehicleId));
      index++;
    }

    if (from) {
      query += ` AND e.entry_date >= $${index}`;
      values.push(from);
      index++;
    }

    if (to) {
      query += ` AND e.entry_date <= $${index}`;
      values.push(to);
      index++;
    }

    query += `
      ORDER BY
        e.entry_date DESC,
        e.entry_time DESC,
        e.id DESC
    `;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      entries: result.rows,
    });
  } catch (error) {
    console.error("Get entries error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to load entries.",
    });
  }
});

// ============================================================
// ENTRIES - CREATE
// ============================================================

app.post("/api/entries", authenticate, async (req, res) => {
  try {
    const vehicleId = Number(
      req.body.vehicle_id || req.body.vehicleId
    );

    const vehicleNumber = cleanString(
      req.body.vehicle_number || req.body.vehicleNumber,
      100
    ).toUpperCase();

    const vehicleType = cleanString(
      req.body.vehicle_type || req.body.vehicleType,
      100
    );

    const driverName = cleanString(
      req.body.driver_name || req.body.driverName,
      150
    );

    const contractor = cleanString(
      req.body.contractor,
      150
    );

    const entryDate = cleanString(
      req.body.entry_date || req.body.entryDate,
      20
    );

    const entryTime = cleanString(
      req.body.entry_time || req.body.entryTime,
      20
    );

    const exitTime = cleanString(
      req.body.exit_time || req.body.exitTime,
      20
    );

    const purpose = cleanString(req.body.purpose, 255);
    const notes = cleanString(req.body.notes, 2000);

    let duration = Number(req.body.duration);

    if (!Number.isFinite(duration) || duration < 0) {
      duration = 0;
    }

    duration = Math.round(duration);

    if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid vehicle is required.",
      });
    }

    if (!vehicleNumber || !entryDate || !entryTime) {
      return res.status(400).json({
        success: false,
        message: "Vehicle, entry date and entry time are required.",
      });
    }

    const vehicleResult = await pool.query(
      `
      SELECT *
      FROM vehicles
      WHERE id = $1
      LIMIT 1
      `,
      [vehicleId]
    );

    if (vehicleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found.",
      });
    }

    const vehicle = vehicleResult.rows[0];

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
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
      `,
      [
        vehicleId,
        req.user.id,
        vehicle.vehicle_number,
        vehicle.vehicle_type,
        driverName || vehicle.driver_name || null,
        contractor || vehicle.contractor || null,
        entryDate,
        entryTime,
        exitTime || null,
        duration,
        purpose || null,
        notes || null,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Entry saved successfully.",
      entry: result.rows[0],
    });
  } catch (error) {
    console.error("Create entry error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to save entry.",
    });
  }
});

// ============================================================
// ENTRIES - DELETE
// ============================================================

app.delete("/api/entries/:id", authenticate, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid entry ID.",
      });
    }

    let result;

    if (req.user.role === "Admin") {
      result = await pool.query(
        `
        DELETE FROM entries
        WHERE id = $1
        RETURNING id
        `,
        [id]
      );
    } else {
      result = await pool.query(
        `
        DELETE FROM entries
        WHERE id = $1
        AND user_id = $2
        RETURNING id
        `,
        [id, req.user.id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Entry not found or permission denied.",
      });
    }

    res.json({
      success: true,
      message: "Entry deleted successfully.",
    });
  } catch (error) {
    console.error("Delete entry error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to delete entry.",
    });
  }
});

// ============================================================
// NOTIFICATIONS - GET
// ============================================================

app.get(
  "/api/notifications",
  authenticate,
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT
          id,
          title,
          message,
          type,
          is_read,
          created_at
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC, id DESC
        `,
        [req.user.id]
      );

      res.json({
        success: true,
        notifications: result.rows,
      });
    } catch (error) {
      console.error("Get notifications error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to load notifications.",
      });
    }
  }
);

// ============================================================
// NOTIFICATIONS - UNREAD COUNT
// ============================================================

app.get(
  "/api/notifications/unread-count",
  authenticate,
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT COUNT(*)::int AS count
        FROM notifications
        WHERE user_id = $1
        AND is_read = FALSE
        `,
        [req.user.id]
      );

      res.json({
        success: true,
        count: result.rows[0].count,
      });
    } catch (error) {
      console.error("Unread count error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to load unread count.",
      });
    }
  }
);

// ============================================================
// NOTIFICATIONS - CREATE
// ============================================================

app.post(
  "/api/notifications",
  authenticate,
  async (req, res) => {
    try {
      const title = cleanString(req.body.title, 200);
      const message = cleanString(req.body.message, 2000);
      const type =
        cleanString(req.body.type, 50) || "info";

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          message: "Title and message are required.",
        });
      }

      const result = await pool.query(
        `
        INSERT INTO notifications
        (user_id, title, message, type)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [
          req.user.id,
          title,
          message,
          type,
        ]
      );

      res.status(201).json({
        success: true,
        message: "Notification created.",
        notification: result.rows[0],
      });
    } catch (error) {
      console.error("Create notification error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to create notification.",
      });
    }
  }
);

// ============================================================
// ADMIN - SEND NOTIFICATION TO USER
// ============================================================

app.post(
  "/api/admin/notifications",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const userId = Number(req.body.user_id);
      const title = cleanString(req.body.title, 200);
      const message = cleanString(req.body.message, 2000);
      const type =
        cleanString(req.body.type, 50) || "info";

      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid user ID is required.",
        });
      }

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          message: "Title and message are required.",
        });
      }

      const userCheck = await pool.query(
        "SELECT id FROM users WHERE id = $1",
        [userId]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      const result = await pool.query(
        `
        INSERT INTO notifications
        (user_id, title, message, type)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [
          userId,
          title,
          message,
          type,
        ]
      );

      res.status(201).json({
        success: true,
        message: "Notification sent successfully.",
        notification: result.rows[0],
      });
    } catch (error) {
      console.error("Admin notification error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to send notification.",
      });
    }
  }
);

// ============================================================
// NOTIFICATIONS - MARK ONE READ
// ============================================================

app.put(
  "/api/notifications/:id/read",
  authenticate,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid notification ID.",
        });
      }

      const result = await pool.query(
        `
        UPDATE notifications
        SET is_read = TRUE
        WHERE id = $1
        AND user_id = $2
        RETURNING *
        `,
        [id, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Notification not found.",
        });
      }

      res.json({
        success: true,
        message: "Notification marked as read.",
        notification: result.rows[0],
      });
    } catch (error) {
      console.error("Mark notification read error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to update notification.",
      });
    }
  }
);

// ============================================================
// NOTIFICATIONS - MARK ALL READ
// ============================================================

app.put(
  "/api/notifications/read-all",
  authenticate,
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
        message: "All notifications marked as read.",
      });
    } catch (error) {
      console.error("Mark all notifications error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to update notifications.",
      });
    }
  }
);

// ============================================================
// NOTIFICATIONS - DELETE ONE
// ============================================================

app.delete(
  "/api/notifications/:id",
  authenticate,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid notification ID.",
        });
      }

      const result = await pool.query(
        `
        DELETE FROM notifications
        WHERE id = $1
        AND user_id = $2
        RETURNING id
        `,
        [id, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Notification not found.",
        });
      }

      res.json({
        success: true,
        message: "Notification deleted.",
      });
    } catch (error) {
      console.error("Delete notification error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to delete notification.",
      });
    }
  }
);

// ============================================================
// NOTIFICATIONS - CLEAR ALL
// ============================================================

app.delete(
  "/api/notifications",
  authenticate,
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
        message: "All notifications cleared.",
      });
    } catch (error) {
      console.error("Clear notifications error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to clear notifications.",
      });
    }
  }
);

// ============================================================
// ADMIN - USERS
// ============================================================

app.get(
  "/api/admin/users",
  authenticate,
  requireAdmin,
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
        users: result.rows,
      });
    } catch (error) {
      console.error("Admin users error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to load users.",
      });
    }
  }
);

// ============================================================
// STATIC FILES
// ============================================================

const publicPath = path.join(__dirname, "public");

app.use(express.static(publicPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// ============================================================
// API 404
// ============================================================

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found.",
  });
});

// ============================================================
// GENERAL 404
// ============================================================

app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Page Not Found</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #f5f5f5;
            padding: 40px;
            text-align: center;
          }
          a {
            color: #f59e0b;
            text-decoration: none;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <h1>404</h1>
        <p>Page not found.</p>
        <a href="/">Go Home</a>
      </body>
    </html>
  `);
});

// ============================================================
// START
// ============================================================

async function startServer() {
  try {
    await initDatabase();

    app.listen(PORT, () => {
      console.log(
        `My Home Group server running on port ${PORT}`
      );
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();
