/**
 * Migration Knex: Ledger encadeado de auditoria da solicitação (processo)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_auditoria_ledger_solicitacao';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();
        table.string('solicitacao_id', 39).notNullable()
            .references('id')
            .inTable('tab_solicitacao_documento');
        table.string('documento_id', 39).nullable()
            .references('id')
            .inTable('tab_documentos');
        table.string('tipo_evento', 120).notNullable();
        table.integer('sequencia').unsigned().notNullable();
        table.json('metadata_json').nullable();
        table.string('hash_atual', 64).notNullable();
        table.string('hash_registro_anterior', 64).nullable();
        table.string('bucket_path', 200).notNullable();
        table.text('object_name').notNullable();
        table.string('payload_sha256', 64).notNullable();
        table.timestamp('criado_em', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.string('auditoria_ledger_origem', 39).nullable()
            .references('id')
            .inTable('tab_auditoria_ledger_solicitacao');
        table.boolean('deletado').notNullable().defaultTo(false);
        table.unique(['solicitacao_id', 'sequencia'], 'uk_ledger_solicitacao_seq');
        table.unique(['hash_atual'], 'uk_ledger_solicitacao_hash_atual');
        table.unique(['envelope_sha256'], 'uk_ledger_solicitacao_envelope');
        table.index(['solicitacao_id', 'criado_em'], 'idx_ledger_solicitacao_criado');
        table.index(['solicitacao_id', 'tipo_evento'], 'idx_ledger_solicitacao_tipo');
        table.index(['documento_id'], 'idx_ledger_solicitacao_documento');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};