const logger = require('logger');
const { RWAPIMicroservice } = require('rw-api-microservice-node');

const serializeObjToQuery = (obj) => Object.keys(obj).reduce((a, k) => {
    a.push(`${k}=${encodeURIComponent(obj[k])}`);
    return a;
}, []).join('&');

class RelationshipsService {

    /**
     * - Clones the query object
     * - Strips a few things that should not be passed over to other MSs
     * - Encodes query into a URL param format
     *
     * @param rawQuery
     * @returns {string}
     */
    static prepareAndFormatQuery(rawQuery) {
        const query = { ...rawQuery };

        delete query.includes;
        return serializeObjToQuery(query);
    }

    static async getRelationships(layers, includes, user, query = {}) {
        logger.info(`Getting relationships of layers: ${layers}`);
        // eslint-disable-next-line no-plusplus
        for (let i = 0; i < layers.length; i++) {
            try {
                if (includes.indexOf('vocabulary') > -1) {

                    let uriQuery = RelationshipsService.prepareAndFormatQuery(query);
                    if (uriQuery.length > 0) {
                        uriQuery = `?${uriQuery}`;
                    }
                    // eslint-disable-next-line no-await-in-loop
                    const vocabularies = await RWAPIMicroservice.requestToMicroservice({
                        uri: `/v1/dataset/${layers[i].dataset}/layer/${layers[i]._id}/vocabulary${uriQuery}`,
                        method: 'GET',
                        json: true
                    });
                    layers[i].vocabulary = vocabularies.data;
                }
                if (includes.indexOf('user') > -1) {
                    // eslint-disable-next-line no-await-in-loop
                    const userData = await RWAPIMicroservice.requestToMicroservice({
                        uri: `/auth/user/find-by-ids`,
                        method: 'POST',
                        json: true,
                        body: {
                            ids: [layers[i].userId]
                        },
                    });

                    if (!userData.data[0]) {
                        logger.warn(`Tried to use find-by-ids to load info for user with id ${layers[i].userId} but the following was returned: ${JSON.stringify(user)}`);
                    } else {
                        layers[i].user = {};
                        if (userData.data[0].name) layers[i].user.name = userData.data[0].name;
                        if (userData.data[0].email) layers[i].user.email = userData.data[0].email;
                        if (user && user.role === 'ADMIN') layers[i].user.role = userData.data[0].role;
                        logger.info('Layers including user data', layers.map((el) => el.toObject()));
                    }
                }
            } catch (err) {
                logger.error(err);
            }
        }
        return layers;
    }

    static async getUsersInfoByIds(ids) {
        logger.debug('Fetching all users\' information');
        const body = await RWAPIMicroservice.requestToMicroservice({
            uri: `/auth/user/find-by-ids`,
            method: 'POST',
            json: true,
            body: { ids }
        });

        return body.data;
    }

    static async getUsersWithRole(role) {
        const body = await RWAPIMicroservice.requestToMicroservice({
            uri: `/auth/user/ids/${role}`,
            method: 'GET',
            json: true,
        });
        logger.debug('User ids', body.data);
        return body.data;
    }

    static async getCollections(ids, userId) {
        try {
            const result = await RWAPIMicroservice.requestToMicroservice({
                uri: `/v1/collection/find-by-ids`,
                method: 'POST',
                json: true,
                body: {
                    ids,
                    userId
                }
            });
            logger.debug(result);
            return result.data.map((col) => col.attributes.resources.filter((res) => res.type === 'layer')).reduce((pre, cur) => pre.concat(cur)).map((el) => el.id);
        } catch (e) {
            throw new Error(e);
        }
    }

    static async getFavorites(app, userId) {
        try {
            const result = await RWAPIMicroservice.requestToMicroservice({
                uri: `/v1/favourite/find-by-user`,
                method: 'POST',
                json: true,
                body: {
                    app,
                    userId
                }
            });
            logger.debug(result);
            return result.data.filter((fav) => fav.attributes.resourceType === 'layer').map((el) => el.attributes.resourceId);
        } catch (e) {
            throw new Error(e);
        }
    }

}

module.exports = RelationshipsService;
