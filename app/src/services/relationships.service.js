const logger = require('logger');
const ctRegisterMicroservice = require('ct-register-microservice-node');


class RelationshipsService {

    static async getRelationships(layers, includes) {
        logger.info(`Getting relationships of layers: ${layers}`);
        for (let i = 0; i < layers.length; i++) {
            try {
                if (includes.indexOf('vocabulary') > -1) {
                    const vocabularies = await ctRegisterMicroservice.requestToMicroservice({
                        uri: `/dataset/${layers[i].dataset}/layer/${layers[i]._id}/vocabulary`,
                        method: 'GET',
                        json: true
                    });
                    layers[i].vocabulary = vocabularies.data;
                }
                if (includes.indexOf('user') > -1) {
                    const user = await ctRegisterMicroservice.requestToMicroservice({
                        uri: `/auth/user/find-by-ids`,
                        method: 'POST',
                        json: true,
                        body: {
                            ids: [layers[i].userId]
                        },
                        version: false
                    });
                    layers[i].user = {
                        name: user.data[0].name,
                        email: user.data[0].email
                    };
                    logger.info('Layers', layers);
                }
            } catch (err) {
                logger.error(err);
            }
        }
        return layers;
    }

}

module.exports = RelationshipsService;
