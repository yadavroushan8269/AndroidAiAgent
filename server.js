const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;


/* =========================================
   MIDDLEWARE
   ========================================= */

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true
  })
);


/* =========================================
   STATIC WEBSITE
   ========================================= */

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);


/* =========================================
   MAIN WEBSITE
   ========================================= */

app.get("/", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );

});


/* =========================================
   HEALTH CHECK
   Render ke liye useful
   ========================================= */

app.get("/health", (req, res) => {

  res.json({
    status: "ok",
    app: "Hyma RMC Kokapet",
    service: "Vehicle Duration Management"
  });

});


/* =========================================
   404
   ========================================= */

app.use((req, res) => {

  res.status(404).send(`
    <!DOCTYPE html>

    <html>
      <head>
        <title>Page Not Found</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        >
      </head>

      <body
        style="
          font-family: Arial;
          text-align: center;
          padding: 60px 20px;
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


/* =========================================
   START SERVER
   ========================================= */

app.listen(PORT, () => {

  console.log(
    `Hyma RMC Kokapet running on port ${PORT}`
  );

});
