
class LayerProtected extends Error {

    constructor(message) {
        super(message);
        this.name = 'LayerProtected';
        this.message = message;
    }

}

module.exports = LayerProtected;
