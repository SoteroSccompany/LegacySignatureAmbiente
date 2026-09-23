/**
 * Migration Knex: Alertas ao usuário (ex.: falha de envio de convite)
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_alerta_usuario';

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();

        table.string('user_id', 39).notNullable()
            .references('id')
            .inTable('tab_usuarios');

        table.string('tipo', 120).notNullable();
        table.string('titulo', 255).notNullable();
        table.text('mensagem').notNullable();

        table.string('referencia_tipo', 64).nullable();
        table.string('referencia_id', 39).nullable();

        table.json('meta_dados').nullable();

        table.boolean('lido').notNullable().defaultTo(false);
        table.timestamp('criado_em', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.boolean('deletado').notNullable().defaultTo(false);

        table.index(['user_id', 'lido', 'criado_em'], 'idx_alerta_usuario_inbox');
        table.index(['user_id', 'tipo'], 'idx_alerta_usuario_tipo');
        table.index(['referencia_tipo', 'referencia_id'], 'idx_alerta_usuario_referencia');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};
