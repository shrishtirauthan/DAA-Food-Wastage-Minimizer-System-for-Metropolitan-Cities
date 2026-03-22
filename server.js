const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage
let users = [];
let donations = [];
let requirements = [];

// ================= REGISTER =================
app.post("/register", (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.json({ msg: "All fields required" });
    }

    users.push({ username, password, role });
    res.json({ msg: "Registered Successfully" });
});

// ================= LOGIN =================
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    const user = users.find(
        u => u.username === username && u.password === password
    );

    if (user) {
        res.json({ success: true, user });
    } else {
        res.json({ success: false, msg: "Invalid Credentials" });
    }
});

// ================= DONATE FOOD =================
app.post("/donate", (req, res) => {
    const { user, food, qty, loc } = req.body;

    donations.push({ user, food, qty, loc });
    res.json({ msg: "Food Added Successfully" });
});

// ================= NGO REQUIREMENT =================
app.post("/requirement", (req, res) => {
    const { user, people, need } = req.body;

    requirements.push({ user, people, need });
    res.json({ msg: "Requirement Added Successfully" });
});

// ================= GET DONATIONS =================
app.get("/donations", (req, res) => {
    res.json(donations);
});

// ================= GET REQUIREMENTS =================
app.get("/requirements", (req, res) => {
    res.json(requirements);
});

// ================= DEFAULT ROUTE =================
app.get("/", (req, res) => {
    res.send("🚀 Backend is running successfully!");
});

// ================= START SERVER =================
const PORT = 3000;

app.listen(PORT, () => {
    console.log("🚀 Server running on http://localhost:" + PORT);
});
