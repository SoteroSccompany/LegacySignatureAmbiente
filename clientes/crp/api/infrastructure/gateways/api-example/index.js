const EmpresasController = require("./Controller/EmpresaController");
const EstoqueController = require("./Controller/EstoqueController");
const ObrasController = require("./Controller/ObrasController");
const VendasController = require("./Controller/VendasController");
const RecebidosController = require("./Controller/RecebidosController");
const AReceberController = require("./Controller/AReceberController");
const MovimentacaoFinanceira = require("./Controller/MovimentacaoFinanceiraController");



class APIUAU_GATEWAY {


    #obrasController = null;
    #empresaController = null;
    #estoqueController = null;
    #vendasController = null;
    #recebidosController = null;
    #a_receberController = null;
    #movimentecaoFinanceiraController = null;

    Empreendimento() {
        if (!this.#empresaController) {
            this.#empresaController = new EmpresasController();
        }
        return this.#empresaController;
    }

    Obras() {
        if (!this.#obrasController) {
            this.#obrasController = new ObrasController();
        }
        return this.#obrasController;
    }

    Estoque() {
        if (!this.#estoqueController) {
            this.#estoqueController = new EstoqueController();
        }
        return this.#estoqueController;
    }

    Vendas() {
        if (!this.#vendasController) {
            this.#vendasController = new VendasController();
        }
        return this.#vendasController;
    }


    Recebidos() {
        if (!this.#recebidosController) {
            this.#recebidosController = new RecebidosController();
        }
        return this.#recebidosController; 0
    }

    AReceber() {
        if (!this.#a_receberController) {
            this.#a_receberController = new AReceberController();
        }
        return this.#a_receberController;
    }

    MovimentacaoFinanceira() {
        if (!this.#movimentecaoFinanceiraController) {
            this.#movimentecaoFinanceiraController = new MovimentacaoFinanceira();
        }
        return this.#movimentecaoFinanceiraController;
    }

}

module.exports = new APIUAU_GATEWAY();