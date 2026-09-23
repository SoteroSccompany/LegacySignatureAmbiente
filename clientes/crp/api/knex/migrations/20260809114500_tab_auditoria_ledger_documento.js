/**
 * Migration Knex: Ledger encadeado de auditoria dos dados do documento (não do PDF)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_auditoria_ledger_documento';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();

        table.string('documento_id', 39).notNullable()
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
            .inTable('tab_auditoria_ledger_documento');

        table.boolean('deletado').notNullable().defaultTo(false);

        table.unique(['documento_id', 'sequencia'], 'uk_ledger_documento_seq');
        table.unique(['hash_atual'], 'uk_ledger_documento_hash_atual');

        table.index(['documento_id', 'criado_em'], 'idx_ledger_documento_criado');
        table.index(['documento_id', 'tipo_evento'], 'idx_ledger_documento_tipo');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};
