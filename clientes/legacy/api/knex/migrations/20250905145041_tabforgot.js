/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable('tab_perdeu_senha', function (table) {
        table.string('id', 39).notNullable().primary();
        table.string('user_id', 39).notNullable()
            .references('id').inTable('tab_usuarios');
        table.text('token').notNullable();
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
    return knex.schema.dropTable('tab_perdeu_senha');
};
