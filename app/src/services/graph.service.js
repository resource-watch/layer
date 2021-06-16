const logger = require('logger');
const { RWAPIMicroservice } = require('rw-api-microservice-node');

class GraphService {

    static async createLayer(idDataset, id) {
        logger.debug('[GraphService]: Creating dataset in graph');
        try {
            return await RWAPIMicroservice.requestToMicroservice({
                uri: `/v1/graph/layer/${idDataset}/${id}`,
                method: 'POST',
                json: true
            });
        } catch (e) {
            throw new Error(e);
        }
    }

    static async deleteLayer(id) {
        logger.debug('[GraphService]: Deleting layer in graph');
        try {
            return await RWAPIMicroservice.requestToMicroservice({
                uri: `/v1/graph/layer/${id}`,
                method: 'DELETE',
                json: true
            });
        } catch (e) {
            throw new Error(e);
        }
    }

    static async associateTags(id, vocabularies) {
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
                json: true,
                body: {
                    tags
                }
            });
        } catch (e) {
            logger.error(e);
            throw new Error(e);
        }
    }

}

module.exports = GraphService;
