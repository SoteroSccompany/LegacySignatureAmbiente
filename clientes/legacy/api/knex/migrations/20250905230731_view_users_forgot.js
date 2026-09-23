/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    return await knex.schema.raw(`
        CREATE OR REPLACE VIEW vw_user_forgot as 
            SELECT 
            f.id, 
            u.email as user_email,
            f.token, 
            f.data_criacao,
            f.data_atualizacao,
            f.deletado

            FROM tab_perdeu_senha f 
            INNER JOIN tab_usuarios u ON f.user_id = u.id;
        `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    return await knex.schema.raw(`DROP VIEW IF EXISTS vw_user_forgot;`);
};
