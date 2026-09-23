/**
 * Migration Knex: Eventos do sistema (e-mail, notificação, etc.)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_evento';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();

        table.string('tipo', 120).notNullable();
        table.string('status', 64).notNullable();

        table.string('solicitacao_id', 39).nullable()
            .references('id')
            .inTable('tab_solicitacao_documento');

        table.string('documento_id', 39).notNullable()
            .references('id')
            .inTable('tab_documentos');

        table.string('signatario_id', 39).nullable()
            .references('id')
            .inTable('tab_signatarios');

        table.string('origem_tipo', 64).notNullable();
        table.string('origem_id', 39).notNullable();

        table.string('destinatario_user_id', 39).nullable()
            .references('id')
            .inTable('tab_usuarios');

        table.string('canal', 64).notNullable();
        table.string('titulo', 255).notNullable();
        table.text('mensagem').notNullable();

        table.json('meta_dados').nullable();

        table.timestamp('criado_em', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.timestamp('atualizado_em', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.boolean('deletado').notNullable().defaultTo(false);

        table.index(['solicitacao_id', 'criado_em'], 'idx_evento_solicitacao_criado');
        table.index(['documento_id', 'tipo'], 'idx_evento_documento_tipo');
        table.index(['destinatario_user_id', 'status'], 'idx_evento_destinatario_status');
        table.index(['signatario_id', 'tipo'], 'idx_evento_signatario_tipo');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};
