const _ = require('lodash');

class CheckObjects {

    static isSameObject(obj1, obj2) {
        const IGNORED = new Set(['data_criacao', 'data_atualizacao', 'deletado']);

        // Sanitize profundo: remove chaves ignoradas e normaliza objetos de classe para plain object
        const sanitize = (val) => {
            if (val == null) return val; // null/undefined

            // Date: mantém como Date para o customizer comparar por timestamp
            if (_.isDate(val)) return new Date(val.getTime());

            // Array
            if (Array.isArray(val)) {
                return val.map(sanitize);
            }

            // Objetos (inclui instâncias de classe) → toPlainObject pega apenas props próprias
            if (typeof val === 'object') {
                const plain = _.toPlainObject(val);
                return _.transform(plain, (acc, v, k) => {
                    if (IGNORED.has(k)) return; // drop
                    acc[k] = sanitize(v);
                }, {});
            }

            // Primitivos
            return val;
        };

        const a = sanitize(obj1);
        const b = sanitize(obj2);

        // Customizer da igualdade:
        const customizer = (va, vb) => {
            // Date vs Date
            if (_.isDate(va) && _.isDate(vb)) {
                return va.getTime() === vb.getTime();
            }

            // número vs string numérica
            const isNumLike = (x) => (typeof x === 'number' && !Number.isNaN(x)) ||
                (typeof x === 'string' && x.trim() !== '' && !Number.isNaN(Number(x)));
            if (isNumLike(va) && isNumLike(vb)) {
                return Number(va) === Number(vb);
            }

            // boolean vs 0/1
            const isBoolLike = (x) =>
                typeof x === 'boolean' ||
                (typeof x === 'number' && (x === 0 || x === 1)) ||
                (typeof x === 'string' && (x === '0' || x === '1'));
            if (isBoolLike(va) && isBoolLike(vb)) {
                const toBool = (x) => typeof x === 'boolean' ? x : Number(x) === 1;
                return toBool(va) === toBool(vb);
            }

            // default → deixa o lodash decidir
            return undefined;
        };

        return _.isEqualWith(a, b, customizer);
    }

}

module.exports = CheckObjects;
