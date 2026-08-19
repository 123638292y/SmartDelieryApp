require('dotenv').config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { createServer } = require("http");

// Import du gestionnaire de Sockets
const socketHandler = require('./socket/socketHandler'); 

const app = express();
const server = createServer(app);

// 1. INITIALISATION DE SOCKET.IO (Une seule fois via le handler)
// Cela permet de centraliser toute la logique socket dans un seul fichier
socketHandler.init(server);

const PORT = process.env.PORT || 5000;

// 2. MIDDLEWARES DE SÉCURITÉ ET CONFIGURATION
app.use(helmet({ 
  crossOriginResourcePolicy: { policy: "cross-origin" } 
}));

// Configuration CORS : On autorise tout pour le développement mobile
app.use(cors()); 

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// 3. ROUTES API
app.use("/api/auth", require("./routes/authRoutes"));
app.use('/api/route', require('./routes/RoutesRoutes'));
app.use('/api/livraisons', require('./routes/livraisonRoutes')); 

app.use('/api/notifications', require('./routes/notificationRoutes'));

// Route de test de santé
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Serveur en ligne",
    time: new Date()
  });
});

// 4. GESTION DES ERREURS GLOBALES
app.use((err, req, res, next) => {
  console.error("❌ Erreur serveur:", err.stack); // .stack donne plus de détails que .message
  res.status(500).json({ 
    success: false, 
    message: "Une erreur interne est survenue",
    error: process.env.NODE_ENV === 'development' ? err.message : {} 
  });
});

// 5. LANCEMENT DU SERVEUR
// On utilise '0.0.0.0' pour que le serveur soit accessible depuis ton téléphone sur le même WiFi
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
  🚀 Serveur khedem sur le port ${PORT}
  📡 Socket.io est prêt et écoute les connexions
  🔗 URL Santé: http://localhost:${PORT}/api/health
  `);
});