const mariadb = require("mariadb");

const pool = mariadb.createPool({
    host: "127.0.0.1",
    port: 3307,  // ← le vrai port de ton instance
    user: "root",
    password: "123456789",
    database: "cashmarket",
    connectionLimit: 5,
    allowPublicKeyRetrieval: true,
});

module.exports = pool;