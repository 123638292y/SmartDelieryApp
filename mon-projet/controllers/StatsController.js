const db = require('../config/database');

// =========================================================
// UTILS
// =========================================================
/**
 * Convertit les BigInt en String pour éviter les erreurs JSON.stringify
 * MariaDB retourne les COUNT et SUM sous forme de BigInt.
 */
const formatResult = (data) => {
    if (!data) return data;
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
};

const StatsController = {

    /**
     * STATISTIQUES GLOBALES DES LIVRAISONS
     */
    getGlobalDeliveryStats: async (req, res) => {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_all_time,
                    SUM(CASE WHEN dat_delivery = CURDATE() THEN 1 ELSE 0 END) as total_today,
                    SUM(CASE WHEN status = 'T' THEN 1 ELSE 0 END) as delivered,
                    SUM(CASE WHEN status = 'C' THEN 1 ELSE 0 END) as cancelled,
                    SUM(CASE WHEN status NOT IN ('T', 'C') OR status IS NULL THEN 1 ELSE 0 END) as pending,
                    CAST(IFNULL(SUM(tot_ttc), 0) AS DOUBLE) as total_revenue
                FROM delivery
            `;

            // Avec le driver 'mariadb', on ne destructure pas [rows]
            const rows = await db.query(query);
            
            res.json({
                success: true,
                stats: formatResult(rows[0])
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * STATISTIQUES PAR LIVREUR
     */
    getDriversPerformance: async (req, res) => {
        try {
            const query = `
                SELECT 
                    dr.id,
                    dr.first_name,
                    dr.last_name,
                    dr.identification_no,
                    COUNT(dt.id_doc) as total_assignments,
                    SUM(CASE WHEN d.status = 'T' THEN 1 ELSE 0 END) as completed_deliveries,
                    SUM(CASE WHEN d.status NOT IN ('T', 'C') THEN 1 ELSE 0 END) as active_deliveries,
                    CAST(IFNULL(SUM(CASE WHEN d.status = 'T' THEN d.tot_ttc ELSE 0 END), 0) AS DOUBLE) as generated_revenue
                FROM drivers dr
                LEFT JOIN delivery_transport dt ON dr.id = dt.id_driver
                LEFT JOIN delivery d ON dt.id_doc = d.id
                GROUP BY dr.id, dr.first_name, dr.last_name, dr.identification_no
                ORDER BY completed_deliveries DESC
            `;

            const rows = await db.query(query);
            res.json({
                success: true,
                data: formatResult(rows)
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * ANALYSE MENSUELLE (6 derniers mois)
     */
    getMonthlyEvolution: async (req, res) => {
        try {
            const query = `
                SELECT 
                    DATE_FORMAT(dat_delivery, '%Y-%m') as month,
                    COUNT(*) as count,
                    CAST(SUM(tot_ttc) AS DOUBLE) as revenue
                FROM delivery
                WHERE dat_delivery >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                GROUP BY month
                ORDER BY month ASC
            `;

            const rows = await db.query(query);
            res.json({
                success: true,
                data: formatResult(rows)
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * TOP CLIENTS
     */
    getTopDeliveryClients: async (req, res) => {
        try {
            const query = `
                SELECT 
                    c.nom as client_name,
                    COUNT(d.id) as total_deliveries,
                    CAST(SUM(d.tot_ttc) AS DOUBLE) as total_amount
                FROM delivery d
                JOIN clients c ON d.id_clt = c.id
                WHERE d.status = 'T'
                GROUP BY c.id, c.nom
                ORDER BY total_deliveries DESC
                LIMIT 10
            `;

            const rows = await db.query(query);
            res.json({
                success: true,
                data: formatResult(rows)
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * RÉSUMÉ DASHBOARD
     */
    getDashboardSummary: async (req, res) => {
        try {
            // MariaDB supporte les requêtes multiples si configuré, 
            // mais ici on garde des appels séparés pour la clarté
            const deliveryStats = await db.query(`
                SELECT 
                    SUM(CASE WHEN status = 'T' THEN 1 ELSE 0 END) as total_success,
                    SUM(CASE WHEN status NOT IN ('T', 'C') THEN 1 ELSE 0 END) as total_pending,
                    COUNT(*) as total_count
                FROM delivery
            `);

            const driverStats = await db.query(`SELECT COUNT(*) as total_drivers FROM drivers`);
            
            const todayStats = await db.query(`
                SELECT COUNT(*) as today_count FROM delivery WHERE dat_delivery = CURDATE()
            `);

            res.json({
                success: true,
                summary: {
                    deliveries: formatResult(deliveryStats[0]),
                    drivers: formatResult(driverStats[0]),
                    today: formatResult(todayStats[0])
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = StatsController;