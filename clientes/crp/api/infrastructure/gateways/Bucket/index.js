const BucketConfig = require('./config');
const WipController = require('./Controller/WipController');
const VaultController = require('./Controller/VaultController');

class BucketGateway {

    #wipController = null;
    #vaultController = null;

    Wip() {
        if (!this.#wipController) {
            this.#wipController = new WipController();
        }
        return this.#wipController;
    }

    Vault() {
        if (!this.#vaultController) {
            this.#vaultController = new VaultController();
        }
        return this.#vaultController;
    }

    async healthCheck() {
        return BucketConfig.getInstance().healthCheck();
    }
}

module.exports = new BucketGateway();
