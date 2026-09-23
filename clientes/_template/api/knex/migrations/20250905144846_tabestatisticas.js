/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable('tab_estatisticas', function (table) {
        table.string('id', 39).notNullable().primary();
        table.string('pagina', 300).notNullable();
        table.text('dataEstatisticas').notNullable();
        table.text('dataGrafico').nullable();
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
    return knex.schema.dropTable('tab_estatisticas');
};
