/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

const tableName = 'tab_broker';
//Aqui vai apenas adiiciionar o campo empreendiimento_id para busca na api
exports.up = async function (knex) {


    const haveColumn = await knex.schema.hasColumn(tableName, 'meta_dados');

    if (haveColumn) {
        await knex.schema.table(tableName, function (table) {
            table.dropColumn('meta_dados');
        });
    }


    return knex.schema.table(tableName, function (table) {
        table.jsonb('meta_dados', 255).after('key');
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.table(tableName, function (table) {
        table.dropColumn('meta_dados');
    });

};
