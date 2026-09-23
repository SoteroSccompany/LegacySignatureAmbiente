/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
    return knex.schema.createTable('tab_usuarios', function (table) {
        table.string('id', 39).notNullable().primary();
        table.integer('role').notNullable();
        table.string('desafio_id', 39).nullable();
        table.boolean('dois_fatores').notNullable();
        table.boolean('email_verificado').notNullable();
        table.boolean('bloqueado').notNullable();
        table.text('bloqueado_descricao').nullable();
        table.string('email', 255).notNullable();
        table.string('senha', 255).notNullable();
        table.text('codigo_hash').nullable();
        table.jsonb('recuperacao').nullable();
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
    return knex.schema.dropTable('tab_usuarios');
};
