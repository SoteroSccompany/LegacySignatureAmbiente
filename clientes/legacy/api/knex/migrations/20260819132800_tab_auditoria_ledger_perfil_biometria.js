/**
 * Migration Knex: Ledger encadeado de auditoria do perfil biometria
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_auditoria_ledger_perfil_biometria';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();

        table.string('perfil_biometria_id', 39).notNullable()
            .references('id')
            .inTable('tab_perfil_biometria')
            .withKeyName('fk_ledger_perfil_bio_bio');

        table.string('perfil_id', 39).notNullable()
            .references('id')
            .inTable('tab_perfil_usuario')
            .withKeyName('fk_ledger_perfil_bio_perfil');

        table.string('termo_id', 39).notNullable()
            .references('id')
            .inTable('tab_aceite_termo_responsabilidade')
            .withKeyName('fk_ledger_perfil_bio_termo');

        table.string('desafio_id', 39).notNullable()
            .references('id')
            .inTable('tab_desafio_autenticacao')
            .withKeyName('fk_ledger_perfil_bio_desafio');

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
            .withKeyName('fk_ledger_perfil_bio_origem');

        table.boolean('deletado').notNullable().defaultTo(false);

        table.unique(['perfil_biometria_id', 'sequencia'], 'uk_ledger_perfil_bio_seq');
        table.unique(['hash_atual'], 'uk_ledger_perfil_bio_hash_atual');

        table.index(['perfil_biometria_id', 'criado_em'], 'idx_ledger_perfil_bio_criado');
        table.index(['perfil_id'], 'idx_ledger_perfil_bio_perfil');
        table.index(['termo_id'], 'idx_ledger_perfil_bio_termo');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};
