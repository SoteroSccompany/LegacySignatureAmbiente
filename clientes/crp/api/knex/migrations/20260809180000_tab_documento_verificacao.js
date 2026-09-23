/**
 * Migration Knex: código de verificação matemático do documento (aponta para a trilha de auditoria completa)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_documento_verificacao';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();

        table.string('documento_id', 39).notNullable().unique()
            .references('id')
            .inTable('tab_documentos');

        table.string('codigo_verificacao', 60).notNullable().unique();
        table.string('hash_referencia', 64).notNullable();

        table.timestamp('criado_em', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.boolean('deletado').notNullable().defaultTo(false);

        table.index(['codigo_verificacao'], 'idx_documento_verificacao_codigo');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};
