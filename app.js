const API = "http://localhost:5001";

/* =========================
   MAP INIT
========================= */
let map;
let routeLayer;

function initMap() {
    if (map) return;

    map = L.map('map').setView([28.61, 77.20], 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
}

initMap();

/* =========================
   SAFE GEOCODING
========================= */
async function getCoords(place) {
    const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`
    );

    const text = await res.text();

    if (!text || text.includes("Access")) {
        throw new Error("Geocoding blocked or rate limited");
    }

    const data = JSON.parse(text);

    if (!data[0]) {
        throw new Error("Location not found: " + place);
    }

    return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
    };
}

/* =========================
   USER PANEL - DONATE FOOD (FIXED)
========================= */
async function donateFood(type) {
    try {
        const name = document.getElementById("name").value;
        const location = document.getElementById("location").value;
        const food = document.getElementById("food").value;
        const quantity = document.getElementById("quantity").value;
        const freshness = document.getElementById("freshness").value;

        const msg = document.getElementById("statusMsg");

        if (!name || !location || !food || !quantity || !freshness) {
            alert("Please fill all fields");
            return;
        }

        const res = await fetch(`${API}/donate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                location,
                food,
                quantity,
                freshness,
                type
            })
        });

        const data = await res.json();

        console.log("DONATE SUCCESS:", data);

        if (msg) {
            msg.innerHTML = "✅ Food Submitted Successfully!";
            msg.style.color = "lightgreen";
            msg.style.fontWeight = "bold";
            msg.style.marginTop = "10px";
        }

        // clear form
        document.getElementById("name").value = "";
        document.getElementById("location").value = "";
        document.getElementById("food").value = "";
        document.getElementById("quantity").value = "";
        document.getElementById("freshness").value = "";

    } catch (err) {
        console.log("DONATE ERROR:", err);

        const msg = document.getElementById("statusMsg");
        if (msg) {
            msg.innerHTML = "❌ Server Error";
            msg.style.color = "red";
        }
    }
}

/* =========================
   LOAD FOODS (NGO)
========================= */
async function loadFoods() {
    try {
        const res = await fetch(`${API}/foods`);
        const foods = await res.json();

        const foodList = document.getElementById("foodList");
        foodList.innerHTML = "";

        foods.forEach(food => {
            const div = document.createElement("div");

            div.innerHTML = `
                <div class="food-card">
                    <h3>${food.food}</h3>
                    <p>${food.location}</p>
                    <button onclick="raiseRequest('${food._id}')">
                        Raise Request
                    </button>
                </div>
            `;

            foodList.appendChild(div);
        });

    } catch (err) {
        console.log("LOAD ERROR:", err);
    }
}

loadFoods();

/* =========================
   NGO REQUEST FOOD
========================= */
async function raiseRequest(id) {
    try {
        const ngoName = document.getElementById("ngoName").value;
        const ngoLocation = document.getElementById("ngoLocation").value;

        if (!ngoName || !ngoLocation) {
            alert("Enter NGO details");
            return;
        }

        const res = await fetch(`${API}/request/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ngoName, ngoLocation })
        });

        const text = await res.text();

        let data;
        try {
            data = JSON.parse(text);
        } catch {
            console.log("SERVER RESPONSE:", text);
            alert("Server returned invalid response");
            return;
        }

        if (data.error) {
            alert(data.error);
            return;
        }

        document.getElementById("resultBox").innerHTML = `
            <div class="food-card">
                <h2>Request Successful</h2>
                <p><b>Distance:</b> ${data.distance.toFixed(2)} KM</p>
                <p><b>ETA:</b> ${data.eta.toFixed(2)} mins</p>
            </div>
        `;

        showRoute(data);

    } catch (err) {
        console.log("REQUEST ERROR:", err);
        alert("Request failed");
    }
}

/* =========================
   MAP ROUTE DRAWING
========================= */
async function showRoute(data) {
    try {
        const donor = await getCoords(data.donorLocation);
        const ngo = await getCoords(data.ngoLocation);

        const path = [
            [donor.lat, donor.lon],
            [ngo.lat, ngo.lon]
        ];

        if (routeLayer) {
            map.removeLayer(routeLayer);
        }

        routeLayer = L.polyline(path, {
            color: "blue",
            weight: 4
        }).addTo(map);

        map.fitBounds(routeLayer.getBounds());

        L.marker([donor.lat, donor.lon]).addTo(map).bindPopup("Donor");
        L.marker([ngo.lat, ngo.lon]).addTo(map).bindPopup("NGO");

    } catch (err) {
        console.log("MAP ERROR:", err.message);
    }
}
