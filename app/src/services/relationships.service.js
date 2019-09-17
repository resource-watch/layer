const logger = require('logger');
const ctRegisterMicroservice = require('sd-ct-register-microservice-node');


class RelationshipsService {

    static async getRelationships(layers, includes, user) {
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
                    const userData = await ctRegisterMicroservice.requestToMicroservice({
                        uri: `/auth/user/find-by-ids`,
                        method: 'POST',
                        json: true,
                        body: {
                            ids: [layers[i].userId]
                        },
                        version: false
                    });

                    if (!userData.data[0] || !userData.data[0].name || !userData.data[0].email) {
                        logger.warn(`Tried to use find-by-ids to load info for user with id ${layers[i].userId} but the following was returned: ${JSON.stringify(user)}`);
                    } else {
                        layers[i].user = {
                            name: userData.data[0].name,
                            email: userData.data[0].email
                        };
                        if (user && user.role === 'ADMIN') {
                            layers[i].user.role = userData.data[0].role;
                        }

                        logger.info('Layers including user data', layers.map(el => el.toObject()));
                    }
                }
            } catch (err) {
                logger.error(err);
            }
        }
        return layers;
    }

    static async getCollections(ids, userId) {
        try {
            const result = await ctRegisterMicroservice.requestToMicroservice({
                uri: `/collection/find-by-ids`,
                method: 'POST',
                json: true,
                body: {
                    ids,
                    userId
                }
            });
            logger.debug(result);
            return result.data.map(col => col.attributes.resources.filter(res => res.type === 'layer')).reduce((pre, cur) => pre.concat(cur)).map(el => el.id);
        } catch (e) {
            throw new Error(e);
        }
    }

    static async getFavorites(app, userId) {
        try {
            const result = await ctRegisterMicroservice.requestToMicroservice({
                uri: `/favourite/find-by-user`,
                method: 'POST',
                json: true,
                body: {
                    app,
                    userId
                }
            });
            logger.debug(result);
            return result.data.filter(fav => fav.attributes.resourceType === 'layer').map(el => el.attributes.resourceId);
        } catch (e) {
            throw new Error(e);
        }
    }

}

module.exports = RelationshipsService;
