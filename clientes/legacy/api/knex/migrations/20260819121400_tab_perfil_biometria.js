/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */


const tableName = "tab_perfil_biometria";

exports.up = function (knex) {
    return knex.schema.createTable(tableName, function (table) {
        table.string('id', 39).primary();
        table.text('rosto_embeddign').nullable();
        table.text('bucket_wip_path').nullable();
        table.string('termo_id', 39).notNullable()
            .references('id')
            .inTable('tab_aceite_termo_responsabilidade');
        table.string('perfil_id', 39).notNullable()
            .references('id').inTable('tab_perfil_usuario');
        table.string('desafio_id', 39).notNullable()
            .references('id').inTable('tab_desafio_autenticacao');
        table.string('aprovado_por', 39).nullable()
            .references('id').inTable('tab_usuarios');
        table.dateTime('aprovado_em').nullable();
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
