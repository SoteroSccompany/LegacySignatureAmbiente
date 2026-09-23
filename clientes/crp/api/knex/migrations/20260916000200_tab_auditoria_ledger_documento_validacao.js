/**
 * Migration Knex: Ledger encadeado de auditoria da validação do documento enviado
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_auditoria_ledger_documento_validacao';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.charset('utf8mb4');
        table.collate('utf8mb4_0900_ai_ci');

        table.string('id', 39).notNullable().primary();

        table.string('documento_validacao_id', 39).notNullable()
            .references('id')
            .inTable('tab_documento_validacao')
            .withKeyName('fk_ledger_doc_validacao_id');

        table.string('documento_id', 39).nullable()
            .references('id')
            .inTable('tab_documentos')
            .withKeyName('fk_ledger_doc_validacao_doc');

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
            .inTable(tableName)
            .withKeyName('fk_ledger_doc_validacao_origem');

        table.boolean('deletado').notNullable().defaultTo(false);

        table.unique(['documento_validacao_id', 'sequencia'], 'uk_ledger_documento_validacao_seq');
        table.unique(['hash_atual'], 'uk_ledger_documento_validacao_hash');

        table.index(['documento_validacao_id', 'criado_em'], 'idx_ledger_doc_validacao_criado');
        table.index(['documento_id'], 'idx_ledger_doc_validacao_doc');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};
