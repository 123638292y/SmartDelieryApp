const socketIo = require('socket.io');

let io;

module.exports = {
  init: (server) => {
    io = socketIo(server, {
      cors: {
        origin: "*", 
        methods: ["GET", "POST"]
      },
      // Force les websockets pour éviter les problèmes de polling sur mobile
      transports: ['websocket'] 
    });

    io.on('connection', (socket) => {
      console.log('📱 Nouveau client connecté:', socket.id);

      socket.on('join', (userId) => {
        // IMPORTANT: On force userId en String pour éviter les erreurs de type (12 vs "12")
        const roomName = `driver_${String(userId)}`;
        socket.join(roomName);
        console.log(`✅ Driver ${userId} a rejoint sa room: ${roomName}`);
      });

      socket.on('disconnect', () => {
        console.log('📱 Client déconnecté');
      });
    });

    return io;
  },

  sendNotification: (driverId, title, message, data = {}) => {
    if (io) {
      const roomName = `driver_${String(driverId)}`;
      
      // On "aplatit" l'objet envoyé pour que le frontend reçoive tout au même niveau
      const payload = {
        title,
        message,
        ...data, // On ajoute id, created_at, etc.
        timestamp: new Date()
      };

      io.to(roomName).emit('notification', payload);
      
      console.log(`📡 Notification envoyée à ${roomName}:`, title);
    } else {
      console.error("❌ Erreur: L'instance 'io' n'est pas initialisée !");
    }
  }
};