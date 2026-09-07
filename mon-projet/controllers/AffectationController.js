const db = require('../config/database');
const { spawn } = require('child_process');
const path = require('path');
const socketHandler = require('../socket/socketHandler');
const NotificationController = require('./NotificationController'); // Ajustez le chemin

// =========================================================
// UTILS
// =========================================================

/**
 * Nettoie les données pour éviter les erreurs JSON avec BigInt (MariaDB)
 * et garantit un format de sortie propre.
 */
const safeJson = (data) => {
    if (!data) return [];
    try {
        return JSON.parse(JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));
    } catch (e) {
        console.error("Erreur safeJson:", e);
        return [];
    }
};

const AffectationController = {

    // =========================================================
    // GESTION DES LIVREURS
    // =========================================================

    /**
     * 1. Lister tous les livreurs
     */
    getAllDrivers: async (req, res) => {
        try {
            const rows = await db.query(`
                SELECT id, first_name, last_name, identification_no, dat_cre 
                FROM drivers 
                ORDER BY last_name ASC, first_name ASC
            `);
            
            res.json({ 
                success: true, 
                data: safeJson(rows) 
            });
        } catch (error) {
            console.error("Erreur getAllDrivers:", error);
            res.status(500).json({ success: false, message: "Erreur lors de la récupération des livreurs", error: error.message });
        }
    },

    /**
     * 2. Lister les livraisons groupées par livreur
     */
    getDeliveriesPerDriver: async (req, res) => {
        try {
            const driverIdParam = req.params.id || req.query.id;

            let query = `
                SELECT 
                    dr.id as driver_id, dr.first_name, dr.last_name, dr.identification_no,
                    d.id as delivery_id, d.no_doc, d.status as delivery_status, d.dat_delivery,
                    c.nom as client_name, a.ville as delivery_city, a.adr1 as delivery_address
                FROM drivers dr
                LEFT JOIN delivery_transport dt ON dr.id = dt.id_driver
                LEFT JOIN delivery d ON dt.id_doc = d.id
                LEFT JOIN clients c ON d.id_clt = c.id
                LEFT JOIN adresses a ON d.id_adr_liv = a.id
                WHERE 1=1
            `;

            const queryParams = [];
            if (driverIdParam) {
                query += ` AND dr.id = ? `;
                queryParams.push(driverIdParam);
            }

            query += ` ORDER BY dr.last_name ASC, d.dat_delivery ASC `;

            const rows = await db.query(query, queryParams);

            const result = rows.reduce((acc, row) => {
                const driverId = row.driver_id;
                if (!acc[driverId]) {
                    acc[driverId] = {
                        driver: {
                            id: row.driver_id,
                            full_name: `${row.first_name} ${row.last_name}`.trim(),
                            identification: row.identification_no
                        },
                        deliveries: [],
                        total_deliveries: 0
                    };
                }

                if (row.delivery_id) {
                    acc[driverId].deliveries.push({
                        id: row.delivery_id,
                        no_doc: row.no_doc,
                        status: row.delivery_status,
                        date: row.dat_delivery,
                        client: row.client_name || 'Client inconnu',
                        address: `${row.delivery_address || ''} ${row.delivery_city || ''}`.trim()
                    });
                    acc[driverId].total_deliveries++;
                }
                return acc;
            }, {});

            res.json({ 
                success: true, 
                data: safeJson(Object.values(result)) 
            });

        } catch (error) {
            console.error("Erreur getDeliveriesPerDriver:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * 3. Récupérer TOUTES les livraisons (avec info livreur si affecté)
     */
    getAllDeliveries: async (req, res) => {
        try {
            const query = `
                SELECT 
                    d.id, d.no_doc, d.dat_doc, d.dat_delivery, d.status,
                    c.nom as client_name, a.adr1, a.ville, a.latitude, a.longitude,
                    dr.id as driver_id, dr.first_name as driver_firstname, dr.last_name as driver_lastname
                FROM delivery d
                JOIN clients c ON d.id_clt = c.id
                JOIN adresses a ON d.id_adr_liv = a.id
                LEFT JOIN delivery_transport dt ON d.id = dt.id_doc
                LEFT JOIN drivers dr ON dt.id_driver = dr.id
                ORDER BY d.dat_doc DESC
            `;
            const rows = await db.query(query);
            res.json({ success: true, data: safeJson(rows) });
        } catch (error) {
            console.error("Erreur getAllDeliveries:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
assignDelivery: async (req, res) => {
    const { id_doc, id_driver } = req.body;
    const user_action = req.user?.login || 'ADMIN';

    if (!id_doc || !id_driver) {
        return res.status(400).json({ success: false, message: "ID Document et ID Livreur requis" });
    }

    try {
        // 1. Vérifier si la livraison existe
        const deliveryRows = await db.query("SELECT no_doc FROM delivery WHERE id = ?", [id_doc]);
        if (!deliveryRows || deliveryRows.length === 0) {
            return res.status(404).json({ success: false, message: "Livraison introuvable" });
        }
        const no_doc = deliveryRows[0].no_doc;

        // 2. Récupérer l'ID utilisateur (pour le socket) depuis driver_auth
        const authRows = await db.query(
            "SELECT id, first_name, last_name FROM driver_auth WHERE id_driver = ?", 
            [id_driver]
        );

        if (!authRows || authRows.length === 0) {
            return res.status(404).json({ success: false, message: "Ce livreur n'a pas de compte utilisateur actif." });
        }
        
        const id_user_to_notify = authRows[0].id; 
        const driverName = `${authRows[0].first_name} ${authRows[0].last_name}`;

        // 3. Effectuer l'affectation en base de données
        await db.query(`
            INSERT INTO delivery_transport (id_doc, id_driver, dat_cre, usr_cre, dat_upd, usr_upd) 
            VALUES (?, ?, NOW(), ?, NOW(), ?)
            ON DUPLICATE KEY UPDATE id_driver = VALUES(id_driver), dat_upd = NOW(), usr_upd = VALUES(usr_upd)
        `, [id_doc, id_driver, user_action, user_action]);

        await db.query("UPDATE delivery SET status = 'P' WHERE id = ?", [id_doc]);

        // 4. Envoi de la notification
        const title = "Nouvelle affectation";
        const message = `Le bon N°${no_doc} vous a été attribué.`;

        if (NotificationController && typeof NotificationController.createAndSend === 'function') {
            await NotificationController.createAndSend(id_user_to_notify, title, message);
        }

        return res.json({ 
            success: true, 
            message: `Livraison ${no_doc} affectée avec succès à ${driverName}.` 
        });

    } catch (error) {
        console.error("Erreur assignDelivery:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
},
    autoAssignByClustering: async (req, res) => {
        const user_action = req.user?.login || 'AI_AUTO';

        try {
            const deliveries = await db.query(`
                SELECT d.id, a.latitude, a.longitude 
                FROM delivery d
                JOIN adresses a ON d.id_adr_liv = a.id
                LEFT JOIN delivery_transport dt ON d.id = dt.id_doc
                WHERE dt.id_doc IS NULL AND d.status != 'C' AND a.latitude != 0 AND a.longitude != 0
            `);

            const drivers = await db.query("SELECT id FROM drivers");

            if (!deliveries.length || !drivers.length) {
                return res.json({ success: false, message: "Pas assez de données pour l'auto-affectation." });
            }

            const driversList = drivers.map(d => d.id);
            const pyProg = spawn('python', [path.join(__dirname, '../scripts/clustering_logic.py')]);

            let dataString = '';
            pyProg.stdin.write(JSON.stringify({ deliveries, nb_drivers: driversList.length }));
            pyProg.stdin.end();

            pyProg.stdout.on('data', (data) => { dataString += data.toString(); });
            pyProg.stdout.on('end', async () => {
                try {
                    const results = JSON.parse(dataString);
                    if (results.error) throw new Error(results.error);

                    for (const item of results) {
                        const assignedDriverId = driversList[item.cluster_index];
                        if (assignedDriverId) {
                            await db.query(`
                                INSERT INTO delivery_transport (id_doc, id_driver, dat_cre, usr_cre) 
                                VALUES (?, ?, NOW(), ?)
                                ON DUPLICATE KEY UPDATE id_driver = VALUES(id_driver), dat_upd = NOW()
                            `, [item.id, assignedDriverId, user_action]);

                            await db.query("UPDATE delivery SET status = 'P' WHERE id = ?", [item.id]);

                            if (socketHandler?.sendNotification) {
                                socketHandler.sendNotification(assignedDriverId, "🤖 Auto-Affectation", "Une nouvelle livraison vous a été affectée.");
                            }
                        }
                    }
                    res.json({ success: true, message: `${results.length} livraisons auto-affectées.` });
                } catch (err) {
                    console.error("Erreur Python parsing:", err);
                    res.status(500).json({ success: false, error: "Erreur lors du calcul IA" });
                }
            });
        } catch (error) {
            console.error("Erreur Auto-Assign:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * 6. Retirer une affectation
     */
    unassignDelivery: async (req, res) => {
        const { id_doc } = req.params;
        try {
            await db.query("DELETE FROM delivery_transport WHERE id_doc = ?", [id_doc]);
            await db.query("UPDATE delivery SET status = '' WHERE id = ?", [id_doc]);
            res.json({ success: true, message: "Affectation annulée avec succès." });
        } catch (error) {
            console.error("Erreur unassign:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * 7. Lister les livraisons d'un livreur spécifique
     */
    getDriverAssignments: async (req, res) => {
        const { id_driver } = req.params;
        try {
            const query = `
                SELECT dt.id as assignment_id, d.id as delivery_id, d.no_doc, d.dat_delivery, 
                       c.nom as client_name, a.ville, a.adr1
                FROM delivery_transport dt
                JOIN delivery d ON dt.id_doc = d.id
                JOIN clients c ON d.id_clt = c.id
                JOIN adresses a ON d.id_adr_liv = a.id
                WHERE dt.id_driver = ? AND d.status NOT IN ('T', 'C')
                ORDER BY d.dat_delivery ASC
            `;
            const rows = await db.query(query, [id_driver]);
            res.json({ success: true, data: safeJson(rows) });
        } catch (error) {
            console.error("Erreur getDriverAssignments:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = AffectationController;