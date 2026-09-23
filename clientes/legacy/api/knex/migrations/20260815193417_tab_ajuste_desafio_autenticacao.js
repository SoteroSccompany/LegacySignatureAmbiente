/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */




const tableName = 'tab_desafio_autenticacao'
exports.up = function (knex) {

    return knex.schema.table(tableName, function (table) {
        table.text('desafio_hash', 39).nullable().after('tipo_desafio');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.table(tableName, function (table) {
        table.dropColumn('desafio_hash');
    })

};
