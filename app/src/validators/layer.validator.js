const logger = require('logger');
const LayerNotValid = require('errors/layerNotValid.error');
const { PROVIDERS } = require('app.constants');
const { URL } = require('url');

class LayerValidator {

    static getUser(ctx) {
        return { ...(ctx.request.query.loggedUser ? JSON.parse(ctx.request.query.loggedUser) : {}), ...ctx.request.body.loggedUser };
    }

    static isString(property) {
        if (typeof property === 'string' && property.length >= 0) {
            return true;
        }
        return false;
    }

    static notEmptyString(property) {
        if (typeof property === 'string' && property.length > 0) {
            return true;
        }
        return false;
    }

    static validUrl(property) {
        try {
            if (typeof property === 'string' && new URL(property)) {
                return true;
            }
        } catch (err) {
            return false;
        }
        return false;
    }

    static isArray(property) {
        if (property instanceof Array) {
            return true;
        }
        return false;
    }

    static notEmptyArray(property) {
        if (property instanceof Array && property.length > 0) {
            return true;
        }
        return false;
    }

    static isObject(property) {
        if (property instanceof Object && property.length === undefined) {
            return true;
        }
        return false;
    }

    static checkProvider(provider) {
        if (Object.keys(PROVIDERS).indexOf(provider) >= 0) {
            return true;
        }
        return false;
    }

    static checkType(type, koaObj = {}) {
        if (Object.keys(PROVIDERS).indexOf(koaObj.request.body.provider) >= 0 && PROVIDERS[koaObj.request.body.provider].type.indexOf(type) >= 0) {
            return true;
        }
        return false;
    }

    static errorMessage(property, koaObj = {}) {
        let errorMessage = 'validation error';

        switch (property) {

            case 'provider':
                errorMessage = `must be valid [${Object.keys(PROVIDERS).reduce((acc, el) => `${acc}, ${el}`)}]`;
                break;
            case 'type':
                if (PROVIDERS[koaObj.request.body.provider]) {
                    errorMessage = `must be valid [${PROVIDERS[koaObj.request.body.provider].type.reduce((acc, el) => `${acc}, ${el}`)}]`;
                } else {
                    errorMessage = `there is no type for that provider`;
                }
                break;
            default:
            // do nothing

        }
        return errorMessage;
    }

    static async validateFindById(koaObj) {
        logger.info('[LayerValidator] Validating find by id body');
        koaObj.checkBody('env')
            .optional()
            .notBlank()
            .check((v) => LayerValidator.isString(v), 'must be a string');
        koaObj.checkBody('ids')
            .check((v) => LayerValidator.isArray(v), 'must be an array')
            .check((ids) => ids.length === 0 || ids.some((id) => LayerValidator.isString(id)), 'must be an array of strings');

        logger.debug(koaObj.errors);
        if (koaObj.errors) {
            logger.error('Error validating find by id body');
            throw new LayerNotValid(koaObj.errors);
        }
        return true;
    }

    static async validateCreation(koaObj) {
        logger.info('Validating Layer Creation');
        koaObj.checkBody('name').notEmpty().check((name) => LayerValidator.notEmptyString(name), 'can not be empty');
        koaObj.checkBody('application').notEmpty().check((application) => LayerValidator.notEmptyArray(application), 'must be a non-empty array');
        koaObj.checkBody('description').optional().check((description) => LayerValidator.isString(description), 'must be a string');
        koaObj.checkBody('iso').optional().check((iso) => LayerValidator.isArray(iso), 'must be an array');
        // connectorType
        koaObj.checkBody('provider').optional()
            .check((provider) => LayerValidator.isString(provider), 'must be a string')
            .toLow();
        // provider
        koaObj.checkBody('type').optional()
            .check((type) => LayerValidator.isString(type, koaObj), 'must be a string')
            .toLow();
        // env
        koaObj.checkBody('env').optional()
            .toLow()
            .check((type) => LayerValidator.isString(type, koaObj), 'must be a string');
        // connectorUrl
        koaObj.checkBody('default').optional().toBoolean();
        koaObj.checkBody('published').optional().toBoolean();
        koaObj.checkBody('thumbnailUrl')
            .optional()
            .check((v) => LayerValidator.isString(v), 'must be a string');
        koaObj.checkBody('layerConfig').optional().check((layerConfig) => LayerValidator.isObject(layerConfig), 'must be an object');
        koaObj.checkBody('legendConfig').optional().check((legendConfig) => LayerValidator.isObject(legendConfig), 'must be an object');
        koaObj.checkBody('interactionConfig').optional().check((interactionConfig) => LayerValidator.isObject(interactionConfig), 'must be an object');
        koaObj.checkBody('applicationConfig').optional().check((applicationConfig) => LayerValidator.isObject(applicationConfig), 'must be an object');
        koaObj.checkBody('staticImageConfig').optional().check((staticImageConfig) => LayerValidator.isObject(staticImageConfig), 'must be an object');
        if (koaObj.errors) {
            logger.info('Error validating dataset creation');
            throw new LayerNotValid(koaObj.errors);
        }
        return true;
    }

    static async validateUpdate(koaObj) {
        logger.info('Validating Layer Update');
        koaObj.checkBody('name').optional().check((name) => LayerValidator.notEmptyString(name), 'can not be empty');
        koaObj.checkBody('application').optional().check((application) => LayerValidator.notEmptyArray(application), 'must be a non-empty array');
        koaObj.checkBody('description').optional().check((description) => LayerValidator.isString(description), 'must be a string');
        koaObj.checkBody('iso').optional().check((iso) => LayerValidator.isArray(iso), 'must be an array');
        // connectorType
        koaObj.checkBody('provider').optional()
            .check((provider) => LayerValidator.isString(provider), 'must be a string').toLow();
        // provider
        koaObj.checkBody('type').optional()
            .check((type) => LayerValidator.isString(type, koaObj), 'must be a string').toLow();
        // env
        koaObj.checkBody('env').optional()
            .check((type) => LayerValidator.isString(type, koaObj), 'must be a string').toLow();
        // connectorUrl
        koaObj.checkBody('default').optional().toBoolean();
        koaObj.checkBody('published').optional().toBoolean();
        koaObj.checkBody('layerConfig').optional().check((layerConfig) => LayerValidator.isObject(layerConfig), 'must be an object');
        koaObj.checkBody('legendConfig').optional().check((legendConfig) => LayerValidator.isObject(legendConfig), 'must be an object');
        koaObj.checkBody('interactionConfig').optional().check((interactionConfig) => LayerValidator.isObject(interactionConfig), 'must be an object');
        koaObj.checkBody('applicationConfig').optional().check((applicationConfig) => LayerValidator.isObject(applicationConfig), 'must be an object');
        koaObj.checkBody('staticImageConfig').optional().check((staticImageConfig) => LayerValidator.isObject(staticImageConfig), 'must be an object');
        if (koaObj.errors) {
            logger.info('Error validating dataset creation');
            throw new LayerNotValid(koaObj.errors);
        }
        return true;
    }

}

module.exports = LayerValidator;
