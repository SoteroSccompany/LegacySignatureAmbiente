/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const tableName = 'tab_instalacao';

exports.up = function (knex) {
    return knex.schema.alterTable(tableName, function (table) {
        // Escopo da lsak_ vinculada (addon_solicitante ou addon_signatario), devolvido
        // por GET /integracao/me na API. Define se a instalação pode pedir ou só assinar.
        table.string('escopo', 32).nullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.alterTable(tableName, function (table) {
        table.dropColumn('escopo');
    });
};
