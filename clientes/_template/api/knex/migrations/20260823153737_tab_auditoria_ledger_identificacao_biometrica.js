/**
 * Migration Knex: Ledger encadeado de auditoria da identificacao biometrica
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_auditoria_ledger_identificacao_biometrica';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();

        table.string('identificacao_biometrica_id', 39).notNullable()
            .references('id')
            .inTable('tab_identificacao_biometrica')
            .withKeyName('fk_ledger_ident_bio_ident');

        table.string('documento_id', 39).notNullable()
            .references('id')
            .inTable('tab_documentos')
            .withKeyName('fk_ledger_ident_bio_doc');

        table.string('usuario_id', 39).notNullable()
            .references('id')
            .inTable('tab_usuarios')
            .withKeyName('fk_ledger_ident_bio_user');

        table.string('signatario_id', 39).notNullable()
            .references('id')
            .inTable('tab_signatarios')
            .withKeyName('fk_ledger_ident_bio_sign');

        table.string('perfil_biometria_id', 39).notNullable()
            .references('id')
            .inTable('tab_perfil_biometria')
            .withKeyName('fk_ledger_ident_bio_perfil');

        table.string('desafio_id', 39).notNullable()
            .references('id')
            .inTable('tab_desafio_autenticacao')
            .withKeyName('fk_ledger_ident_bio_desafio');

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
            .withKeyName('fk_ledger_ident_bio_origem');

        table.boolean('deletado').notNullable().defaultTo(false);

        table.unique(['identificacao_biometrica_id', 'sequencia'], 'uk_ledger_ident_bio_seq');
        table.unique(['hash_atual'], 'uk_ledger_ident_bio_hash_atual');

        table.index(['identificacao_biometrica_id', 'criado_em'], 'idx_ledger_ident_bio_criado');
        table.index(['documento_id'], 'idx_ledger_ident_bio_doc');
        table.index(['usuario_id'], 'idx_ledger_ident_bio_user');
        table.index(['signatario_id'], 'idx_ledger_ident_bio_sign');
    });
};

exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};