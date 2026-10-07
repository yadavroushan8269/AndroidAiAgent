const express = require("express");
const path = require("path");

const app = express();

const PORT =
  process.env.PORT || 3000;

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

app.get("/", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );

});

app.get("/health", (req, res) => {

  res.json({
    status: "ok",
    app: "Hyma RMC Kokapet",
    service: "Vehicle Duration Management"
  });

});

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
      <title>404 - Hyma RMC Kokapet</title>
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

app.listen(PORT, () => {

  console.log(
    `Hyma RMC Kokapet running on port ${PORT}`
  );

});
