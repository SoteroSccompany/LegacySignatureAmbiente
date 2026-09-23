/**
 * Migration Knex: Ledger encadeado de auditoria do signatário
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_auditoria_ledger_signatario';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();

        table.string('signatario_id', 39).notNullable()
            .references('id')
            .inTable('tab_signatarios');

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
            .inTable('tab_auditoria_ledger_signatario');

        table.boolean('deletado').notNullable().defaultTo(false);

        table.unique(['signatario_id', 'sequencia'], 'uk_ledger_signatario_seq');
        table.unique(['hash_atual'], 'uk_ledger_signatario_hash_atual');

        table.index(['signatario_id', 'criado_em'], 'idx_ledger_signatario_criado');
        table.index(['signatario_id', 'tipo_evento'], 'idx_ledger_signatario_tipo');
        table.index(['documento_id'], 'idx_ledger_signatario_documento');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};
