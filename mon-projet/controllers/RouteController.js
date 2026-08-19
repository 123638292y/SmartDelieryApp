const db = require('../config/database');
const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

const OSRM_SERVERS = [
    'http://router.project-osrm.org',
    'https://routing.openstreetmap.de/routed-car'
];

const PYTHON_CMD = process.platform === "win32" ? "py" : "python3";

// --- HELPERS ---

// تحويل رموز الطقس من Open-Meteo إلى الكلمات التي يفهمها الموديل الخاص بك
const mapWmoCodeToWeather = (code) => {
    if (code === 0 || code === 1) return "clear";
    if (code === 2 || code === 3) return "cloudy";
    if ([51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
    if (code >= 95) return "storm";
    return "clear"; // الافتراضي
};

const getWeatherStatus = async (lat, lng) => {
    try {
        const response = await axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=weather_code`,
            { timeout: 3000 }
        );
        const code = response.data?.current?.weather_code;
        return mapWmoCodeToWeather(code);
    } catch (e) {
        console.error("Weather API Error, falling back to clear");
        return "clear";
    }
};

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

async function callPythonOptimizer(matrix) {
    return new Promise((resolve, reject) => {
        const py = spawn(PYTHON_CMD, [path.join(__dirname, '../services/optimizer.py')]);
        let out = '', err = '';
        py.stdin.write(JSON.stringify({ matrix }));
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

function getDistanceToParis(lat, lng) {
    const R = 6371;
    const dLat = (lat - 48.8566) * Math.PI / 180;
    const dLon = (lng - 2.3522) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(48.8566 * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
};

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
        const { first_delivery_id, lat, lng } = req.query;

        const DEFAULT_START_LAT = 48.6224;
        const DEFAULT_START_LNG = 2.5932;
        const startLat = lat ? parseFloat(lat) : DEFAULT_START_LAT;
        const startLng = lng ? parseFloat(lng) : DEFAULT_START_LNG;

        try {
            // جلب الطقس الحالي لموقع السائق/المستودع
            const currentWeather = await getWeatherStatus(startLat, startLng);

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

            const now = new Date();
            const h = now.getHours();
            const m = now.getMonth() + 1;
            const day = (now.getDay() + 6) % 7;
            const isWeekend = (day >= 5) ? 1 : 0;
            const isRushHour = ((h >= 7 && h <= 9) || (h >= 16 && h <= 19)) ? 1 : 0;

            const featuresForML = livraisons.map(r => ({
                latitude: parseFloat(r.latitude),
                longitude: parseFloat(r.longitude),
                department: parseInt(r.department?.substring(0, 2)) || 75,
                distance_to_paris_center: getDistanceToParis(parseFloat(r.latitude), parseFloat(r.longitude)),
                hour: h,
                day_of_week_num: day,
                month: m,
                is_weekend: isWeekend,
                rush_hour: isRushHour,
                traffic_volume: parseFloat(r.tot_colis) || 0,
                weather: currentWeather, // استخدام الطقس الحقيقي
                id: r.id
            }));

            const predictions = await callPythonPredictor(featuresForML);
            
            const predictedSpeedsMap = {};
            predictions.forEach(p => { predictedSpeedsMap[p.id] = p.predicted_speed; });
            
            livraisons = livraisons.map(l => ({
                ...l,
                predicted_speed: predictedSpeedsMap[l.id] || 35.0,
                weather: currentWeather
            }));

            // باقي كود الـ TSP كما هو...
            const startPos = { id: 'start_point', nom_client: "Urban Food Moissy", latitude: startLat, longitude: startLng };
            let finalOrder = [];

            const allPoints = [startPos, ...livraisons];
            const coordsStr = allPoints.map(p => `${p.longitude},${p.latitude}`).join(';');
            const tableRes = await axios.get(`${OSRM_SERVERS[0]}/table/v1/driving/${coordsStr}?annotations=duration`);
            let optimizedIndices = await callPythonOptimizer(tableRes.data.durations);
            
            if (optimizedIndices[0] !== 0) {
                const z = optimizedIndices.indexOf(0);
                optimizedIndices = [...optimizedIndices.slice(z), ...optimizedIndices.slice(0, z)];
            }
            finalOrder = optimizedIndices.map(idx => allPoints[idx]);

            let polyline = [], stats = { distance: "N/A", duration: "N/A" };
            const routeCoordsStr = finalOrder.map(p => `${p.longitude},${p.latitude}`).join(';');
            try {
                const routeRes = await axios.get(`${OSRM_SERVERS[0]}/route/v1/driving/${routeCoordsStr}?overview=full&geometries=geojson`);
                if (routeRes.data?.routes?.[0]) {
                    const r = routeRes.data.routes[0];
                    stats.distance = (r.distance / 1000).toFixed(2) + " km";
                    stats.duration = Math.round(r.duration / 60) + " min";
                    polyline = r.geometry.coordinates.map(c => ({ lat: c[1], lng: c[0] }));
                }
            } catch (err) { console.error("OSRM Route Error"); }

            res.json(safeJson({ 
                success: true, 
                stats, 
                order: finalOrder, 
                polyline,
                weather: currentWeather 
            }));

        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    predictSpeedToday: async (req, res) => {
        try {
            const query = `
                SELECT d.id, d.tot_colis, a.latitude, a.longitude, a.ville as city, a.cod_pst
                FROM delivery d
                JOIN adresses a ON d.id_adr_liv = a.id
                WHERE d.status NOT IN ('T', 'C')
            `;
            const result = await db.query(query);
            const rows = getRows(result);

            if (rows.length === 0) return res.json({ success: true, data: [] });

            // جلب الطقس لأول موقع في القائمة (كمرجع للمنطقة)
            const currentWeather = await getWeatherStatus(rows[0].latitude, rows[0].longitude);

            const now = new Date();
            const h = now.getHours();
            const m = now.getMonth() + 1;
            const day = (now.getDay() + 6) % 7;
            const isWeekend = (day >= 5) ? 1 : 0;
            const isRushHour = ((h >= 7 && h <= 9) || (h >= 16 && h <= 19)) ? 1 : 0;

            const features = rows.map(r => {
                const lat = parseFloat(r.latitude) || 0;
                const lng = parseFloat(r.longitude) || 0;
                return {
                    latitude: lat,
                    longitude: lng,
                    department: parseInt(r.cod_pst?.substring(0, 2)) || 75,
                    distance_to_paris_center: getDistanceToParis(lat, lng),
                    hour: h,
                    day_of_week_num: day,
                    month: m,
                    is_weekend: isWeekend,
                    rush_hour: isRushHour,
                    traffic_volume: parseFloat(r.tot_colis) || 0,
                    weather: currentWeather, // الطقس الحقيقي هنا
                    id: r.id
                };
            });

            const results = await callPythonPredictor(features);
            res.json({ success: true, data: results, weather: currentWeather });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = RouteController;