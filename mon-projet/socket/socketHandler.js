// socketHandler.js
const socketIo = require('socket.io');

let io;

module.exports = {
  init: (server) => {
    io = socketIo(server, {
      cors: {
        origin: "*", // Autorise toutes les connexions (à restreindre en prod)
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      console.log('📱 Nouveau client connecté:', socket.id);

      // Le livreur rejoint une "chambre" (room) basée sur son ID
      socket.on('join', (userId) => {
        socket.join(`driver_${userId}`);
        console.log(`Driver ${userId} a rejoint sa room.`);
      });

      socket.on('disconnect', () => {
        console.log('📱 Client déconnecté');
      });
    });

    return io;
  },

  // Fonction pour envoyer une notification à un chauffeur spécifique
  sendNotification: (driverId, title, message, data = {}) => {
    if (io) {
      io.to(`driver_${driverId}`).emit('notification', {
        title,
        message,
        data,
        timestamp: new Date()
      });
      console.log(`Notification envoyée au driver ${driverId}`);
    }
  }
};