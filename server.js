const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();

const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error("ERROR: JWT_SECRET must be set and at least 32 characters long.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

/* =========================================================
   DATABASE
========================================================= */

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(180) UNIQUE,
      mobile VARCHAR(30),
      password_hash TEXT NOT NULL,
      role VARCHAR(30) NOT NULL DEFAULT 'Security Guard',
      company VARCHAR(180),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id SERIAL PRIMARY KEY,
      vehicle_number VARCHAR(50) UNIQUE NOT NULL,
      vehicle_type VARCHAR(80) NOT NULL,
      driver_name VARCHAR(120),
      contractor VARCHAR(180),
      status VARCHAR(30) NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS entries (
      id SERIAL PRIMARY KEY,
      vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      vehicle_number VARCHAR(50) NOT NULL,
      vehicle_type VARCHAR(80),
      driver_name VARCHAR(120),
      contractor VARCHAR(180),
      entry_date DATE NOT NULL,
      entry_time TIME NOT NULL,
      exit_time TIME,
      duration INTEGER DEFAULT 0,
      purpose VARCHAR(180),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'info',
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_entries_date
      ON entries(entry_date);

    CREATE INDEX IF NOT EXISTS idx_entries_vehicle
      ON entries(vehicle_id);

    CREATE INDEX IF NOT EXISTS idx_entries_user
      ON entries(user_id);

    CREATE INDEX IF NOT EXISTS idx_notifications_user
      ON notifications(user_id);
  `);

  console.log("Database initialized");
}

/* =========================================================
   HELPERS
========================================================= */

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function cleanString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email || ""
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
    created_at: user.created_at
  };
}

function getTokenFromRequest(req) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7).trim();
}

/* =========================================================
   AUTH MIDDLEWARE
========================================================= */

function authRequired(req, res, next) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
}

function adminRequired(req, res, next) {
  if (!req.user || req.user.role !== "Admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required"
    });
  }

  next();
}

/* =========================================================
   HEALTH
========================================================= */

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      status: "ok",
      database: "connected",
      service: "My Home Group Vehicle Duration Management"
    });
  } catch (error) {
    console.error("Health error:", error);

    res.status(500).json({
      status: "error",
      database: "disconnected"
    });
  }
});

/* =========================================================
   AUTH - REGISTER
========================================================= */

app.post("/api/auth/register", async (req, res) => {
  try {
    const name = cleanString(req.body.name);
    const email = normalizeEmail(req.body.email);
    const mobile = cleanString(req.body.mobile);
    const password = String(req.body.password || "");
    const company = cleanString(req.body.company);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required"
      });
    }

    if (!email && !mobile) {
      return res.status(400).json({
        success: false,
        message: "Email or mobile is required"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters"
      });
    }

    if (email) {
      const existing = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );

      if (existing.rows.length) {
        return res.status(409).json({
          success: false,
          message: "Email already registered"
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    /*
      Public registration always creates Security Guard.
      Admin cannot be created by sending role from frontend.
    */
    const result = await pool.query(
      `
      INSERT INTO users
        (name, email, mobile, password_hash, role, company)
      VALUES
        ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, mobile, role, company, created_at
      `,
      [
        name,
        email || null,
        mobile || null,
        passwordHash,
        "Security Guard",
        company || null
      ]
    );

    const user = result.rows[0];
    const token = signToken(user);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: publicUser(user)
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      success: false,
      message: "Registration failed"
    });
  }
});

/* =========================================================
   AUTH - LOGIN
========================================================= */

app.post("/api/auth/login", async (req, res) => {
  try {
    const login = cleanString(req.body.login || req.body.email);
    const password = String(req.body.password || "");

    if (!login || !password) {
      return res.status(400).json({
        success: false,
        message: "Login and password are required"
      });
    }

    const email = normalizeEmail(login);

    const result = await pool.query(
      `
      SELECT *
      FROM users
      WHERE LOWER(email) = $1
         OR mobile = $2
      LIMIT 1
      `,
      [email, login]
    );

    if (!result.rows.length) {
      return res.status(401).json({
        success: false,
        message: "Invalid login or password"
      });
    }

    const user = result.rows[0];

    const passwordOk = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordOk) {
      return res.status(401).json({
        success: false,
        message: "Invalid login or password"
      });
    }

    const token = signToken(user);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: publicUser(user)
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Login failed"
    });
  }
});

/* =========================================================
   CURRENT USER
========================================================= */

app.get("/api/me", authRequired, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, name, email, mobile, role, company, created_at
      FROM users
      WHERE id = $1
      `,
      [req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      user: publicUser(result.rows[0])
    });
  } catch (error) {
    console.error("Get me error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load profile"
    });
  }
});

/* =========================================================
   UPDATE PROFILE
========================================================= */

app.put("/api/me", authRequired, async (req, res) => {
  try {
    const name = cleanString(req.body.name);
    const mobile = cleanString(req.body.mobile);
    const company = cleanString(req.body.company);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required"
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET name = $1,
          mobile = $2,
          company = $3
      WHERE id = $4
      RETURNING id, name, email, mobile, role, company, created_at
      `,
      [
        name,
        mobile || null,
        company || null,
        req.user.id
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      message: "Profile updated",
      user: publicUser(result.rows[0])
    });
  } catch (error) {
    console.error("Update profile error:", error);

    res.status(500).json({
      success: false,
      message: "Profile update failed"
    });
  }
});

/* =========================================================
   CHANGE PASSWORD
========================================================= */

app.post("/api/auth/change-password", authRequired, async (req, res) => {
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
        message: "Current and new password are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters"
      });
    }

    const result = await pool.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const correct = await bcrypt.compare(
      currentPassword,
      result.rows[0].password_hash
    );

    if (!correct) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect"
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
      message: "Password changed successfully"
    });
  } catch (error) {
    console.error("Change password error:", error);

    res.status(500).json({
      success: false,
      message: "Password change failed"
    });
  }
});

/* =========================================================
   VEHICLES - GET
========================================================= */

app.get("/api/vehicles", authRequired, async (req, res) => {
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
      vehicles: result.rows
    });
  } catch (error) {
    console.error("Get vehicles error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load vehicles"
    });
  }
});

/* =========================================================
   VEHICLES - CREATE
========================================================= */

app.post("/api/vehicles", authRequired, async (req, res) => {
  try {
    const vehicleNumber = cleanString(req.body.vehicle_number);
    const vehicleType = cleanString(req.body.vehicle_type);
    const driverName = cleanString(req.body.driver_name);
    const contractor = cleanString(req.body.contractor);
    const status = cleanString(req.body.status) || "Active";

    if (!vehicleNumber || !vehicleType) {
      return res.status(400).json({
        success: false,
        message: "Vehicle number and type are required"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO vehicles
        (vehicle_number, vehicle_type, driver_name, contractor, status)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        vehicleNumber.toUpperCase(),
        vehicleType,
        driverName || null,
        contractor || null,
        status
      ]
    );

    res.status(201).json({
      success: true,
      message: "Vehicle added successfully",
      vehicle: result.rows[0]
    });
  } catch (error) {
    console.error("Create vehicle error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Vehicle number already exists"
      });
    }

    res.status(500).json({
      success: false,
      message: "Could not add vehicle"
    });
  }
});

/* =========================================================
   VEHICLES - UPDATE
========================================================= */

app.put("/api/vehicles/:id", authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vehicle ID"
      });
    }

    const vehicleNumber = cleanString(req.body.vehicle_number);
    const vehicleType = cleanString(req.body.vehicle_type);
    const driverName = cleanString(req.body.driver_name);
    const contractor = cleanString(req.body.contractor);
    const status = cleanString(req.body.status) || "Active";

    if (!vehicleNumber || !vehicleType) {
      return res.status(400).json({
        success: false,
        message: "Vehicle number and type are required"
      });
    }

    const result = await pool.query(
      `
      UPDATE vehicles
      SET vehicle_number = $1,
          vehicle_type = $2,
          driver_name = $3,
          contractor = $4,
          status = $5
      WHERE id = $6
      RETURNING *
      `,
      [
        vehicleNumber.toUpperCase(),
        vehicleType,
        driverName || null,
        contractor || null,
        status,
        id
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found"
      });
    }

    res.json({
      success: true,
      message: "Vehicle updated successfully",
      vehicle: result.rows[0]
    });
  } catch (error) {
    console.error("Update vehicle error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Vehicle number already exists"
      });
    }

    res.status(500).json({
      success: false,
      message: "Could not update vehicle"
    });
  }
});

/* =========================================================
   VEHICLES - DELETE
========================================================= */

app.delete(
  "/api/vehicles/:id",
  authRequired,
  adminRequired,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid vehicle ID"
        });
      }

      const result = await pool.query(
        "DELETE FROM vehicles WHERE id = $1 RETURNING id",
        [id]
      );

      if (!result.rows.length) {
        return res.status(404).json({
          success: false,
          message: "Vehicle not found"
        });
      }

      res.json({
        success: true,
        message: "Vehicle deleted successfully"
      });
    } catch (error) {
      console.error("Delete vehicle error:", error);

      res.status(500).json({
        success: false,
        message: "Could not delete vehicle"
      });
    }
  }
);

/* =========================================================
   ENTRIES - GET
========================================================= */

app.get("/api/entries", authRequired, async (req, res) => {
  try {
    const conditions = [];
    const values = [];

    if (req.query.date) {
      values.push(req.query.date);
      conditions.push(`e.entry_date = $${values.length}`);
    }

    if (req.query.from) {
      values.push(req.query.from);
      conditions.push(`e.entry_date >= $${values.length}`);
    }

    if (req.query.to) {
      values.push(req.query.to);
      conditions.push(`e.entry_date <= $${values.length}`);
    }

    if (req.query.vehicle_id) {
      values.push(Number(req.query.vehicle_id));
      conditions.push(`e.vehicle_id = $${values.length}`);
    }

    const where = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const result = await pool.query(
      `
      SELECT
        e.id,
        e.vehicle_id,
        e.user_id,
        e.vehicle_number,
        e.vehicle_type,
        e.driver_name,
        e.contractor,
        TO_CHAR(e.entry_date, 'YYYY-MM-DD') AS entry_date,
        TO_CHAR(e.entry_time, 'HH24:MI') AS entry_time,
        CASE
          WHEN e.exit_time IS NULL THEN NULL
          ELSE TO_CHAR(e.exit_time, 'HH24:MI')
        END AS exit_time,
        e.duration,
        e.purpose,
        e.notes,
        e.created_at
      FROM entries e
      ${where}
      ORDER BY e.entry_date DESC, e.entry_time DESC, e.id DESC
      `,
      values
    );

    res.json({
      success: true,
      entries: result.rows
    });
  } catch (error) {
    console.error("Get entries error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load entries"
    });
  }
});

/* =========================================================
   ENTRIES - CREATE
========================================================= */

app.post("/api/entries", authRequired, async (req, res) => {
  try {
    const vehicleId = Number(req.body.vehicle_id);
    const entryDate = cleanString(req.body.entry_date);
    const entryTime = cleanString(req.body.entry_time);
    const exitTime = cleanString(req.body.exit_time);
    const purpose = cleanString(req.body.purpose);
    const notes = cleanString(req.body.notes);

    if (!Number.isInteger(vehicleId)) {
      return res.status(400).json({
        success: false,
        message: "Vehicle is required"
      });
    }

    if (!entryDate || !entryTime) {
      return res.status(400).json({
        success: false,
        message: "Date and entry time are required"
      });
    }

    const vehicleResult = await pool.query(
      `
      SELECT *
      FROM vehicles
      WHERE id = $1
      `,
      [vehicleId]
    );

    if (!vehicleResult.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found"
      });
    }

    const vehicle = vehicleResult.rows[0];

    let duration = 0;

    if (exitTime) {
      const start = new Date(`1970-01-01T${entryTime}`);
      const end = new Date(`1970-01-01T${exitTime}`);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid time"
        });
      }

      let difference = end.getTime() - start.getTime();

      /*
        Supports overnight duration.
        Example: 23:30 -> 01:00
      */
      if (difference < 0) {
        difference += 24 * 60 * 60 * 1000;
      }

      duration = Math.round(difference / 60000);
    }

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
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
      `,
      [
        vehicle.id,
        req.user.id,
        vehicle.vehicle_number,
        vehicle.vehicle_type,
        vehicle.driver_name,
        vehicle.contractor,
        entryDate,
        entryTime,
        exitTime || null,
        duration,
        purpose || null,
        notes || null
      ]
    );

    res.status(201).json({
      success: true,
      message: "Entry saved successfully",
      entry: result.rows[0]
    });
  } catch (error) {
    console.error("Create entry error:", error);

    res.status(500).json({
      success: false,
      message: "Could not save entry"
    });
  }
});

/* =========================================================
   ENTRIES - DELETE
========================================================= */

app.delete("/api/entries/:id", authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid entry ID"
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

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Entry not found or you do not have permission"
      });
    }

    res.json({
      success: true,
      message: "Entry deleted successfully"
    });
  } catch (error) {
    console.error("Delete entry error:", error);

    res.status(500).json({
      success: false,
      message: "Could not delete entry"
    });
  }
});

/* =========================================================
   NOTIFICATIONS - GET
========================================================= */

app.get("/api/notifications", authRequired, async (req, res) => {
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
      ORDER BY created_at DESC
      `,
      [req.user.id]
    );

    res.json({
      success: true,
      notifications: result.rows
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load notifications"
    });
  }
});

/* =========================================================
   NOTIFICATIONS - UNREAD COUNT
========================================================= */

app.get(
  "/api/notifications/unread-count",
  authRequired,
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        SELECT COUNT(*)::INTEGER AS count
        FROM notifications
        WHERE user_id = $1
          AND is_read = FALSE
        `,
        [req.user.id]
      );

      res.json({
        success: true,
        count: result.rows[0].count
      });
    } catch (error) {
      console.error("Unread notification error:", error);

      res.status(500).json({
        success: false,
        message: "Could not get notification count"
      });
    }
  }
);

/* =========================================================
   NOTIFICATIONS - CREATE FOR CURRENT USER
========================================================= */

app.post("/api/notifications", authRequired, async (req, res) => {
  try {
    const title = cleanString(req.body.title);
    const message = cleanString(req.body.message);
    const type = cleanString(req.body.type) || "info";

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required"
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
        type
      ]
    );

    res.status(201).json({
      success: true,
      message: "Notification created",
      notification: result.rows[0]
    });
  } catch (error) {
    console.error("Create notification error:", error);

    res.status(500).json({
      success: false,
      message: "Could not create notification"
    });
  }
});

/* =========================================================
   ADMIN - SEND NOTIFICATION
========================================================= */

app.post(
  "/api/admin/notifications",
  authRequired,
  adminRequired,
  async (req, res) => {
    try {
      const userId = Number(req.body.user_id);
      const title = cleanString(req.body.title);
      const message = cleanString(req.body.message);
      const type = cleanString(req.body.type) || "info";

      if (!Number.isInteger(userId)) {
        return res.status(400).json({
          success: false,
          message: "Valid user ID is required"
        });
      }

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          message: "Title and message are required"
        });
      }

      const userResult = await pool.query(
        "SELECT id FROM users WHERE id = $1",
        [userId]
      );

      if (!userResult.rows.length) {
        return res.status(404).json({
          success: false,
          message: "User not found"
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
          userId,
          title,
          message,
          type
        ]
      );

      res.status(201).json({
        success: true,
        message: "Notification sent",
        notification: result.rows[0]
      });
    } catch (error) {
      console.error("Admin notification error:", error);

      res.status(500).json({
        success: false,
        message: "Could not send notification"
      });
    }
  }
);

/* =========================================================
   NOTIFICATION - MARK READ
========================================================= */

app.put(
  "/api/notifications/:id/read",
  authRequired,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid notification ID"
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

      if (!result.rows.length) {
        return res.status(404).json({
          success: false,
          message: "Notification not found"
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
        message: "Could not update notification"
      });
    }
  }
);

/* =========================================================
   NOTIFICATIONS - MARK ALL READ
========================================================= */

app.put(
  "/api/notifications/read-all",
  authRequired,
  async (req, res) => {
    try {
      await pool.query(
        `
        UPDATE notifications
        SET is_read = TRUE
        WHERE user_id = $1
          AND is_read = FALSE
        `,
        [req.user.id]
      );

      res.json({
        success: true,
        message: "All notifications marked as read"
      });
    } catch (error) {
      console.error("Mark all notifications error:", error);

      res.status(500).json({
        success: false,
        message: "Could not update notifications"
      });
    }
  }
);

/* =========================================================
   NOTIFICATION - DELETE ONE
========================================================= */

app.delete(
  "/api/notifications/:id",
  authRequired,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid notification ID"
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

      if (!result.rows.length) {
        return res.status(404).json({
          success: false,
          message: "Notification not found"
        });
      }

      res.json({
        success: true,
        message: "Notification deleted"
      });
    } catch (error) {
      console.error("Delete notification error:", error);

      res.status(500).json({
        success: false,
        message: "Could not delete notification"
      });
    }
  }
);

/* =========================================================
   NOTIFICATIONS - DELETE ALL
========================================================= */

app.delete(
  "/api/notifications",
  authRequired,
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
        message: "All notifications cleared"
      });
    } catch (error) {
      console.error("Clear notifications error:", error);

      res.status(500).json({
        success: false,
        message: "Could not clear notifications"
      });
    }
  }
);

/* =========================================================
   ADMIN - USERS
========================================================= */

app.get(
  "/api/admin/users",
  authRequired,
  adminRequired,
  async (req, res) => {
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
        ORDER BY created_at DESC
        `
      );

      res.json({
        success: true,
        users: result.rows
      });
    } catch (error) {
      console.error("Admin users error:", error);

      res.status(500).json({
        success: false,
        message: "Could not load users"
      });
    }
  }
);

/* =========================================================
   STATIC FILES
========================================================= */

const publicPath = path.join(__dirname, "public");

app.use(express.static(publicPath));

/*
  Root always opens the main landing page.
*/
app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

/*
  Prevent API routes from falling through to HTML.
*/
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found"
  });
});

/*
  Website fallback.
  Existing files are served normally by express.static.
*/
app.use((req, res) => {
  res.status(404).send("Page not found");
});

/* =========================================================
   SERVER START
========================================================= */

async function startServer() {
  try {
    await initDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`My Home Group server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();
