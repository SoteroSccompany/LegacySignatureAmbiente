/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const tableName = 'tab_instalacao';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();
        table.string('nome', 255).notNullable();
        table.text('chave_api').notNullable();
        table.string('chave_api_prefixo', 16).notNullable();
        table.string('email_usuario', 255).notNullable();
        table.boolean('chave_admin').notNullable().defaultTo(false);
        table.string('credencial_hash', 64).notNullable().unique();
        table.string('credencial_prefixo', 16).notNullable();
        table.string('pasta_raiz_drive', 255).nullable();
        table.string('status', 32).notNullable();
        table.datetime('ultimo_uso').nullable();
        table.datetime('data_criacao').notNullable();
        table.datetime('data_atualizacao').notNullable();
        table.boolean('deletado').notNullable().defaultTo(false);

        table.index(['credencial_hash'], 'idx_instalacao_credencial');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};
