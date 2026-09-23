
require('dotenv/config');
const mysql = require('mysql2/promise');
const server = require('./infrastructure/server');
const logs = require('./Logs');

// Garante o database da api central e roda as migrations antes de subir.
const bootstrap = async () => {
    try {
        let conexao;
        let tentativas = 0;
        while (!conexao) {
            try {
                conexao = await mysql.createConnection({
                    host: process.env.DB_HOST,
                    user: process.env.DB_USER,
                    password: process.env.DB_PASS,
                    port: process.env.DB_PORT,
                });
            } catch (err) {
                tentativas += 1;
                if (tentativas >= 30) throw err;
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }
        await conexao.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_DATABASE}\``);
        await conexao.end();
        if (process.env.RUN_MIGRATIONS === 'true') {
            const path = require('path');
            const knex = require('./infrastructure/db/config/databaseConection')();
            await knex.migrate.latest({ directory: path.join(__dirname, 'knex/migrations') });
            logs.getInstance().info('Migrations da api central aplicadas');
        }
        await server.createServer();
    } catch (err) {
        console.log(err)
        logs.getInstance().error(err, 'Erro no bootstrap da api central');
        process.exit(1);
    }
}

bootstrap();
