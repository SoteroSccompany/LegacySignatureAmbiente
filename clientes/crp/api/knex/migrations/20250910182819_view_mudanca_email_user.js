/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {

    return await knex.schema.raw(`
        CREATE OR REPLACE VIEW view_mudanca_email_user as 
            SELECT 
            m.id, 
            u.email as user_email,
            m.antigoEmail, 
            m.novoEmail, 
            m.data_criacao,
            m.data_atualizacao,
            m.deletado

            FROM tab_mudar_email m 
            INNER JOIN tab_usuarios u ON m.user_id = u.id;
        `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
    return knex.schema.raw(`DROP VIEW IF EXISTS view_mudanca_email_user;`);

};
