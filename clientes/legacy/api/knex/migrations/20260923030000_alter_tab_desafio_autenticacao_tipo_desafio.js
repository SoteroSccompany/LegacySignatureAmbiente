/**
 * tipo_desafio nascia com 30 caracteres. Cadastro-Termo-Responsabilidade
 * tem 31 e Resposta-Solicitacao-Perfil-Biometria tem 37 — o insert estoura.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_desafio_autenticacao';

exports.up = function (knex) {
    return knex.schema.alterTable(tableName, function (table) {
        table.string('tipo_desafio', 64).notNullable().alter();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.alterTable(tableName, function (table) {
        table.string('tipo_desafio', 30).notNullable().alter();
    });
};
