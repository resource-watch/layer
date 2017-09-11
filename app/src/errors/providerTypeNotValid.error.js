
class ProviderTypeNotValid extends Error {

    constructor(message) {
        super(message);
        this.name = 'ProviderTypeNotValid';
        this.message = message;
    }

}

module.exports = ProviderTypeNotValid;
