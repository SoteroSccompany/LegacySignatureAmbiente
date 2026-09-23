/**
 * Migration Knex: consulta de validação do PDF enviado (trilha própria, fora da cadeia mestre)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_documento_validacao';

exports.up = async function (knex) {
    await knex.schema.dropTableIfExists(tableName);
    return knex.schema.createTable(tableName, function (table) {
        table.charset('utf8mb4');
        table.collate('utf8mb4_0900_ai_ci');

        table.string('id', 39).notNullable().primary();

        table.string('documento_id', 39).notNullable()
            .references('id')
            .inTable('tab_documentos');

        table.string('codigo_consultado', 60).nullable();
        table.string('hash_documento_enviado', 64).notNullable();
        table.string('veredito', 32).notNullable();
        table.string('hash_conferido_com', 32).nullable();

        table.string('auditoria_ledger_id', 39).nullable()
            .references('id')
            .inTable('tab_auditoria_ledger');

        table.string('ip').nullable();
        table.integer('porta_logica').nullable();
        table.text('user_agent').nullable();

        table.timestamp('data_criacao', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.boolean('deletado').notNullable().defaultTo(false);

        table.index(['documento_id'], 'idx_documento_validacao_documento');
        table.index(['codigo_consultado'], 'idx_documento_validacao_codigo');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};
