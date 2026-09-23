/**
 * Migration Knex: ponteiros de prova em vault (ZIP json+cms) na trilha do PDF.
 * Nullable de propósito: registros já gravados (DOCUMENTO_RECEBIDO,
 * ASSINATURA_APLICADA, DOCUMENTO_COMPLETO) continuam sem ZIP — a cadeia de
 * hash já selada não é reescrita.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_auditoria_ledger';

exports.up = function (knex) {
    return knex.schema.alterTable(tableName, function (table) {
        table.string('payload_sha256', 64).nullable();
        table.text('bucket_path').nullable();
        table.text('object_name').nullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.alterTable(tableName, function (table) {
        table.dropColumn('payload_sha256');
        table.dropColumn('bucket_path');
        table.dropColumn('object_name');
    });
};
