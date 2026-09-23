/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const tableName = 'tab_chave_integracao';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();
        table.string('user_id', 39).notNullable()
            .references('id').inTable('tab_usuarios');
        table.string('prefixo', 16).notNullable();
        table.string('hash', 64).notNullable().unique();
        table.string('escopo', 64).notNullable();
        table.string('email_usuario', 255).notNullable();
        table.string('desafio_id', 39).notNullable();
        table.string('session_id', 128).notNullable();
        table.datetime('ultimo_uso').nullable();
        table.boolean('revogada').notNullable().defaultTo(false);
        table.datetime('data_criacao').notNullable();
        table.datetime('data_atualizacao').notNullable();
        table.boolean('deletado').notNullable().defaultTo(false);

        table.index(['user_id'], 'idx_chave_integracao_user');
        table.index(['hash'], 'idx_chave_integracao_hash');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};
