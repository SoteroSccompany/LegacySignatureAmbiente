require("dotenv/config");

// Singleton: Armazena a instância única do Knex
let knexInstance = null;

function conect() {
    if (knexInstance) {
        return knexInstance;
    }

    knexInstance = require("knex")({
        client: process.env.DB_CLIENT || 'mysql2',
        connection: {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_DATABASE,
            port: process.env.DB_PORT
        },
        pool: {
            min: 2,
            max: 8,
            idleTimeoutMillis: 30000,
            acquireTimeoutMillis: 30000,
            createTimeoutMillis: 3000,
            destroyTimeoutMillis: 5000,
            propagateCreateError: false
        },
    });

    process.on('SIGINT', async () => {
        if (knexInstance) {
            await knexInstance.destroy();
            console.log('Pool de conexões MySQL encerrado.');
            process.exit(0);
        }
    });

    process.on('SIGTERM', async () => {
        if (knexInstance) {
            await knexInstance.destroy();
            console.log('Pool de conexões MySQL encerrado.');
            process.exit(0);
        }
    });

    return knexInstance;
}

module.exports = conect;
