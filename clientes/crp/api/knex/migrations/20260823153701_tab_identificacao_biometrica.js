/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_identificacao_biometrica';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();

        table.string('documento_id', 39).notNullable()
            .references('id').inTable('tab_documentos');
        table.string('user_id', 39).notNullable()
            .references('id').inTable('tab_usuarios');
        table.string('signatario_id', 39).notNullable()
            .references('id').inTable('tab_signatarios');
        table.string('perfil_biometria_id', 39).notNullable()
            .references('id').inTable('tab_perfil_biometria');
        table.string('desafio_id', 39).notNullable()
            .references('id').inTable('tab_desafio_autenticacao');

        table.string('bucket_wip_path', 255).nullable();
        table.string('payload_sha256', 64).nullable();
        table.string('status', 64).notNullable();

        table.dateTime('data_criacao').notNullable();
        table.dateTime('data_atualizacao').notNullable();
        table.boolean('deletado').notNullable().defaultTo(false);

        table.index(['documento_id', 'status'], 'idx_ident_bio_doc_status');
        table.index(['signatario_id', 'status'], 'idx_ident_bio_sign_status');
        table.index(['user_id'], 'idx_ident_bio_user');
    });
};

exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};