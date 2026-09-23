/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = "tab_termo_responsabilidade";
exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).notNullable().primary();
        table.text('titulo_termo').notNullable();
        table.text('descricao_termo').notNullable();
        table.boolean('ativo').notNullable().defaultTo(true);
        table.string('tipo_termo', 100).notNullable();
        table.text('versao').notNullable();
        table.string('desafio_id', 39).notNullable()
            .references('id').inTable('tab_desafio_autenticacao');
        table.datetime('data_criacao', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.datetime('data_atualizacao', { useTz: true }).nullable();
        table.boolean('deletado').notNullable().defaultTo(false);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.dropTable(tableName);
};
