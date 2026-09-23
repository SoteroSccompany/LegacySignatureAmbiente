/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */


const tableName = "tab_perfil_usuario";

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).primary();
        table.string('nome').notNullable();
        table.string('cpf').notNullable();
        table.string('cpf_bindex', 64).notNullable().index();
        table.string('telefone', 64).notNullable();
        table.integer('status').notNullable();
        table.integer('etapa').notNullable();
        table.string('dados_extra').nullable();
        table.string('user_id', 39).notNullable()
            .references('id').inTable('tab_usuarios');
        table.string('desafio_id', 39).nullable()
            .references('id').inTable('tab_desafio_autenticacao');
        table.dateTime('data_atualizacao').notNullable();
        table.dateTime('data_criacao').notNullable();
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
