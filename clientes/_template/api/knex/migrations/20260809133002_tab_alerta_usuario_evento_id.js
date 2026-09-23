/**
 * Migration Knex: vincula alerta ao evento
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_alerta_usuario';

exports.up = function (knex) {
    return knex.schema.alterTable(tableName, function (table) {
        table.string('evento_id', 39).nullable()
            .references('id')
            .inTable('tab_evento');
        table.index(['user_id', 'evento_id'], 'idx_alerta_usuario_evento');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.alterTable(tableName, function (table) {
        table.dropIndex(['user_id', 'evento_id'], 'idx_alerta_usuario_evento');
        table.dropForeign(['evento_id']);
        table.dropColumn('evento_id');
    });
};
