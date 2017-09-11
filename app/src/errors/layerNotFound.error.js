
class LayerNotFound extends Error {

    constructor(message) {
        super(message);
        this.name = 'LayerNotFound';
        this.message = message;
    }

}

module.exports = LayerNotFound;
