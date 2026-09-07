const db = require('../config/database');

// =========================================================
// UTILS
// =========================================================

const safeJson = (data) => {
    if (!data) return [];
    try {
        // Le driver MariaDB utilise souvent des BigInt pour les IDs
        return JSON.parse(JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));
    } catch (e) {
        return [];
    }
};

const DriverController = {

    // =========================================================
    // GESTION DES LIVREURS
    // =========================================================

    // 1. Lister tous les livreurs
    getAllDrivers: async (req, res) => {
        try {
            // id_user retiré de la sélection
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
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // 2. Ajouter un nouveau livreur
    createDriver: async (req, res) => {
        // id_user retiré du body
        const { first_name, last_name, identification_no } = req.body;
        const user_cre = req.user?.login || 'ADMIN';

        try {
            // id_user retiré de la requête INSERT
            const query = `
                INSERT INTO drivers 
                (first_name, last_name, identification_no, usr_cre, dat_cre, usr_upd) 
                VALUES (?, ?, ?, ?, CURDATE(), '')
            `;
            
            const result = await db.query(query, [
                first_name, 
                last_name, 
                identification_no, 
                user_cre
            ]);

            res.json({ 
                success: true, 
                message: "Livreur ajouté avec succès", 
                id: result.insertId ? Number(result.insertId) : null 
            });

        } catch (error) {
            console.error("ERREUR SQL createDriver:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // 3. Modifier un livreur
    updateDriver: async (req, res) => {
        const { id } = req.params;
        // id_user retiré du body
        const { first_name, last_name, identification_no } = req.body;
        const user_upd = req.user?.login || 'ADMIN';

        try {
            // id_user retiré de la clause SET
            const query = `
                UPDATE drivers 
                SET first_name = ?, 
                    last_name = ?, 
                    identification_no = ?, 
                    usr_upd = ?, 
                    dat_upd = NOW() 
                WHERE id = ?
            `;

            const result = await db.query(query, [
                first_name, 
                last_name, 
                identification_no, 
                user_upd, 
                id
            ]);

            if (Number(result.affectedRows) === 0) {
                return res.status(404).json({ success: false, message: "Livreur non trouvé" });
            }

            res.json({ success: true, message: "Livreur mis à jour avec succès" });
        } catch (error) {
            console.error("Erreur updateDriver:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // 4. Supprimer un livreur
    deleteDriver: async (req, res) => {
        const { id } = req.params;

        try {
            const result = await db.query("DELETE FROM drivers WHERE id = ?", [id]);

            if (Number(result.affectedRows) === 0) {
                return res.status(404).json({ success: false, message: "Livreur non trouvé" });
            }

            res.json({ success: true, message: "Livreur supprimé avec succès" });
        } catch (error) {
            if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
                return res.status(400).json({ 
                    success: false, 
                    error: "Impossible de supprimer ce livreur car il est lié à d'autres données." 
                });
            }
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // 5. Récupérer un livreur spécifique
    getDriverById: async (req, res) => {
        const { id } = req.params;
        try {
            // Sélection explicite des colonnes (sans id_user)
            const rows = await db.query(`
                SELECT id, first_name, last_name, identification_no, dat_cre, usr_cre, dat_upd, usr_upd 
                FROM drivers 
                WHERE id = ?
            `, [id]);
            
            const driver = rows.length > 0 ? rows[0] : null;

            if (!driver) {
                return res.status(404).json({ success: false, message: "Livreur non trouvé" });
            }
            
            res.json({ success: true, data: safeJson(driver) });
        } catch (error) {
            console.error("Erreur getDriverById:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = DriverController;