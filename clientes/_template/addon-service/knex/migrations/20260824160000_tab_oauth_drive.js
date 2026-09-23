/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const tableName = 'tab_oauth_drive';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();
        // Consentimento do Drive por conta Google — uma linha por e-mail, o
        // refresh fica cifrado (SHA.encrypt) do mesmo jeito que a chave_api.
        table.string('email', 255).notNullable().unique();
        table.text('refresh_token').notNullable();
        table.datetime('autorizado_em').notNullable();
        table.datetime('data_criacao').notNullable();
        table.datetime('data_atualizacao').notNullable();
        table.boolean('deletado').notNullable().defaultTo(false);

        table.index(['email'], 'idx_oauth_drive_email');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};
