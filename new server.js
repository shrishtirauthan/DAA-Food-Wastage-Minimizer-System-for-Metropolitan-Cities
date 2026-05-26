const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5001;

/* =========================
   MONGODB CONNECTION
========================= */
mongoose.connect("mongodb://127.0.0.1:27017/food_wastage")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log("MongoDB Error:", err));

/* =========================
   FOOD SCHEMA (UPDATED)
========================= */
const foodSchema = new mongoose.Schema({
    name: String,
    location: String,
    food: String,
    quantity: Number,
    freshness: Number,
    type: String,
    image: String,

    /* 🔥 IMPORTANT ADDITION */
    status: {
        type: String,
        default: "available"   // available | taken
    }
});

const Food = mongoose.model("Food", foodSchema);

/* =========================
   DONATE FOOD
========================= */
app.post("/donate", async (req, res) => {
    try {
        const food = new Food(req.body);
        await food.save();

        res.json({ message: "Food donated successfully" });
    } catch (err) {
        res.json({ error: err.message });
    }
});

/* =========================
   GET ONLY AVAILABLE FOODS
========================= */
app.get("/foods", async (req, res) => {
    try {
        const foods = await Food.find({ status: "available" });
        res.json(foods);
    } catch (err) {
        res.json({ error: err.message });
    }
});

/* =========================
   GEOCODING (OPENSTREETMAP)
========================= */
async function getCoordinates(place) {
    const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}&limit=1`,
        {
            headers: {
                "User-Agent": "food-wastage-app"
            }
        }
    );

    const data = await res.json();

    if (!data || data.length === 0) {
        throw new Error("Location not found: " + place);
    }

    return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
    };
}

/* =========================
   ROUTE CALCULATION (OSRM)
========================= */
async function getRoute(lat1, lon1, lat2, lon2) {
    const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`
    );

    const data = await res.json();

    if (!data.routes || !data.routes[0]) {
        throw new Error("No route found");
    }

    return {
        distance: data.routes[0].distance / 1000, // KM
        eta: data.routes[0].duration / 60         // MIN
    };
}

/* =========================
   REQUEST FOOD (MARK AS TAKEN)
========================= */
app.post("/request/:id", async (req, res) => {
    try {
        const food = await Food.findById(req.params.id);

        if (!food) {
            return res.json({ error: "Food not found" });
        }

        /* ❌ If already taken */
        if (food.status === "taken") {
            return res.json({ error: "Food already taken by another NGO" });
        }

        const { ngoName, ngoLocation } = req.body;

        if (!ngoName || !ngoLocation) {
            return res.json({ error: "NGO details missing" });
        }

        const donor = await getCoordinates(food.location);
        const ngo = await getCoordinates(ngoLocation);

        const route = await getRoute(
            donor.lat, donor.lon,
            ngo.lat, ngo.lon
        );

        /* 🔥 MARK AS TAKEN (IMPORTANT) */
        food.status = "taken";
        await food.save();

        res.json({
            food: food.food,
            donor: food.name,
            donorLocation: food.location,
            ngo: ngoName,
            ngoLocation: ngoLocation,
            distance: route.distance,
            eta: route.eta
        });

    } catch (err) {
        res.json({ error: err.message });
    }
});

/* =========================
   START SERVER
========================= */
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
