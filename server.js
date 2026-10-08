const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();

const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error("JWT_SECRET is missing or too short.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
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
      email VARCHAR(180) UNIQUE NOT NULL,
      mobile VARCHAR(30),
      password_hash TEXT NOT NULL,
      role VARCHAR(30) NOT NULL DEFAULT 'Security Guard',
      company VARCHAR(180),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id SERIAL PRIMARY KEY,
      vehicle_number VARCHAR(50) UNIQUE NOT NULL,
      vehicle_type VARCHAR(80) NOT NULL,
      driver_name VARCHAR(120),
      contractor VARCHAR(180),
      status VARCHAR(30) DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
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
      purpose TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) DEFAULT 'general',
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("Database tables ready.");
}

/* =========================================================
   HELPERS
========================================================= */

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function getTokenFromRequest(req) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.substring(7);
}

function authRequired(req, res, next) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        message: "Authentication required."
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token."
    });
  }
}

function adminRequired(req, res, next) {
  if (!req.user || req.user.role !== "Admin") {
    return res.status(403).json({
      message: "Admin access required."
    });
  }

  next();
}

function calculateDuration(entryTime, exitTime) {
  if (!entryTime || !exitTime) {
    return 0;
  }

  const [eh, em] = String(entryTime).split(":").map(Number);
  const [xh, xm] = String(exitTime).split(":").map(Number);

  if (
    Number.isNaN(eh) ||
    Number.isNaN(em) ||
    Number.isNaN(xh) ||
    Number.isNaN(xm)
  ) {
    return 0;
  }

  let start = eh * 60 + em;
  let end = xh * 60 + xm;

  if (end < start) {
    end += 24 * 60;
  }

  return end - start;
}

/* =========================================================
   HEALTH
========================================================= */

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      status: "ok",
      app: "My Home Group",
      service: "Vehicle Duration Management",
      database: "connected"
    });
  } catch (error) {
    console.error("Health error:", error);

    res.status(500).json({
      status: "error",
      app: "My Home Group",
      database: "disconnected"
    });
  }
});

/* =========================================================
   AUTH
========================================================= */

app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      password,
      company
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required."
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters."
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existing.rows.length) {
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    const passwordHash = await bcrypt.hash(
      String(password),
      12
    );

    const result = await pool.query(
      `
      INSERT INTO users
      (name, email, mobile, password_hash, role, company)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, mobile, role, company, created_at
      `,
      [
        String(name).trim(),
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
      message: "Registration successful.",
      token,
      user
    });

  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      message: "Registration failed."
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const {
      email,
      password
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

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
      WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (!result.rows.length) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(
      String(password),
      user.password_hash
    );

    if (!validPassword) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    delete user.password_hash;

    const token = createToken(user);

    res.json({
      message: "Login successful.",
      token,
      user
    });

  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Login failed."
    });
  }
});

app.get("/api/me", authRequired, async (req, res) => {
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

    if (!result.rows.length) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error("Get me error:", error);

    res.status(500).json({
      message: "Unable to load profile."
    });
  }
});

app.put("/api/me", authRequired, async (req, res) => {
  try {
    const {
      name,
      mobile,
      company
    } = req.body;

    const result = await pool.query(
      `
      UPDATE users
      SET
        name = COALESCE($1, name),
        mobile = COALESCE($2, mobile),
        company = COALESCE($3, company)
      WHERE id = $4
      RETURNING id, name, email, mobile, role, company, created_at
      `,
      [
        name ?? null,
        mobile ?? null,
        company ?? null,
        req.user.id
      ]
    );

    res.json(result.rows[0]);

  } catch (error) {
    console.error("Profile update error:", error);

    res.status(500).json({
      message: "Profile update failed."
    });
  }
});

app.post("/api/auth/change-password", authRequired, async (req, res) => {
  try {
    const {
      currentPassword,
      newPassword
    } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current and new password are required."
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters."
      });
    }

    const result = await pool.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    const valid = await bcrypt.compare(
      String(currentPassword),
      result.rows[0].password_hash
    );

    if (!valid) {
      return res.status(400).json({
        message: "Current password is incorrect."
      });
    }

    const newHash = await bcrypt.hash(
      String(newPassword),
      12
    );

    await pool.query(
      `
      UPDATE users
      SET password_hash = $1
      WHERE id = $2
      `,
      [
        newHash,
        req.user.id
      ]
    );

    res.json({
      message: "Password changed successfully."
    });

  } catch (error) {
    console.error("Change password error:", error);

    res.status(500).json({
      message: "Password change failed."
    });
  }
});

/* =========================================================
   VEHICLES
========================================================= */

app.get("/api/vehicles", authRequired, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM vehicles
      ORDER BY id DESC
      `
    );

    res.json(result.rows);

  } catch (error) {
    console.error("Get vehicles error:", error);

    res.status(500).json({
      message: "Unable to load vehicles."
    });
  }
});

app.post("/api/vehicles", authRequired, async (req, res) => {
  try {
    const {
      vehicle_number,
      vehicle_type,
      driver_name,
      contractor,
      status
    } = req.body;

    if (!vehicle_number || !vehicle_type) {
      return res.status(400).json({
        message: "Vehicle number and type are required."
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
        String(vehicle_number).trim().toUpperCase(),
        vehicle_type,
        driver_name || null,
        contractor || null,
        status || "Active"
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error("Create vehicle error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Vehicle number already exists."
      });
    }

    res.status(500).json({
      message: "Unable to create vehicle."
    });
  }
});

app.put("/api/vehicles/:id", authRequired, async (req, res) => {
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
          ? String(vehicle_number).trim().toUpperCase()
          : null,
        vehicle_type || null,
        driver_name || null,
        contractor || null,
        status || null,
        req.params.id
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        message: "Vehicle not found."
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error("Update vehicle error:", error);

    res.status(500).json({
      message: "Unable to update vehicle."
    });
  }
});

app.delete(
  "/api/vehicles/:id",
  authRequired,
  adminRequired,
  async (req, res) => {
    try {
      const result = await pool.query(
        "DELETE FROM vehicles WHERE id = $1 RETURNING id",
        [req.params.id]
      );

      if (!result.rows.length) {
        return res.status(404).json({
          message: "Vehicle not found."
        });
      }

      res.json({
        message: "Vehicle deleted successfully."
      });

    } catch (error) {
      console.error("Delete vehicle error:", error);

      res.status(500).json({
        message: "Unable to delete vehicle."
      });
    }
  }
);

/* =========================================================
   ENTRIES
========================================================= */

app.get("/api/entries", authRequired, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM entries
      ORDER BY entry_date DESC, entry_time DESC, id DESC
      `
    );

    res.json(result.rows);

  } catch (error) {
    console.error("Get entries error:", error);

    res.status(500).json({
      message: "Unable to load entries."
    });
  }
});

app.post("/api/entries", authRequired, async (req, res) => {
  try {
    const {
      vehicle_id,
      vehicle_number,
      vehicle_type,
      driver_name,
      contractor,
      entry_date,
      entry_time,
      exit_time,
      purpose,
      notes
    } = req.body;

    if (
      !vehicle_number ||
      !entry_date ||
      !entry_time
    ) {
      return res.status(400).json({
        message: "Vehicle, date and entry time are required."
      });
    }

    const duration = calculateDuration(
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
        vehicle_id || null,
        req.user.id,
        String(vehicle_number).trim().toUpperCase(),
        vehicle_type || null,
        driver_name || null,
        contractor || null,
        entry_date,
        entry_time,
        exit_time || null,
        duration,
        purpose || null,
        notes || null
      ]
    );

    const entry = result.rows[0];

    /* Automatic notification for the user */
    try {
      await pool.query(
        `
        INSERT INTO notifications
        (user_id, title, message, type)
        VALUES ($1, $2, $3, $4)
        `,
        [
          req.user.id,
          "Vehicle Entry Added",
          `${entry.vehicle_number} entry has been recorded successfully.`,
          "entry"
        ]
      );
    } catch (notificationError) {
      console.error(
        "Entry notification error:",
        notificationError
      );
    }

    res.status(201).json(entry);

  } catch (error) {
    console.error("Create entry error:", error);

    res.status(500).json({
      message: "Unable to create entry."
    });
  }
});

app.delete("/api/entries/:id", authRequired, async (req, res) => {
  try {
    let result;

    if (req.user.role === "Admin") {
      result = await pool.query(
        `
        DELETE FROM entries
        WHERE id = $1
        RETURNING id
        `,
        [req.params.id]
      );
    } else {
      result = await pool.query(
        `
        DELETE FROM entries
        WHERE id = $1
          AND user_id = $2
        RETURNING id
        `,
        [
          req.params.id,
          req.user.id
        ]
      );
    }

    if (!result.rows.length) {
      return res.status(404).json({
        message: "Entry not found or permission denied."
      });
    }

    res.json({
      message: "Entry deleted successfully."
    });

  } catch (error) {
    console.error("Delete entry error:", error);

    res.status(500).json({
      message: "Unable to delete entry."
    });
  }
});

/* =========================================================
   NOTIFICATIONS
========================================================= */

app.get(
  "/api/notifications",
  authRequired,
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

      res.json(result.rows);

    } catch (error) {
      console.error("Get notifications error:", error);

      res.status(500).json({
        message: "Unable to load notifications."
      });
    }
  }
);

app.get(
  "/api/notifications/unread-count",
  authRequired,
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
        count: result.rows[0].count
      });

    } catch (error) {
      console.error(
        "Unread notification count error:",
        error
      );

      res.status(500).json({
        message: "Unable to load unread count."
      });
    }
  }
);

app.post(
  "/api/notifications",
  authRequired,
  async (req, res) => {
    try {
      const {
        title,
        message,
        type
      } = req.body;

      if (!title || !message) {
        return res.status(400).json({
          message: "Title and message are required."
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
          type || "general"
        ]
      );

      res.status(201).json(result.rows[0]);

    } catch (error) {
      console.error(
        "Create notification error:",
        error
      );

      res.status(500).json({
        message: "Unable to create notification."
      });
    }
  }
);

app.post(
  "/api/admin/notifications",
  authRequired,
  adminRequired,
  async (req, res) => {
    try {
      const {
        user_id,
        title,
        message,
        type
      } = req.body;

      if (!user_id || !title || !message) {
        return res.status(400).json({
          message: "User, title and message are required."
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
          user_id,
          title,
          message,
          type || "admin"
        ]
      );

      res.status(201).json(result.rows[0]);

    } catch (error) {
      console.error(
        "Admin notification error:",
        error
      );

      res.status(500).json({
        message: "Unable to send notification."
      });
    }
  }
);

app.put(
  "/api/notifications/:id/read",
  authRequired,
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
        [
          req.params.id,
          req.user.id
        ]
      );

      if (!result.rows.length) {
        return res.status(404).json({
          message: "Notification not found."
        });
      }

      res.json(result.rows[0]);

    } catch (error) {
      console.error(
        "Mark notification read error:",
        error
      );

      res.status(500).json({
        message: "Unable to update notification."
      });
    }
  }
);

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
        `,
        [req.user.id]
      );

      res.json({
        message: "All notifications marked as read."
      });

    } catch (error) {
      console.error(
        "Mark all notifications error:",
        error
      );

      res.status(500).json({
        message: "Unable to update notifications."
      });
    }
  }
);

app.delete(
  "/api/notifications/:id",
  authRequired,
  async (req, res) => {
    try {
      const result = await pool.query(
        `
        DELETE FROM notifications
        WHERE id = $1
          AND user_id = $2
        RETURNING id
        `,
        [
          req.params.id,
          req.user.id
        ]
      );

      if (!result.rows.length) {
        return res.status(404).json({
          message: "Notification not found."
        });
      }

      res.json({
        message: "Notification deleted."
      });

    } catch (error) {
      console.error(
        "Delete notification error:",
        error
      );

      res.status(500).json({
        message: "Unable to delete notification."
      });
    }
  }
);

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
        message: "All notifications deleted."
      });

    } catch (error) {
      console.error(
        "Clear notifications error:",
        error
      );

      res.status(500).json({
        message: "Unable to clear notifications."
      });
    }
  }
);

/* =========================================================
   ADMIN USERS
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
        ORDER BY id DESC
        `
      );

      res.json(result.rows);

    } catch (error) {
      console.error("Admin users error:", error);

      res.status(500).json({
        message: "Unable to load users."
      });
    }
  }
);

/* =========================================================
   STATIC FILES
========================================================= */

const publicPath = path.join(__dirname, "public");

/*
  IMPORTANT:
  Static middleware is mounted BEFORE the fallback route.
  This allows:
    /index.html
    /style.css
    /app.js
    /pages/login.html
    /pages/register.html
    etc.
  to open correctly.
*/

app.use(
  express.static(publicPath, {
    extensions: ["html"],
    index: "index.html"
  })
);

/* Explicit page routes for reliability */

app.get("/", (req, res) => {
  res.sendFile(
    path.join(publicPath, "index.html")
  );
});

app.get("/login", (req, res) => {
  res.sendFile(
    path.join(publicPath, "pages", "login.html")
  );
});

app.get("/register", (req, res) => {
  res.sendFile(
    path.join(publicPath, "pages", "register.html")
  );
});

app.get("/dashboard", (req, res) => {
  res.sendFile(
    path.join(publicPath, "pages", "dashboard.html")
  );
});

/* =========================================================
   404
========================================================= */

app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({
      message: "API endpoint not found."
    });
  }

  res.status(404).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Page Not Found</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px 20px;
            background: #f5f7fa;
          }

          a {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 20px;
            background: #f59e0b;
            color: white;
            text-decoration: none;
            border-radius: 10px;
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

/* =========================================================
   START SERVER
========================================================= */

async function startServer() {
  try {
    await initDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `My Home Group server running on port ${PORT}`
      );
    });

  } catch (error) {
    console.error(
      "Server startup failed:",
      error
    );

    process.exit(1);
  }
}

startServer();
