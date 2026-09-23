/**
 * Migration Knex: ajustes do tab_documentos para o fluxo de hash inicial
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_documentos';

exports.up = function (knex) {
    return knex.schema.alterTable(tableName, function (table) {
        table.text('bucket_wip_path').notNullable().alter();
        table.text('bucket_valt_path').nullable().alter();
        table.string('solicitacao_id', 39).nullable()
            .references('id').inTable('tab_solicitacao_documento');
        table.unique(['solicitacao_id'], 'uk_documentos_solicitacao');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.alterTable(tableName, function (table) {
        table.dropForeign(['solicitacao_id']);
        table.dropUnique(['solicitacao_id'], 'uk_documentos_solicitacao');
        table.dropColumn('solicitacao_id');
        table.string('bucket_wip_path', 30).notNullable().alter();
        table.string('bucket_valt_path', 30).nullable().alter();
    });
};
