const logger = require('logger');
const { RWAPIMicroservice } = require('rw-api-microservice-node');

class GraphService {

    static async createLayer(idDataset, id, apiKey) {
        logger.debug('[GraphService]: Creating dataset in graph');
        try {
            return await RWAPIMicroservice.requestToMicroservice({
                uri: `/v1/graph/layer/${idDataset}/${id}`,
                method: 'POST',
                headers: {
                    'x-api-key': apiKey
                }
            });
        } catch (e) {
            throw new Error(e);
        }
    }

    static async deleteLayer(id, apiKey) {
        logger.debug('[GraphService]: Deleting layer in graph');
        try {
            return await RWAPIMicroservice.requestToMicroservice({
                uri: `/v1/graph/layer/${id}`,
                method: 'DELETE',
                headers: {
                    'x-api-key': apiKey
                }
            });
        } catch (e) {
            throw new Error(e);
        }
    }

    static async associateTags(id, vocabularies, apiKey) {
        logger.debug('[GraphService]: Associating tags in graph');
        try {
            let tags = [];
            Object.keys(vocabularies).map((key) => {
                tags = tags.concat(vocabularies[key].tags);
                return null;
            });
            return await RWAPIMicroservice.requestToMicroservice({
                uri: `/v1/graph/layer/${id}/associate`,
                method: 'POST',
                body: {
                    tags
                },
                headers: {
                    'x-api-key': apiKey
                }
            });
        } catch (e) {
            logger.error(e);
            throw new Error(e);
        }
    }

}

module.exports = GraphService;
