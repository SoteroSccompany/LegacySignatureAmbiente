/**
 * Migration Knex: Tabela de Desafios 2FA e Autenticação de Acesso/Assinatura
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_documentos';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();
        table.text('nome_documento').notNullable();
        table.text('documento_nome').notNullable();
        table.string('bucket_wip_path', 30).notNullable();
        table.string('bucket_valt_path', 30).nullable();
        table.string('status', 110).notNullable(); // DRAFT, UPLOADING, PENDING_SIGNATURES, CANCELLED, COMPLETED, EXPIRED
        table.text('hash_original').notNullable();
        table.text('hash_final').nullable();
        table.timestamp('hash_final_em', { useTz: true }).nullable();
        table.string('termo_id', 39).notNullable()
            .references('id').inTable('tab_termo_responsabilidade');
        table.timestamp('criado_em', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};
