const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();

const PORT = process.env.PORT || 3000;

const JWT_SECRET =
  process.env.JWT_SECRET || "change-this-secret-in-render";

const DATABASE_URL =
  process.env.DATABASE_URL || "";


/* =========================================================
   DATABASE
========================================================= */

let pool = null;

if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
}


/* =========================================================
   EXPRESS
========================================================= */

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true
  })
);

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);


/* =========================================================
   DATABASE INITIALIZATION
========================================================= */

async function initializeDatabase() {

  if (!pool) {
    console.log(
      "DATABASE_URL not configured. Running without database."
    );

    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(180) UNIQUE NOT NULL,
      mobile VARCHAR(30),
      password_hash TEXT NOT NULL,
      role VARCHAR(40) NOT NULL DEFAULT 'Security Guard',
      company VARCHAR(180),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id SERIAL PRIMARY KEY,
      vehicle_number VARCHAR(60) UNIQUE NOT NULL,
      vehicle_type VARCHAR(80) NOT NULL,
      driver_name VARCHAR(120),
      contractor VARCHAR(180),
      status VARCHAR(30) NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS entries (
      id SERIAL PRIMARY KEY,
      vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      vehicle_number VARCHAR(60),
      vehicle_type VARCHAR(80),
      driver_name VARCHAR(120),
      contractor VARCHAR(180),
      entry_date DATE NOT NULL,
      entry_time VARCHAR(20) NOT NULL,
      exit_time VARCHAR(20),
      duration INTEGER DEFAULT 0,
      purpose VARCHAR(180),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("Database tables ready.");
}


/* =========================================================
   HELPERS
========================================================= */

function requireDatabase(req, res, next) {

  if (!pool) {
    return res.status(503).json({
      success: false,
      message:
        "Database is not configured yet. Add DATABASE_URL in Render."
    });
  }

  next();
}


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


function authRequired(req, res, next) {

  const header =
    req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required."
    });
  }

  const token =
    header.substring(7);

  try {

    const decoded =
      jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();

  } catch (error) {

    return res.status(401).json({
      success: false,
      message: "Invalid or expired login session."
    });

  }
}


function clean(value) {

  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value).trim();
}


/* =========================================================
   HEALTH
========================================================= */

app.get("/health", async (req, res) => {

  let database = "not configured";

  if (pool) {

    try {

      await pool.query("SELECT 1");

      database = "connected";

    } catch (error) {

      database = "error";

    }

  }

  res.json({
    status: "ok",
    app: "My Home Group",
    service: "Vehicle Duration Management",
    database
  });

});


/* =========================================================
   AUTH - REGISTER
========================================================= */

app.post(
  "/api/auth/register",
  requireDatabase,
  async (req, res) => {

    try {

      const name =
        clean(req.body.name);

      const email =
        clean(req.body.email).toLowerCase();

      const mobile =
        clean(req.body.mobile);

      const company =
        clean(req.body.company);

      const role =
        clean(req.body.role) ||
        "Security Guard";

      const password =
        clean(req.body.password);


      if (
        !name ||
        !email ||
        !password
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Name, email and password are required."
        });

      }


      if (password.length < 6) {

        return res.status(400).json({
          success: false,
          message:
            "Password must be at least 6 characters."
        });

      }


      const existing =
        await pool.query(
          `
          SELECT id
          FROM users
          WHERE email = $1
          LIMIT 1
          `,
          [email]
        );


      if (existing.rows.length > 0) {

        return res.status(409).json({
          success: false,
          message:
            "An account with this email already exists."
        });

      }


      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );


      const result =
        await pool.query(
          `
          INSERT INTO users
          (
            name,
            email,
            mobile,
            password_hash,
            role,
            company
          )
          VALUES
          ($1, $2, $3, $4, $5, $6)
          RETURNING
            id,
            name,
            email,
            mobile,
            role,
            company,
            created_at
          `,
          [
            name,
            email,
            mobile,
            passwordHash,
            role,
            company
          ]
        );


      const user =
        result.rows[0];

      const token =
        createToken(user);


      res.status(201).json({
        success: true,
        message: "Account created successfully.",
        token,
        user
      });

    } catch (error) {

      console.error(
        "REGISTER ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to create account."
      });

    }

  }
);


/* =========================================================
   AUTH - LOGIN
========================================================= */

app.post(
  "/api/auth/login",
  requireDatabase,
  async (req, res) => {

    try {

      const login =
        clean(req.body.login).toLowerCase();

      const password =
        clean(req.body.password);


      if (!login || !password) {

        return res.status(400).json({
          success: false,
          message:
            "Login and password are required."
        });

      }


      const result =
        await pool.query(
          `
          SELECT *
          FROM users
          WHERE LOWER(email) = $1
             OR mobile = $2
          LIMIT 1
          `,
          [
            login,
            clean(req.body.login)
          ]
        );


      if (result.rows.length === 0) {

        return res.status(401).json({
          success: false,
          message:
            "Invalid login details."
        });

      }


      const user =
        result.rows[0];


      const valid =
        await bcrypt.compare(
          password,
          user.password_hash
        );


      if (!valid) {

        return res.status(401).json({
          success: false,
          message:
            "Invalid login details."
        });

      }


      const safeUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        company: user.company,
        created_at: user.created_at
      };


      const token =
        createToken(safeUser);


      res.json({
        success: true,
        message: "Login successful.",
        token,
        user: safeUser
      });

    } catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to login."
      });

    }

  }
);


/* =========================================================
   AUTH - CURRENT USER
========================================================= */

app.get(
  "/api/me",
  requireDatabase,
  authRequired,
  async (req, res) => {

    try {

      const result =
        await pool.query(
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
          LIMIT 1
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

      console.error(
        "ME ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to load user."
      });

    }

  }
);


/* =========================================================
   UPDATE PROFILE
========================================================= */

app.put(
  "/api/me",
  requireDatabase,
  authRequired,
  async (req, res) => {

    try {

      const name =
        clean(req.body.name);

      const mobile =
        clean(req.body.mobile);

      const company =
        clean(req.body.company);


      if (!name) {

        return res.status(400).json({
          success: false,
          message:
            "Name is required."
        });

      }


      const result =
        await pool.query(
          `
          UPDATE users
          SET
            name = $1,
            mobile = $2,
            company = $3
          WHERE id = $4
          RETURNING
            id,
            name,
            email,
            mobile,
            role,
            company,
            created_at
          `,
          [
            name,
            mobile,
            company,
            req.user.id
          ]
        );


      res.json({
        success: true,
        user: result.rows[0]
      });

    } catch (error) {

      console.error(
        "PROFILE UPDATE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to update profile."
      });

    }

  }
);


/* =========================================================
   CHANGE PASSWORD
========================================================= */

app.post(
  "/api/auth/change-password",
  requireDatabase,
  authRequired,
  async (req, res) => {

    try {

      const currentPassword =
        clean(req.body.currentPassword);

      const newPassword =
        clean(req.body.newPassword);


      if (
        !currentPassword ||
        !newPassword
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Current and new password are required."
        });

      }


      if (newPassword.length < 6) {

        return res.status(400).json({
          success: false,
          message:
            "New password must be at least 6 characters."
        });

      }


      const result =
        await pool.query(
          `
          SELECT password_hash
          FROM users
          WHERE id = $1
          LIMIT 1
          `,
          [req.user.id]
        );


      if (result.rows.length === 0) {

        return res.status(404).json({
          success: false,
          message: "User not found."
        });

      }


      const valid =
        await bcrypt.compare(
          currentPassword,
          result.rows[0].password_hash
        );


      if (!valid) {

        return res.status(401).json({
          success: false,
          message:
            "Current password is incorrect."
        });

      }


      const newHash =
        await bcrypt.hash(
          newPassword,
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
        success: true,
        message:
          "Password changed successfully."
      });

    } catch (error) {

      console.error(
        "PASSWORD ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to change password."
      });

    }

  }
);


/* =========================================================
   VEHICLES - GET
========================================================= */

app.get(
  "/api/vehicles",
  requireDatabase,
  authRequired,
  async (req, res) => {

    try {

      const result =
        await pool.query(`
          SELECT *
          FROM vehicles
          ORDER BY created_at DESC
        `);


      res.json({
        success: true,
        vehicles: result.rows
      });

    } catch (error) {

      console.error(
        "GET VEHICLES ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to load vehicles."
      });

    }

  }
);


/* =========================================================
   VEHICLES - CREATE
========================================================= */

app.post(
  "/api/vehicles",
  requireDatabase,
  authRequired,
  async (req, res) => {

    try {

      const vehicleNumber =
        clean(req.body.vehicleNumber);

      const vehicleType =
        clean(req.body.vehicleType);

      const driverName =
        clean(req.body.driverName);

      const contractor =
        clean(req.body.contractor);

      const status =
        clean(req.body.status) ||
        "Active";


      if (
        !vehicleNumber ||
        !vehicleType
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Vehicle number and type are required."
        });

      }


      const result =
        await pool.query(
          `
          INSERT INTO vehicles
          (
            vehicle_number,
            vehicle_type,
            driver_name,
            contractor,
            status
          )
          VALUES
          ($1, $2, $3, $4, $5)
          RETURNING *
          `,
          [
            vehicleNumber,
            vehicleType,
            driverName,
            contractor,
            status
          ]
        );


      res.status(201).json({
        success: true,
        vehicle: result.rows[0]
      });

    } catch (error) {

      if (
        error.code === "23505"
      ) {

        return res.status(409).json({
          success: false,
          message:
            "This vehicle number already exists."
        });

      }


      console.error(
        "CREATE VEHICLE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to create vehicle."
      });

    }

  }
);


/* =========================================================
   VEHICLES - UPDATE
========================================================= */

app.put(
  "/api/vehicles/:id",
  requireDatabase,
  authRequired,
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);

      const vehicleNumber =
        clean(req.body.vehicleNumber);

      const vehicleType =
        clean(req.body.vehicleType);

      const driverName =
        clean(req.body.driverName);

      const contractor =
        clean(req.body.contractor);

      const status =
        clean(req.body.status) ||
        "Active";


      const result =
        await pool.query(
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
            driverName,
            contractor,
            status,
            id
          ]
        );


      if (result.rows.length === 0) {

        return res.status(404).json({
          success: false,
          message:
            "Vehicle not found."
        });

      }


      res.json({
        success: true,
        vehicle: result.rows[0]
      });

    } catch (error) {

      console.error(
        "UPDATE VEHICLE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to update vehicle."
      });

    }

  }
);


/* =========================================================
   VEHICLES - DELETE
========================================================= */

app.delete(
  "/api/vehicles/:id",
  requireDatabase,
  authRequired,
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);


      const result =
        await pool.query(
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
          message:
            "Vehicle not found."
        });

      }


      res.json({
        success: true,
        message:
          "Vehicle deleted successfully."
      });

    } catch (error) {

      console.error(
        "DELETE VEHICLE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to delete vehicle."
      });

    }

  }
);


/* =========================================================
   ENTRIES - GET
========================================================= */

app.get(
  "/api/entries",
  requireDatabase,
  authRequired,
  async (req, res) => {

    try {

      const result =
        await pool.query(`
          SELECT *
          FROM entries
          ORDER BY entry_date DESC, created_at DESC
        `);


      res.json({
        success: true,
        entries: result.rows
      });

    } catch (error) {

      console.error(
        "GET ENTRIES ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to load entries."
      });

    }

  }
);


/* =========================================================
   ENTRIES - CREATE
========================================================= */

app.post(
  "/api/entries",
  requireDatabase,
  authRequired,
  async (req, res) => {

    try {

      const vehicleId =
        Number(req.body.vehicleId);

      const vehicleNumber =
        clean(req.body.vehicleNumber);

      const vehicleType =
        clean(req.body.vehicleType);

      const driverName =
        clean(req.body.driverName);

      const contractor =
        clean(req.body.contractor);

      const entryDate =
        clean(req.body.date);

      const entryTime =
        clean(req.body.entryTime);

      const exitTime =
        clean(req.body.exitTime);

      const duration =
        Number(req.body.duration) || 0;

      const purpose =
        clean(req.body.purpose);

      const notes =
        clean(req.body.notes);


      if (
        !vehicleId ||
        !entryDate ||
        !entryTime
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Vehicle, date and entry time are required."
        });

      }


      const result =
        await pool.query(
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
            vehicleId,
            req.user.id,
            vehicleNumber,
            vehicleType,
            driverName,
            contractor,
            entryDate,
            entryTime,
            exitTime,
            duration,
            purpose,
            notes
          ]
        );


      res.status(201).json({
        success: true,
        entry: result.rows[0]
      });

    } catch (error) {

      console.error(
        "CREATE ENTRY ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to save entry."
      });

    }

  }
);


/* =========================================================
   ENTRIES - DELETE
========================================================= */

app.delete(
  "/api/entries/:id",
  requireDatabase,
  authRequired,
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);


      const result =
        await pool.query(
          `
          DELETE FROM entries
          WHERE id = $1
          RETURNING id
          `,
          [id]
        );


      if (result.rows.length === 0) {

        return res.status(404).json({
          success: false,
          message:
            "Entry not found."
        });

      }


      res.json({
        success: true,
        message:
          "Entry deleted successfully."
      });

    } catch (error) {

      console.error(
        "DELETE ENTRY ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Unable to delete entry."
      });

    }

  }
);


/* =========================================================
   HOME
========================================================= */

app.get("/", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );

});


/* =========================================================
   404
========================================================= */

app.use((req, res) => {

  res.status(404).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
      >
      <title>404 - My Home Group</title>
    </head>

    <body
      style="
        font-family:Arial;
        text-align:center;
        padding:60px 20px;
      "
    >

      <h1>404</h1>

      <p>
        Page not found.
      </p>

      <a href="/">
        Go to Home
      </a>

    </body>
    </html>
  `);

});


/* =========================================================
   START SERVER
========================================================= */

async function startServer() {

  try {

    await initializeDatabase();

    app.listen(
      PORT,
      () => {
        console.log(
          `My Home Group running on port ${PORT}`
        );
      }
    );

  } catch (error) {

    console.error(
      "SERVER START ERROR:",
      error
    );

    process.exit(1);

  }

}


startServer();
