/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable('tab_requests', function (table) {
        table.string('id', 39).notNullable().primary();
        table.string('method').notNullable();
        table.string('endpoint').notNullable();
        table.string('ip', 100).notNullable();
        table.text('body').nullable();
        table.text('query').nullable();
        table.text('params').nullable();
        table.text('files').nullable();
        table.text('headers').notNullable();
        table.integer('status_code').notNullable();
        table.integer('duration_ms').notNullable();
        table.string('user_id', 39).nullable()
            .references('id').inTable('tab_usuarios');
        table.datetime('data_atualizacao').notNullable();
        table.datetime('data_criacao').notNullable();
        table.boolean('deletado').notNullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable('tab_requests');
};
