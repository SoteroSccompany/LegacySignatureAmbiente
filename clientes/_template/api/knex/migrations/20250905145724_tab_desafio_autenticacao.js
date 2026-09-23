/**
 * Migration Knex: Tabela de Desafios 2FA e Autenticação de Acesso/Assinatura
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_desafio_autenticacao';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();
        table.uuid('user_id').notNullable().references('id').inTable('tab_usuarios');
        table.uuid('document_id').nullable().index();
        table.string('sessao_id', 128).notNullable().index();
        table.string('tipo_desafio', 64).notNullable();
        table.boolean('usado').notNullable().defaultTo(false);
        table.string('solicitacao_ip').notNullable();
        table.integer('solicitacao_porta_logica').notNullable();
        table.text('solicitacao_user_agent_hash').notNullable();
        table.string('confirmacao_ip').nullable();
        table.integer('confirmacao_porta_logica').nullable();
        table.text('confirmacao_user_agent_hash').nullable();
        table.string('desafio_id', 39).nullable()
            .references('id').inTable('tab_desafio_autenticacao').defaultTo(null);
        table.timestamp('consumido_em', { useTz: true }).nullable();
        table.timestamp('criado_em', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp('expira_em', { useTz: true }).nullable();
        table.boolean('deletado').notNullable().defaultTo(false);
        table.index(['user_id', 'usado', 'expira_em'], 'idx_desafio_validacao_rapida');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};