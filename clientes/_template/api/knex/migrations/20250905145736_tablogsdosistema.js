/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable('tab_logs_do_sistema', function (table) {
        table.string('id', 39).notNullable().primary();
        table.text('descricaoDoErro').notNullable();
        table.string('linhaDoErro', 255).notNullable();
        table.string('nomeDoArquivo', 255).notNullable();
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
    return knex.schema.dropTable('tab_logs_do_sistema');
};
