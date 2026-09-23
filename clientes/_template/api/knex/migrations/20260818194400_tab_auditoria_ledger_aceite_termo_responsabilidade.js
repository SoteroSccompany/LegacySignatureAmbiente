/**
 * Migration Knex: Ledger encadeado de auditoria do aceite de termo de responsabilidade
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_auditoria_ledger_aceite_termo_responsabilidade';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();

        table.string('aceite_id', 39).notNullable()
            .references('id')
            .inTable('tab_aceite_termo_responsabilidade')
            .withKeyName('fk_ledger_aceite_aceite');

        table.string('termo_id', 39).notNullable()
            .references('id')
            .inTable('tab_termo_responsabilidade')
            .withKeyName('fk_ledger_aceite_termo');

        table.string('usuario_id', 39).notNullable()
            .references('id')
            .inTable('tab_usuarios')
            .withKeyName('fk_ledger_aceite_usuario');

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
            .withKeyName('fk_ledger_aceite_origem');
        table.boolean('deletado').notNullable().defaultTo(false);
        table.unique(['aceite_id', 'sequencia'], 'uk_ledger_aceite_termo_seq');
        table.unique(['hash_atual'], 'uk_ledger_aceite_termo_hash_atual');
        table.index(['aceite_id', 'criado_em'], 'idx_ledger_aceite_termo_criado');
        table.index(['usuario_id'], 'idx_ledger_aceite_termo_usuario');
        table.index(['termo_id'], 'idx_ledger_aceite_termo_termo');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};
