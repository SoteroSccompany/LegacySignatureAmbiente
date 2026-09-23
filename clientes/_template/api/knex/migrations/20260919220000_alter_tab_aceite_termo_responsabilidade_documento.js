/**
 * Migration Knex: aceite de termo passa a poder ser vinculado a um documento/signatario
 * específico (aceite por cerimônia de assinatura), além do aceite global legado.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_aceite_termo_responsabilidade';

exports.up = function (knex) {
    return knex.schema.alterTable(tableName, function (table) {
        table
            .string('documento_id', 39)
            .nullable()
            .references('id')
            .inTable('tab_documentos');
        table
            .string('signatario_id', 39)
            .nullable()
            .references('id')
            .inTable('tab_signatarios');
        table.index(
            ['user_id', 'termo_id', 'documento_id'],
            'idx_aceite_termo_user_termo_documento',
        );
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.alterTable(tableName, function (table) {
        table.dropIndex(['user_id', 'termo_id', 'documento_id'], 'idx_aceite_termo_user_termo_documento');
        table.dropColumn('signatario_id');
        table.dropColumn('documento_id');
    });
};
