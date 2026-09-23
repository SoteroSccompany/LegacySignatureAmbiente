class Format {

    static MakeCepMask(cepNumber) {
        return cepNumber.replace(/^(\d{5})(\d{3})$/, "$1-$2");
    }

    static FormatTelefone(telephoneNumber) {
        const cleaned = ('' + telephoneNumber).replace(/\D/g, '');
        const match = cleaned.match(/^(\d{2})(\d{4,5})(\d{4})$/);
        if (match) {
            return `(${match[1]}) ${match[2]}-${match[3]}`;
        }
        return null;
    }

    static FormatCNPJ(cnpjNumber) {
        const cleaned = ('' + cnpjNumber).replace(/\D/g, '');
        const match = cleaned.match(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/);
        if (match) {
            return `${match[1]}.${match[2]}.${match[3]}/${match[4]}-${match[5]}`;
        }
        return null;
    }


    static DinheiroEmReais(amount) {
        const realAmount = amount / 100;
        return realAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }


    static DinheiroPorExtenso(amount) {
        // Converte centavos para reais
        const reais = Math.floor(amount / 100);
        const centavos = amount % 100;

        const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
        const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
        const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
        const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

        const converterGrupo = (num) => {
            if (num === 0) return '';

            let resultado = '';
            const c = Math.floor(num / 100);
            const d = Math.floor((num % 100) / 10);
            const u = num % 10;

            // Centenas
            if (c > 0) {
                if (num === 100) {
                    resultado = 'cem';
                } else {
                    resultado = centenas[c];
                }
            }

            // Dezenas e Unidades
            if (d === 1) {
                // Números de 10 a 19
                if (resultado) resultado += ' e ';
                resultado += especiais[u];
            } else {
                // Dezenas
                if (d >= 2) {
                    if (resultado) resultado += ' e ';
                    resultado += dezenas[d];
                }
                // Unidades
                if (u > 0) {
                    if (resultado) resultado += ' e ';
                    resultado += unidades[u];
                }
            }

            return resultado;
        };

        if (amount === 0) return 'Zero reais';

        let resultado = '';

        // Se tiver reais
        if (reais > 0) {
            // Milhões
            const milhoes = Math.floor(reais / 1000000);
            if (milhoes > 0) {
                if (milhoes === 1) {
                    resultado = 'um milhão';
                } else {
                    resultado = converterGrupo(milhoes) + ' milhões';
                }
            }

            // Milhares
            const milhares = Math.floor((reais % 1000000) / 1000);
            if (milhares > 0) {
                if (resultado) resultado += ' e ';
                if (milhares === 1) {
                    resultado += 'um mil';
                } else {
                    resultado += converterGrupo(milhares) + ' mil';
                }
            }

            // Centenas, dezenas e unidades
            const resto = reais % 1000;
            if (resto > 0) {
                if (resultado) {
                    if (resto < 100 && reais >= 1000) {
                        resultado += ' e ';
                    } else if (resultado) {
                        resultado += ' e ';
                    }
                }
                resultado += converterGrupo(resto);
            }

            // Adiciona "reais"
            if (reais === 1) {
                resultado += ' real';
            } else {
                resultado += ' reais';
            }
        }

        // Centavos
        if (centavos > 0) {
            if (resultado) {
                resultado += ' e ';
            }
            resultado += converterGrupo(centavos);
            if (centavos === 1) {
                resultado += ' centavo';
            } else {
                resultado += ' centavos';
            }
        }

        // Capitaliza a primeira letra
        return resultado.charAt(0).toUpperCase() + resultado.slice(1);
    }


}


module.exports = Format;