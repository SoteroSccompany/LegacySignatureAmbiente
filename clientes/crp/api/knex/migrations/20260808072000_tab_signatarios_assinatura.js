/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const tableName = 'tab_signatarios';

exports.up = function (knex) {
    return knex.schema.alterTable(tableName, function (table) {
        table.string('modo_visual', 32).nullable();
        table.text('estampa_object_name').nullable();
        table.json('estampa_texto_json').nullable();
        table.timestamp('assinado_em', { useTz: true }).nullable();
        table.string('hash_pdf_apos', 64).nullable();
        table.string('desafio_acesso_id', 39).nullable()
            .references('id').inTable('tab_desafio_autenticacao');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.alterTable(tableName, function (table) {
        table.dropForeign(['desafio_acesso_id']);
        table.dropColumn('desafio_acesso_id');
        table.dropColumn('hash_pdf_apos');
        table.dropColumn('assinado_em');
        table.dropColumn('estampa_texto_json');
        table.dropColumn('estampa_object_name');
        table.dropColumn('modo_visual');
    });
};
