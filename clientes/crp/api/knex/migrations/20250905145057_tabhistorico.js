/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable('tab_historico', function (table) {
        table.string('id', 39).notNullable().primary();
        table.string('objeto_id', 39).notNullable();
        table.integer('transformacao').notNullable();
        table.text('dado_atual').nullable();
        table.text('dado_antigo').nullable();
        table.string('user_id', 39).notNullable()
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
    return knex.schema.dropTable('tab_historico');
};
