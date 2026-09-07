const db = require('../config/database');
const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

const OSRM_SERVERS = ['http://router.project-osrm.org'];
const PYTHON_CMD = process.platform === "win32" ? "py" : "python3";

// --- HELPERS ---

const safeJson = (data) => {
    if (!data) return [];
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
};

const getRows = (result) => {
    if (!result) return [];
    return Array.isArray(result[0]) ? result[0] : (result.rows || result);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const mapWmoCodeToWeather = (code) => {
    if (code === 0 || code === 1) return "clear";
    if (code === 2 || code === 3) return "cloudy";
    if ([51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
    if (code >= 95) return "storm";
    return "clear";
};

const getWeatherStatus = async (lat, lng) => {
    try {
        const response = await axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=weather_code`,
            { timeout: 2000 }
        );
        return mapWmoCodeToWeather(response.data?.current?.weather_code);
    } catch (e) {
        return "clear";
    }
};

const getCoordsFromAddress = async (adr1, ville, codePostal) => {
    try {
        const fullAddress = `${adr1 || ''}, ${codePostal || ''} ${ville || ''}, France`.trim();
        const response = await axios.get(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullAddress)}&format=json&limit=1`,
            { headers: { 'User-Agent': 'DeliveryApp' }, timeout: 5000 }
        );
        if (response.data && response.data.length > 0) {
            return { lat: parseFloat(response.data[0].lat), lng: parseFloat(response.data[0].lon) };
        }
        return null;
    } catch (e) { return null; }
};

const resolveMissingCoords = async (rows) => {
    const resolved = [];
    for (const r of rows) {
        let latNum = parseFloat(r.latitude);
        let lngNum = parseFloat(r.longitude);
        if (!latNum || !lngNum) {
            const coords = await getCoordsFromAddress(r.adresse_client, r.city || r.ville, r.department);
            if (coords) {
                latNum = coords.lat; lngNum = coords.lng;
                r.latitude = latNum; r.longitude = lngNum;
                if (r.id_adr) {
                    try { await db.query('UPDATE adresses SET latitude = ?, longitude = ? WHERE id = ?', [latNum, lngNum, r.id_adr]); } catch (err) {}
                }
                await sleep(1100);
            }
        }
        if (latNum && lngNum) resolved.push(r);
    }
    return resolved;
};

function getDistanceToParis(lat, lng) {
    const R = 6371;
    const dLat = (lat - 48.8566) * Math.PI / 180;
    const dLon = (lng - 2.3522) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(48.8566 * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function callPythonOptimizer(matrix, speedFactors = null) {
    return new Promise((resolve, reject) => {
        const py = spawn(PYTHON_CMD, [path.join(__dirname, '../services/optimizer.py')]);
        let out = '', err = '';
        // Envoyer la matrice ET les facteurs de vitesse
        py.stdin.write(JSON.stringify({ matrix, speed_factors: speedFactors }));
        py.stdin.end();
        py.stdout.on('data', (d) => out += d.toString());
        py.stderr.on('data', (d) => err += d.toString());
        py.on('close', (code) => {
            if (code !== 0 || !out) reject(err || "Python error");
            else {
                try { resolve(JSON.parse(out)); } catch (e) { reject("Invalid JSON from Python"); }
            }
        });
    });
}

async function callPythonPredictor(features) {
    return new Promise((resolve) => {
        const py = spawn(PYTHON_CMD, [path.join(__dirname, '../ml/app.py')]);
        let out = '', err = '';
        py.stdin.write(JSON.stringify({ deliveries: features }));
        py.stdin.end();
        py.stdout.on('data', (d) => out += d.toString());
        py.stderr.on('data', (d) => err += d.toString());
        py.on('close', (code) => {
            if (code !== 0) {
                console.error("ML Error:", err);
                resolve([]);
            } else {
                try { resolve(JSON.parse(out)); } catch (e) { resolve([]); }
            }
        });
    });
}

// --- NOUVELLE FONCTION: Prédire les vitesses pour toutes les livraisons ---
async function predictSpeedsForDeliveries(deliveries, startLat, startLng) {
    if (!deliveries || deliveries.length === 0) return {};

    try {
        // Construire la matrice OSRM pour obtenir distances et durées
        const startCoord = `${startLng},${startLat}`;
        const coordsStr = startCoord + ";" + deliveries.map(r => `${r.longitude},${r.latitude}`).join(';');
        const osrmRes = await axios.get(`${OSRM_SERVERS[0]}/table/v1/driving/${coordsStr}?sources=0&annotations=duration,distance`, { timeout: 5000 });
        
        const durations = osrmRes.data.durations[0];
        const distances = osrmRes.data.distances[0];

        const now = new Date();
        const h = now.getHours();
        const m = now.getMonth() + 1;
        const day = (now.getDay() + 6) % 7;
        const isWeekend = (day >= 5) ? 1 : 0;
        const isRushHour = ((h >= 7 && h <= 9) || (h >= 16 && h <= 19)) ? 1 : 0;
        
        let isHoliday = 0;
        try {
            const year = now.getFullYear();
            const holidayRes = await axios.get(`https://calendrier.api.gouv.fr/jours-feries/metropole/${year}.json`, { timeout: 2000 });
            const todayStr = now.toISOString().split('T')[0];
            isHoliday = holidayRes.data[todayStr] ? 1 : 0;
        } catch (err) {
            isHoliday = 0;
        }

        const weatherCache = new Map();

        const features = await Promise.all(deliveries.map(async (r, index) => {
            const lat = parseFloat(r.latitude) || 0;
            const lng = parseFloat(r.longitude) || 0;
            const travelTimeMin = durations[index + 1] / 60;
            const distanceKm = distances[index + 1] / 1000;

            const weatherKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
            if (!weatherCache.has(weatherKey)) {
                weatherCache.set(weatherKey, await getWeatherStatus(lat, lng));
            }

            return {
                latitude: lat,
                longitude: lng,
                department: parseInt(r.department?.substring(0, 2)) || 75,
                distance_to_paris_center: getDistanceToParis(lat, lng),
                hour: h,
                day_of_week_num: day,
                month: m,
                is_weekend: isWeekend,
                is_holiday: isHoliday,
                rush_hour: isRushHour,
                traffic_volume: parseFloat(r.tot_colis) || 0,
                speed: travelTimeMin > 0 ? (distanceKm / (travelTimeMin / 60)) : 35.0,
                occupancy_rate: 0.2,
                travel_time: travelTimeMin,
                traffic_state: isRushHour ? 3 : 1,
                distance_km: distanceKm,
                length_km: distanceKm,
                road_type: "nationale",
                city: r.city || "Paris",
                road_category: "M",
                weather: weatherCache.get(weatherKey),
                id: r.id
            };
        }));

        const predictions = await callPythonPredictor(features);
        const speedMap = {};
        predictions.forEach(p => {
            speedMap[p.id] = p.predicted_speed || 35.0;
        });
        return speedMap;

    } catch (error) {
        console.error("Error in predictSpeedsForDeliveries:", error.message);
        return {};
    }
}

const RouteController = {

    getDriverDeliveries: async (req, res) => {
        const { identification_no } = req.params;
        try {
            const query = `
                SELECT d.id, d.no_doc, d.status, d.tot_ttc, d.time_delivery,
                       c.nom as nom_client, c.tel1 as client_phone,
                       a.adr1 as adresse_client, a.ville, a.latitude, a.longitude
                FROM drivers dr
                JOIN delivery_transport dt ON dr.id = dt.id_driver
                JOIN delivery d ON dt.id_doc = d.id
                JOIN clients c ON d.id_clt = c.id
                JOIN adresses a ON d.id_adr_liv = a.id
                WHERE dr.identification_no = ?
                AND d.status NOT IN ('T', 'C')
                ORDER BY d.time_delivery ASC`;
            const result = await db.query(query, [identification_no]);
            res.json({ success: true, livraisons: safeJson(getRows(result)) });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    getOptimizedRoute: async (req, res) => {
        const { identification_no } = req.params;
        const { lat, lng } = req.query;

        const startLat = lat ? parseFloat(lat) : 48.6224;
        const startLng = lng ? parseFloat(lng) : 2.5932;

        try {
            const query = `
                SELECT d.id, d.no_doc, d.tot_colis, c.nom as nom_client,
                       a.id as id_adr, a.latitude, a.longitude, a.adr1 as adresse_client,
                       a.ville as city, a.cod_pst as department
                FROM drivers dr
                JOIN delivery_transport dt ON dr.id = dt.id_driver
                JOIN delivery d ON dt.id_doc = d.id
                JOIN clients c ON d.id_clt = c.id
                JOIN adresses a ON d.id_adr_liv = a.id
                WHERE dr.identification_no = ?
                AND d.status NOT IN ('T', 'C')`;

            const result = await db.query(query, [identification_no]);
            const rows = getRows(result);
            if (!rows || rows.length === 0) return res.json({ success: true, order: [] });

            let livraisons = await resolveMissingCoords(rows);

            // --- ÉTAPE 1: Prédire les vitesses pour TOUTES les livraisons ---
            const speedPredictions = await predictSpeedsForDeliveries(livraisons, startLat, startLng);
            
            // Ajouter la vitesse prédite à chaque livraison
            livraisons = livraisons.map(l => ({
                ...l,
                predicted_speed: speedPredictions[l.id] || 35.0
            }));

            // --- ÉTAPE 2: Préparer les données pour l'optimiseur ---
            const startPos = { id: 'start_point', nom_client: "Urban Food Moissy", latitude: startLat, longitude: startLng };
            const allPoints = [startPos, ...livraisons];
            const coordsStr = allPoints.map(p => `${p.longitude},${p.latitude}`).join(';');
            
            // Obtenir la matrice des durées
            const tableRes = await axios.get(`${OSRM_SERVERS[0]}/table/v1/driving/${coordsStr}?annotations=duration`, { timeout: 10000 });
            
            // --- ÉTAPE 3: Ajuster la matrice en fonction des vitesses prédites ---
            const durations = tableRes.data.durations;
            const adjustedDurations = durations.map((row, i) => {
                return row.map((duration, j) => {
                    // Si c'est une livraison (j > 0), ajuster la durée en fonction de la vitesse prédite
                    if (j > 0 && livraisons[j-1]) {
                        const speedFactor = livraisons[j-1].predicted_speed / 35.0;
                        // Ajuster la durée: si vitesse > 35km/h, réduire le temps, sinon l'augmenter
                        return duration / speedFactor;
                    }
                    return duration;
                });
            });

            // --- ÉTAPE 4: Appeler l'optimiseur avec la matrice ajustée ---
            let optimizedIndices = await callPythonOptimizer(adjustedDurations);

            // Réorganiser pour que le départ soit en premier
            if (optimizedIndices[0] !== 0) {
                const z = optimizedIndices.indexOf(0);
                optimizedIndices = [...optimizedIndices.slice(z), ...optimizedIndices.slice(0, z)];
            }
            const finalOrder = optimizedIndices.map(idx => allPoints[idx]);

            // --- ÉTAPE 5: Générer le polyline avec OSRM ---
            let polyline = [], stats = { distance: "N/A", duration: "N/A" };
            const routeCoordsStr = finalOrder.map(p => `${p.longitude},${p.latitude}`).join(';');
            try {
                const routeRes = await axios.get(`${OSRM_SERVERS[0]}/route/v1/driving/${routeCoordsStr}?overview=full&geometries=geojson`, { timeout: 10000 });
                if (routeRes.data?.routes?.[0]) {
                    const r = routeRes.data.routes[0];
                    stats.distance = (r.distance / 1000).toFixed(2) + " km";
                    stats.duration = Math.round(r.duration / 60) + " min";
                    polyline = r.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
                }
            } catch (err) { console.error("OSRM Route Error:", err.message); }

            // Ajouter les vitesses prédites dans la réponse
            const finalOrderWithSpeeds = finalOrder.map(point => {
                if (point.id !== 'start_point') {
                    return {
                        ...point,
                        predicted_speed: speedPredictions[point.id] || 35.0
                    };
                }
                return point;
            });

            res.json(safeJson({
                success: true,
                stats,
                order: finalOrderWithSpeeds,
                polyline,
                speed_predictions: speedPredictions
            }));

        } catch (error) {
            console.error("Route optimization error:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    predictSpeedToday: async (req, res) => {
        try {
            const query = `
                SELECT d.id, d.tot_colis, a.latitude, a.longitude, a.ville as city, a.cod_pst
                FROM delivery d
                JOIN adresses a ON d.id_adr_liv = a.id
                WHERE d.status NOT IN ('T', 'C')`;
            
            const result = await db.query(query);
            const rows = getRows(result);
            if (rows.length === 0) return res.json({ success: true, data: [] });

            const startCoord = "2.5932,48.6224";
            const coordsStr = startCoord + ";" + rows.map(r => `${r.longitude},${r.latitude}`).join(';');
            const osrmRes = await axios.get(`${OSRM_SERVERS[0]}/table/v1/driving/${coordsStr}?sources=0&annotations=duration,distance`, { timeout: 5000 });
            
            const durations = osrmRes.data.durations[0];
            const distances = osrmRes.data.distances[0];

            const now = new Date();
            const h = now.getHours();
            const m = now.getMonth() + 1;
            const day = (now.getDay() + 6) % 7;
            const isWeekend = (day >= 5) ? 1 : 0;
            const isRushHour = ((h >= 7 && h <= 9) || (h >= 16 && h <= 19)) ? 1 : 0;
            
            let isHoliday = 0;
            try {
                const year = now.getFullYear();
                const holidayRes = await axios.get(`https://calendrier.api.gouv.fr/jours-feries/metropole/${year}.json`, { timeout: 2000 });
                const todayStr = now.toISOString().split('T')[0];
                isHoliday = holidayRes.data[todayStr] ? 1 : 0;
            } catch (err) {
                isHoliday = 0;
            }

            const weatherCache = new Map();

            const features = await Promise.all(rows.map(async (r, index) => {
                const lat = parseFloat(r.latitude) || 0;
                const lng = parseFloat(r.longitude) || 0;
                const travelTimeMin = durations[index + 1] / 60;
                const distanceKm = distances[index + 1] / 1000;

                const weatherKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
                if (!weatherCache.has(weatherKey)) {
                    weatherCache.set(weatherKey, await getWeatherStatus(lat, lng));
                }

                return {
                    latitude: lat,
                    longitude: lng,
                    department: parseInt(r.cod_pst?.substring(0, 2)) || 75,
                    distance_to_paris_center: getDistanceToParis(lat, lng),
                    hour: h,
                    day_of_week_num: day,
                    month: m,
                    is_weekend: isWeekend,
                    is_holiday: isHoliday,
                    rush_hour: isRushHour,
                    traffic_volume: parseFloat(r.tot_colis) || 0,
                    speed: travelTimeMin > 0 ? (distanceKm / (travelTimeMin / 60)) : 35.0,
                    occupancy_rate: 0.2,
                    travel_time: travelTimeMin,
                    traffic_state: isRushHour ? 3 : 1,
                    distance_km: distanceKm,
                    length_km: distanceKm,
                    road_type: "nationale",
                    city: r.city || "Paris",
                    road_category: "M",
                    weather: weatherCache.get(weatherKey),
                    id: r.id
                };
            }));

            const results = await callPythonPredictor(features);
            res.json({ success: true, data: results });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = RouteController;