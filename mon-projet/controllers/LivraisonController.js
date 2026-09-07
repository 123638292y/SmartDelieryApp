const db = require('../config/database');
const { spawn } = require('child_process');
const path = require('path');
const socketHandler = require('../socket/socketHandler');
const axios = require('axios');

// =========================================================
// UTILS
// =========================================================

const safeJson = (data) => {
    if (!data) return [];
    try {
        return JSON.parse(JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));
    } catch (e) {
        return [];
    }
};

const callPythonML = (payload) => {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [path.join(__dirname, '../ml/clustering.py')]);
        let resultData = "";
        let errorData = "";

        pythonProcess.stdin.write(JSON.stringify(payload));
        pythonProcess.stdin.end();

        pythonProcess.stdout.on('data', (data) => { resultData += data.toString(); });
        pythonProcess.stderr.on('data', (data) => { errorData += data.toString(); });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(errorData || `Python process exited with code ${code}`));
            } else {
                try {
                    resolve(JSON.parse(resultData));
                } catch (e) {
                    reject(new Error("Invalid JSON output from Python"));
                }
            }
        });
    });
};

const LivraisonController = {

    // =========================================================
    // ENDPOINTS IA
    // =========================================================

    clusterDeliveriesToday: async (req, res) => {
        try {
            const nbClusters = parseInt(req.query.nb_clusters) || 3;
            
            // فلترة: نجيبو كان اللي status متاعهم مش T (واصلة) ومش C (ملغية)
            const [rows] = await db.query(`
                SELECT d.id, d.no_doc, d.tot_colis, d.id_stck as depot_id,
                       a.latitude, a.longitude, a.ville, a.cod_pst as department
                FROM delivery d
                JOIN adresses a ON d.id_adr_liv = a.id
                WHERE d.dat_delivery = CURDATE()
                AND a.latitude != 0 AND a.longitude != 0
                AND d.status NOT IN ('T', 'C') 
            `);

            if (!rows || rows.length === 0) {
                return res.json({ success: true, message: "Aucune livraison en cours", data: [] });
            }

            const result = await callPythonML({ 
                deliveries: rows, 
                nb_clusters: nbClusters,
                task: 'clustering'
            });

            res.json({ success: true, data: result });

        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
  
    // =========================================================
    // GESTION DES LIVRAISONS
    // =========================================================

    assignDelivery: async (req, res) => {
        const { id_doc, id_driver } = req.body;
        const user_cre = req.user?.login || 'ADMIN';

        if (!id_doc || !id_driver) return res.status(400).json({ success: false });

        try {
            const [check] = await db.query("SELECT * FROM delivery_transport WHERE id_doc = ?", [id_doc]);
            if (check.length > 0) {
                await db.query("UPDATE delivery_transport SET id_driver = ?, dat_upd = NOW(), usr_upd = ? WHERE id_doc = ?", [id_driver, user_cre, id_doc]);
            } else {
                await db.query("INSERT INTO delivery_transport (id_doc, id_driver, dat_cre, usr_cre) VALUES (?, ?, NOW(), ?)", [id_doc, id_driver, user_cre]);
            }

            socketHandler.sendNotification(id_driver, "Nouvelle livraison 📦", `Le bon N°${id_doc} vous a été attribué.`);
            res.json({ success: true, message: "Affecté avec succès" });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

   getLivraisonsToday: async (req, res) => {
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
                ORDER BY d.time_delivery ASC
            `;

            const result = await db.query(query, [identification_no]);
            
            let rows = Array.isArray(result[0]) ? result[0] : result;

        

            if (rows && rows.length > 0) {
                console.log("✅ Succès : Livraison trouvée !");
                res.json({ 
                    success: true, 
                    livraisons: safeJson(rows) 
                });
            } else {
                console.log("⚠️ Aucune livraison pour aujourd'hui dans la DB.");

                console.log("💡 Conseil : Vérifiez si dat_delivery en base est bien égale à :", new Date().toISOString().split('T')[0]);
                
                res.json({ 
                    success: true, 
                    livraisons: [] 
                });
            }

        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

 getLivraisonDetail: async (req, res) => {
    const { id_doc } = req.params;
    try {
        // 1. Récupérer l'entête (Header) avec le TOTAL des quantités
        const resultDoc = await db.query(`
            SELECT 
                d.*, 
                c.nom as client_name, 
                c.tel1 as client_phone, 
                a.adr1 as client_address, 
                a.ville,
                -- On ajoute le calcul du total de toutes les quantités pour ce bon
                IFNULL((SELECT SUM(qte) FROM delivery_details WHERE id_doc = d.id), 0) as total_qte_doc
            FROM delivery d 
            JOIN clients c ON d.id_clt = c.id 
            JOIN adresses a ON d.id_adr_liv = a.id
            WHERE d.id = ?`, [id_doc]);

        // Normalisation de l'entête
        let doc;
        if (Array.isArray(resultDoc[0])) {
            doc = resultDoc[0][0]; 
        } else if (Array.isArray(resultDoc)) {
            doc = resultDoc[0];
        } else {
            doc = resultDoc;
        }

        if (!doc) return res.status(404).json({ success: false, message: "Non trouvé" });

        // 2. Récupérer les détails (Lignes)
        // dd.* récupère déjà la colonne 'qte' de la table delivery_details
        const resultDetails = await db.query(`
            SELECT 
                dd.*, 
                p.lib_prd as lib_art, 
                p.ref_prd
            FROM delivery_details dd 
            LEFT JOIN produits p ON dd.id_prd = p.id
            WHERE dd.id_doc = ? 
            ORDER BY dd.no_lig ASC`, [id_doc]);

        // Normalisation des détails pour forcer le format tableau
        let details = [];
        if (Array.isArray(resultDetails[0])) {
            details = resultDetails[0];
        } else if (Array.isArray(resultDetails)) {
            details = resultDetails;
        } else if (resultDetails && resultDetails.id) {
            details = [resultDetails];
        }

        // On renvoie l'objet doc qui contient maintenant 'total_qte_doc'
        // et le tableau details où chaque ligne a sa 'qte'
        res.json({ 
            success: true, 
            livraison: safeJson({ ...doc, details }) 
        });

    } catch (error) {
        console.error("Erreur SQL détail:", error);
        res.status(500).json({ success: false, error: error.message });
    }
},// Dans LivraisonController.js

updateDetailQuantity: async (req, res) => {
    const { id_detail } = req.params;
    const { new_qte } = req.body;

    try {
        // 1. Récupérer l'ID du document avant la modif
        const [lineInfo] = await db.query("SELECT id_doc FROM delivery_details WHERE id = ?", [id_detail]);
        const docId = lineInfo[0]?.id_doc || lineInfo?.id_doc;

        if (!docId) return res.status(404).json({ success: false, message: "Ligne introuvable" });

        // 2. Mettre à jour la ligne (Quantité et Total HT de la ligne)
        await db.query(`
            UPDATE delivery_details 
            SET qte = ?, 
                tot_ht_rem = ? * prix_u_ht,
                dat_upd = NOW()
            WHERE id = ?
        `, [new_qte, new_qte, id_detail]);

        // 3. RECALCULER LE TOTAL GLOBAL (Somme des lignes + TVA)
        // On récupère la somme des (tot_ht_rem) et on ajoute la TVA
        const [totals] = await db.query(`
            SELECT 
                SUM(tot_ht_rem) as new_ht,
                SUM(tot_ht_rem * (taux_tva / 100)) as new_tva
            FROM delivery_details 
            WHERE id_doc = ?
        `, [docId]);

        const t = totals[0] || totals;
        const newSousTot = parseFloat(t.new_ht) || 0;
        const newTva = parseFloat(t.new_tva) || 0;
        const newTtc = newSousTot + newTva;

        // 4. Mettre à jour la table 'delivery'
        await db.query(`
            UPDATE delivery 
            SET sous_tot = ?, 
                tot_tva = ?, 
                tot_ttc = ?, 
                dat_upd = NOW() 
            WHERE id = ?
        `, [newSousTot, newTva, newTtc, docId]);

        console.log(`✅ Document ${docId} mis à jour : Nouveau TTC = ${newTtc}€`);

        res.json({ 
            success: true, 
            new_total_ttc: newTtc 
        });

    } catch (error) {
        console.error("❌ Erreur recalcul total:", error);
        res.status(500).json({ success: false, error: error.message });
    }
},

   updateLivraisonStatus: async (req, res) => {
    const { id_doc } = req.params;
    const { status } = req.body;

    const idInstance = "710522726361";
    const apiTokenInstance = "f4c7ef3600eb4b8fbff46ab2959cace2d094d7a31b8144d29c";

    try {
        const [deliveryData] = await db.query(`
            SELECT c.nom, c.mobil, c.tel1 
            FROM delivery d
            JOIN clients c ON d.id_clt = c.id 
            WHERE d.id = ?`, [id_doc]);

        await db.query(`UPDATE delivery SET status = ?, delivery_status = ?, dat_upd = NOW() WHERE id = ?`, 
            [status, status ? status.charAt(0) : '', id_doc]);

        if (deliveryData.length > 0 && status === 'T') {
            const client = deliveryData[0];
            const phone = (client.mobil || client.tel1).replace(/\D/g, '');

            if (phone) {
                const chatId = phone.includes('216') ? `${phone}@c.us` : `216${phone}@c.us`;
                
                axios.post(`https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`, {
                    chatId: chatId,
                    message: `Bonjour ${client.nom}, votre livraison pour la commande n°${id_doc} est en cours.`
                }).catch(err => console.error(err));
            }
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
},

getDeliveryStats: async (req, res) => {
    const { identification_no } = req.params;
    const searchVal = identification_no.trim();

    try {
        // 1. Chercher le chauffeur
        const result = await db.query("SELECT id FROM drivers WHERE identification_no = ?", [searchVal]);
        
        // Normalisation : On s'assure d'avoir l'objet chauffeur
        let driver;
        if (Array.isArray(result[0])) {
            driver = result[0][0]; // Cas mysql2 classique [rows, fields]
        } else if (Array.isArray(result)) {
            driver = result[0];    // Cas tableau direct
        } else {
            driver = result;       // Cas objet direct (votre cas actuel)
        }

        if (!driver || !driver.id) {
            return res.json({ success: false, message: "Chauffeur non trouvé", stats: { delivered: 0, remaining: 0, total: 0 } });
        }

        const driverId = driver.id;

        // 2. Calculer les statistiques
        const statsResult = await db.query(`
            SELECT 
                SUM(CASE WHEN d.status = 'T' THEN 1 ELSE 0 END) as livrees,
                SUM(CASE WHEN d.status NOT IN ('T', 'C') AND d.id IS NOT NULL THEN 1 ELSE 0 END) as restants
            FROM delivery_transport dt
            JOIN delivery d ON dt.id_doc = d.id
            WHERE dt.id_driver = ?`, [driverId]);

        // Normalisation des stats
        let s;
        if (Array.isArray(statsResult[0])) {
            s = statsResult[0][0];
        } else if (Array.isArray(statsResult)) {
            s = statsResult[0];
        } else {
            s = statsResult;
        }

        const delivered = parseInt(s?.livrees) || 0;
        const remaining = parseInt(s?.restants) || 0;

        return res.json({
            success: true,
            stats: {
                delivered: delivered,
                remaining: remaining,
                total: delivered + remaining
            }
        });

    } catch (error) {
        console.error("❌ ERREUR SQL:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
},
// =========================================================
    // HISTORIQUE DES LIVRAISONS TERMINEES
    // =========================================================

    getDriverHistory: async (req, res) => {
        const { identification_no } = req.params;
        
        try {
            // Requête SQL pour récupérer toutes les livraisons avec le statut 'T' (Terminé)
            const query = `
                SELECT 
                    d.id, 
                    d.no_doc, 
                    d.dat_delivery, 
                    d.time_delivery, 
                    d.tot_ttc, 
                    d.status,
                    c.nom as nom_client, 
                    a.ville, 
                    a.adr1 as adresse_client
                FROM drivers dr
                JOIN delivery_transport dt ON dr.id = dt.id_driver
                JOIN delivery d ON dt.id_doc = d.id
                JOIN clients c ON d.id_clt = c.id
                JOIN adresses a ON d.id_adr_liv = a.id
                WHERE dr.identification_no = ? 
                AND d.status IN ('T', 'C')
                ORDER BY d.dat_delivery DESC, d.time_delivery DESC
            `;

            const result = await db.query(query, [identification_no]);
            
            // Normalisation du résultat comme dans vos autres fonctions
            let rows = Array.isArray(result[0]) ? result[0] : result;

            if (rows && rows.length > 0) {
                res.json({ 
                    success: true, 
                    count: rows.length,
                    historique: safeJson(rows) 
                });
            } else {
                res.json({ 
                    success: true, 
                    message: "Aucun historique de livraison trouvé pour ce chauffeur.",
                    historique: [] 
                });
            }

        } catch (error) {
            console.error("❌ Erreur historique livreur:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    },
};

module.exports = LivraisonController;