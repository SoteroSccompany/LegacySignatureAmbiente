require('dotenv/config');

module.exports = {
    client: process.env.DB_CLIENT || 'mysql2',
    connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_DATABASE,
        port: process.env.DB_PORT
    },
    migrations: {
        directory: './knex/migrations'
    }
};
