const BaseDispatcher = require("..");

class MessageDispatcher extends BaseDispatcher {

    #messageBroker;
    #items;
    cont = 0;

    constructor(messageBroker, items) {
        super();
        this.#messageBroker = messageBroker;
        this.#items = items || [];
    }


    addItem(item) {
        this.#items.push(item);
    }

    getItems() {
        return this.#items;
    }

    // async dispatch() {
    //     for await (const item of this.#items) {
    //         await this.#messageBroker.publishMessage(item);
    //         this.cont++
    //     }
    // }

    async dispatch({ delayBetweenMs = 1 } = {}) {
        for await (const item of this.#items) {
            await this.#messageBroker.publishMessage(item);
            this.cont++;
            if (delayBetweenMs > 0) {
                await new Promise((r) => setTimeout(r, delayBetweenMs));
            }
        }
    }
}



module.exports = MessageDispatcher;