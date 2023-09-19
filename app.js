const express = require("express");
const app = express();
const port = 8000;
const mysql = require("mysql");
const cors = require("cors");
const crypto = require("crypto");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(
  "sk_test_51NnXfBHG2cIt7OQecmj0GHxSnwRtqRPcxN7DQ5M2tGe9R5rMfgBkURpnp2BXimtOSepMVFAi5rPOnn3heki16CT000gqee5OiI"
);

let corsOptions = {
  origin: "*",
  credential: true,
};
app.use(cors(corsOptions));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

let connection = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "Sonny0401@",
  database: "uerEats",
});

connection.connect(function (err) {
  if (err) {
    return console.error("error: " + err.message);
  }

  console.log("Connected to the MySQL server.");
});

app.get("/", (req, res) => {
  res.send("UberEats!");
});

app.get("/cities", (req, res) => {
  connection.query("select * from cities", (err, result) => {
    console.log("cities");
    res.send(result);
  });
});

app.get("/menu", (req, res) => {
  connection.query("select * from categories", (err, result) => {
    console.log("menu");
    res.send(result);
  });
});

// Select * from foods order by review desc
app.get("/foods", (req, res) => {
  console.log(req.query, "req.query");
  let query = "select * from restaurants";
  if (req.query.filter !== "") {
    // sort cateogry filtering
    if (req.query.filter === "picked for you") {
      query += " order by id desc";
    } else if (req.query.filter === "most popular") {
      query += " order by id asc";
    } else if (req.query.filter === "rating") {
      query += " order by review desc";
    } else if (req.query.filter === "delivery time") {
      query += " order by deliveryTime desc";
      // fromUberEats category filtering
    } else if (req.query.filter === "deals") {
      query += " where fromUberEats = 'Deals'";
    } else if (req.query.filter === "highest rated") {
      query += " where fromUberEats = 'Highest rated'";
      // PriceRagne category filtering
    } else if (req.query.filter === "0") {
      //버튼 req.query.filter 요청이 0.1.2.3 이런식으로 들어가서 거기에 맞춤
      query += " where priceRange = '$'";
    } else if (req.query.filter === "1") {
      query += " where priceRange = '$$'";
    } else if (req.query.filter === "2") {
      query += " where priceRange = '$$$'";
    } else if (req.query.filter === "3") {
      query += " where priceRange = '$$$$'";
      // Dietary category filtering
    } else if (req.query.filter === "vegetarian") {
      query += " where Dietary = 'Vegetarian'";
    } else if (req.query.filter === "vegan") {
      query += " where Dietary = 'Vegan'";
    } else if (req.query.filter === "gluten-free") {
      query += " where Dietary = 'gluten-free'";
    } else if (req.query.filter === "halal") {
      query += " where Dietary = 'Halal'";
    }

    console.log(req.query.filter, "req.query.filter");
  }

  connection.query(query, (err, result) => {
    console.log("restaurants");
    res.send(result);
  });
});

//only email check up
app.get("/emailCheck", (req, res) => {
  let emailQuery = `select * from users where email = '${req.query.email}'`;

  connection.query(emailQuery, (err, result) => {
    if (err) {
      //error code
      console.error(err);
      return res.send({
        code: 500,
        message: "Email address already exists",
      });
    }

    if (result.length >= 1) {
      return res.send({
        code: 409,
      });
    } else {
      return res.send({
        code: 200,
      });
    }
  });
});

//how to add on together eamil and else of info
app.post("/register", (req, res) => {
  console.log(req.body, "req.body?");
  const password = req.body.password;
  const hashPassword = crypto.createHash("sha512").update(password).digest("hex");

  let insertQuery = `INSERT INTO users (name, email, phone, password) VALUES ('${req.body.name}', '${req.body.email}', '${req.body.phone}', '${hashPassword}')`;
  connection.query(insertQuery, (err, result) => {
    console.log(err, "ey?"); //password column over maximum
    if (err) {
      return res.send({
        code: 409,
        message: "Error while adding user",
      });
    } else {
      return res.send({
        code: 200,
      });
    }
  });
});

//cookie post or get?
app.post("/login", (req, res) => {
  console.log(req.body.password, "req.query.password");
  const password = req.body.password;

  const hashPassword = crypto.createHash("sha512").update(password).digest("hex");

  let passworQuery = `select * from users where password = ?`;

  connection.query(passworQuery, [hashPassword], (err, result) => {
    if (result.length >= 1) {
      res.send({
        code: 409,
        message: "User is defined",
      });
    }

    const token = jwt.sign(
      {
        type: "JWT",
      },
      "secret-key",
      {
        expiresIn: "1h",
      }
    );
    //server send token to C
    res.send({ token: token });
  });
});

//restaurant dynamic routing

app.get("/restaurant/:id", (req, res) => {
  console.log(req.params.id, "ID");

  connection.query(`SELECT * FROM foods WHERE resId = '${req.params.id}'`, (err, result) => {
    if (err) throw err;
    if (result.length === 0) {
      console.log("No restaurant found");
      res.send("No restaurant found");
    } else {
      console.log(result);
      console.log("Restaurant page");
      res.send(result);
    }
  });
});

app.get("/restaurantt/:id", (req, res) => {
  connection.query(`select * from restaurants WHERE id  = '${req.params.id}'`, (err, result) => {
    console.log("restaurants");
    res.send(result);
  });
});

app.get("/resDelivery", (req, res) => {
  connection.query("select * from restaurants", (err, result) => {
    console.log("resDelivery");
    res.send(result);
  });
});

app.post("/orderRecord", (req, res) => {
  let insertQuery = `INSERT INTO orderRecord (cardNumber, cardExpiry, CVV, resId, mealName, email) VALUES ('${req.body.cardNumber}', '${req.body.cardExpiry}', '${req.body.CVV}','${req.body.resId}','${req.body.mealName}','${req.body.email}')`;
  connection.query(insertQuery, (err, result) => {
    console.log(err, "orderRecord?"); //password column over maximum
    if (err) {
      return res.send({
        code: 409,
        message: "Error while record history",
      });
    } else {
      return res.send({
        code: 200,
      });
    }
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
