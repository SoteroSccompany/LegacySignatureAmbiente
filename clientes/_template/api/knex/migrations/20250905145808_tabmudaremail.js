/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable('tab_mudar_email', function (table) {
        table.string('id', 39).notNullable().primary();
        table.string('antigoEmail', 255).notNullable();
        table.string('novoEmail', 255).notNullable();
        table.string('user_id', 39).notNullable()
            .references('id').inTable('tab_usuarios');
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
    return knex.schema.dropTable('tab_mudar_email');
};
