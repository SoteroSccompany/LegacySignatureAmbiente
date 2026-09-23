const ServerSignConfig = require('./config');
const CarimboController = require('./Controller/CarimboController');

class ServerSignGateway {

    #carimboController = null;

    Carimbo() {
        if (!this.#carimboController) {
            this.#carimboController = new CarimboController();
        }
        return this.#carimboController;
    }

    get obrigatorio() {
        return ServerSignConfig.getInstance().obrigatorio;
    }

    async healthCheck() {
        return ServerSignConfig.getInstance().healthCheck();
    }
}

module.exports = new ServerSignGateway();
