const { faker } = require('@faker-js/faker');
const mysql = require('mysql2');
const express = require("express");
const methodOverride = require("method-override");
const bcrypt = require('bcrypt');

const app = express();
const port = 8080;

app.use(methodOverride("_method"));
app.use(express.urlencoded({ extended: true }));

// Set EJS
const path = require('path');
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));

// MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'sql1',
    password: 'root',
});

// Increase password column size in DB manually:
// ALTER TABLE user MODIFY password VARCHAR(255);

// Function to generate random user
let getRandomUser = async () => {
    const plainPass = faker.internet.password();
    const hashPass = await bcrypt.hash(plainPass, 10);
    return [
        faker.string.uuid(),
        faker.internet.userName(),
        faker.internet.email(),
        hashPass
    ];
};

// Seed 100 users (run once)
async function seedUsers() {
    let data = [];
    for (let i = 0; i < 100; i++) {
        data.push(await getRandomUser());
    }
    let q = "INSERT IGNORE INTO user (id, username, email, password) VALUES ?";
    connection.query(q, [data], (err, result) => {
        if (err) console.log("Seed Error:", err);
        else console.log("100 users seeded successfully!");
    });
}
// Uncomment to seed once
// seedUsers();

// ROUTES

// Home page
app.get("/", (req, res) => {
    let q = `SELECT COUNT(*) as count FROM user`;
    connection.query(q, (err, result) => {
        if (err) return res.send("DB Error");
        res.render("home", { count: result[0].count });
    });
});

// Show all users
app.get("/user", (req, res) => {
    let q = "SELECT * FROM user";
    connection.query(q, (err, users) => {
        if (err) return res.send("DB Error");
        res.render("showusers", { users });
    });
});

// Add user form
app.get("/user/add", (req, res) => {
    res.render("add");
});

// Add user POST
app.post("/user", async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.send("All fields required");

    const id = faker.string.uuid();
    const hashPass = await bcrypt.hash(password, 10);
    const q = "INSERT INTO user (id, username, email, password) VALUES (?, ?, ?, ?)";
    connection.query(q, [id, username, email, hashPass], (err, result) => {
        if (err) return res.send("Error: Duplicate email or DB issue");
        res.redirect("/user");
    });
});

// Edit user form
app.get("/user/:id/edit", (req, res) => {
    const { id } = req.params;
    const q = "SELECT * FROM user WHERE id = ?";
    connection.query(q, [id], (err, result) => {
        if (err) return res.send("DB Error");
        res.render("edit", { user: result[0] });
    });
});

// Update user
app.patch("/user/:id", async (req, res) => {
    const { id } = req.params;
    const { username: newUsername, email: newEmail, password: formPass } = req.body;

    const q = "SELECT * FROM user WHERE id = ?";
    connection.query(q, [id], async (err, result) => {
        if (err) return res.send("DB Error");
        const user = result[0];
        const valid = await bcrypt.compare(formPass, user.password);
        if (!valid) return res.send("Wrong password");

        const q2 = "UPDATE user SET username = ?, email = ? WHERE id = ?";
        connection.query(q2, [newUsername, newEmail, id], (err, result) => {
            if (err) return res.send("DB Error");
            res.redirect("/user");
        });
    });
});

// Delete user
app.delete("/user/:id", (req, res) => {
    const { id } = req.params;
    const q = "DELETE FROM user WHERE id = ?";
    connection.query(q, [id], (err, result) => {
        if (err) return res.send("DB Error");
        res.redirect("/user");
    });
});

// Start server
app.listen(port, () => {
    console.log(`App is listening on port ${port}`);
});
