/**
 * Migration Knex: Ledger encadeado de auditoria do documento
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_auditoria_ledger';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();

        table.string('documento_id', 39).notNullable()
            .references('id')
            .inTable('tab_documentos');

        table.string('desafio_acesso_id', 39).nullable()
            .references('id').inTable('tab_desafio_autenticacao');

        table.string('tipo_evento', 64).notNullable();

        table.integer('sequencia').unsigned().notNullable();

        table.json('metadata_json').nullable();

        table.string('hash_bytes_pdf', 64).notNullable();
        table.string('hash_registro_anterior', 64).nullable();
        table.string('hash_atual', 64).notNullable();

        table.timestamp('criado_em', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.boolean('deletado').notNullable().defaultTo(false);

        table.unique(['documento_id', 'sequencia'], 'uk_auditoria_ledger_documento_sequencia');
        table.unique(['hash_atual'], 'uk_auditoria_ledger_hash_atual');

        table.index(['documento_id', 'criado_em'], 'idx_auditoria_ledger_documento_criado');
        table.index(['documento_id', 'tipo_evento'], 'idx_auditoria_ledger_documento_tipo');
        table.index(['desafio_acesso_id'], 'idx_auditoria_ledger_desafio');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};