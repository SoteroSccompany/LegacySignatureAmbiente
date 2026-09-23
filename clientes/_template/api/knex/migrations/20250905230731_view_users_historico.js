/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    return await knex.schema.raw(`
        CREATE OR REPLACE VIEW view_historico_users as 
        SELECT 
        h.id,
        u.id as user_id,
        u.email as user_email,
        h.objeto_id,
        h.transformacao,
        h.dado_atual,
        h.dado_antigo,
        h.data_atualizacao,
        h.data_criacao,
        h.deletado
        FROM tab_historico h

        INNER JOIN tab_usuarios u ON h.user_id = u.id;
        `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.raw(`DROP VIEW IF EXISTS view_historico_users;`);
};
