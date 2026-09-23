const moment = require('moment');
const validator = require('cpf-cnpj-validator');

class Validator {


    static DataValidate({ data }) {
        try {
            if (!data) return false;
            if (!moment(data, 'YYYY-MM-DD HH:mm:ss').isValid()) return false;
            return true;
        } catch (err) {
            return false;
        }
    }

    static DataIsBeforeNow({ data }) { //Retorna true, a data está no passado - data do parametro
        try {
            if (!data) return false
            if (!moment(data, 'YYYY-MM-DD HH:mm').isValid()) return false;
            if (!moment(data).isBefore(moment())) return false
            return true;
        } catch (err) {
            return false;
        }
    }

    static DataIsAfterNow({ data }) { //Retorna true a data está no futuro - data do parametro
        try {
            if (!data) return false
            if (!moment(data, 'YYYY-MM-DD HH:mm').isValid()) return false;
            if (!moment(data).isAfter(moment())) return false
            return true;
        } catch (err) {
            return false;
        }
    }

    static DatasIsSames(data1, data2) { //Retorna true a data está no futuro - data do parametro
        try {
            if (!moment(data1, 'YYYY-MM-DD HH:mm:ss').isValid()) return false;
            if (!moment(data2, 'YYYY-MM-DD HH:mm:ss').isValid()) return false;
            if (!moment(data1).isSame(moment(data2))) return false
            return true;
        } catch (err) {
            return false;
        }
    }

    static EmailValidate({ email }) {
        const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!regex.test(email)) return false
        return true;
    }

    static CpfValidate({ cpf }) {
        if (!cpf) return false;
        if (cpf.length > 14) return false;
        let cpfOnlyNumbers = cpf.replace(/\D/g, '');
        return validator.cpf.isValid(cpfOnlyNumbers);
    }

    static CnpjValidate({ cnpj }) {
        if (!cnpj) return false;
        if (cnpj.length > 18) return false;
        let cnpjOnlyNumbers = cnpj.replace(/\D/g, '');
        return validator.cnpj.isValid(cnpjOnlyNumbers);
    }


    static TelefoneValidate({ telefone }) {
        const telefoneClean = telefone.replace(/\D/g, '').replace(/^55/, '');
        const regex = /^\d{10,11}$/; // Aceita 10 ou 11 dígitos
        if (!regex.test(telefoneClean)) return false
        return true;
    }

}


module.exports = Validator