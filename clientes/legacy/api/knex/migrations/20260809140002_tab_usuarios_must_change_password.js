/**
 * Adiciona a flag trocar_senha em tab_usuarios: obrigatória logo após a
 * promoção do staging (1º login com senha temporária).
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_usuarios';

exports.up = function (knex) {
    return knex.schema.alterTable(tableName, function (table) {
        table.boolean('trocar_senha').notNullable().defaultTo(false);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.alterTable(tableName, function (table) {
        table.dropColumn('trocar_senha');
    });
};
