/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    return await knex.schema.raw(`
        CREATE OR REPLACE VIEW  view_request_users as 
        SELECT 
        r.id,
        u.email as user_email,
        r.method,
        r.endpoint,
        r.ip,
        r.body,
        r.query,
        r.params,
        r.headers,
        r.status_code,
        r.duration_ms,
        r.data_atualizacao,
        r.data_criacao,
        r.deletado
        FROM tab_requests r

        INNER JOIN tab_usuarios u ON r.user_id = u.id;
        `);

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
    return await knex.schema.raw(`DROP VIEW IF EXISTS view_request_users;`);
};
