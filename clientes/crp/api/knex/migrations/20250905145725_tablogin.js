/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable('tab_login', function (table) {
        table.string('id', 39).notNullable().primary();
        table.text('token').notNullable();
        table.text('refresh_token').notNullable();
        table.text('session_id').notNullable();
        table.boolean('transito').notNullable();
        table.string('user_id', 255).notNullable()
            .references('id').inTable('tab_usuarios');
        table.string('desafio_id', 39).nullable()
            .references('id').inTable('tab_desafio_autenticacao');
        table.datetime('data_criacao').notNullable();
        table.datetime('data_atualizacao').notNullable();
        table.boolean('deletado').notNullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable('tab_login');
};
