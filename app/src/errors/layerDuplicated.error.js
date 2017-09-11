
class LayerDuplicated extends Error {

    constructor(message) {
        super(message);
        this.name = 'LayerDuplicated';
        this.message = message;
    }

}

module.exports = LayerDuplicated;
