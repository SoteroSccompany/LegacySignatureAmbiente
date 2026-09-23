// api/cleardb.js
require('dotenv/config');
const knex = require('./infrastructure/db/config/databaseConection')();

const USUARIOS_PRESERVAR = [
    'f156723d-cccd-407f-b590-5a847cae0c1d',
    '2f09833b-001e-4eaf-9c75-ed8ceaf3d181',
];

const TABELAS_NAO_TOCAR = [
    'knex_migrations',
    'knex_migrations_lock',
    'tab_usuarios',
];

async function main() {
    if (process.env.STATUSAPLICATION === 'production') {
        throw new Error('Recusado em production');
    }

    const [rows] = await knex.raw(`
        SELECT TABLE_NAME
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_TYPE = 'BASE TABLE'
          AND TABLE_NAME NOT IN (?, ?, ?)
    `, TABELAS_NAO_TOCAR);

    await knex.raw('SET FOREIGN_KEY_CHECKS = 0');

    for (const row of rows) {
        await knex.raw(`TRUNCATE TABLE \`${row.TABLE_NAME}\``);
        console.log('OK', row.TABLE_NAME);
    }

    const placeholders = USUARIOS_PRESERVAR.map(() => '?').join(', ');

    const [existentes] = await knex.raw(
        `SELECT id FROM tab_usuarios WHERE id IN (${placeholders})`,
        USUARIOS_PRESERVAR
    );
    const idsEncontrados = existentes.map((row) => row.id);
    const idsFaltando = USUARIOS_PRESERVAR.filter((id) => !idsEncontrados.includes(id));
    if (idsFaltando.length) {
        throw new Error(`Usuario(s) nao encontrado(s): ${idsFaltando.join(', ')}`);
    }

    await knex.raw(
        `DELETE FROM tab_usuarios WHERE id NOT IN (${placeholders})`,
        USUARIOS_PRESERVAR
    );
    console.log('OK tab_usuarios (preservados', USUARIOS_PRESERVAR.join(', ') + ')');

    const [resultado] = await knex.raw(
        `UPDATE tab_usuarios
         SET desafio_id = NULL, dois_fatores = 0
         WHERE id IN (${placeholders})`,
        USUARIOS_PRESERVAR
    );

    if (resultado.affectedRows < USUARIOS_PRESERVAR.length) {
        throw new Error('Falha ao resetar 2FA dos usuarios preservados');
    }
    console.log('OK reset 2FA', USUARIOS_PRESERVAR.join(', '));

    await knex.raw('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Banco limpo. Vault/WIP e filas Rabbit nao foram tocados.');
    await knex.destroy();
}

main().catch(async (err) => {
    console.error(err);
    try { await knex.raw('SET FOREIGN_KEY_CHECKS = 1'); } catch (_) { }
    await knex.destroy();
    process.exit(1);
});
