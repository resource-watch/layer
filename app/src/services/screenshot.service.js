const logger = require('logger');
const { RWAPIMicroservice } = require('rw-api-microservice-node');

class ScreenshotService {

    static async takeLayerScreenshot(id, apiKey) {
        logger.debug('[ScreenshotService]: Taking screenshot');
        try {
            return await RWAPIMicroservice.requestToMicroservice({
                uri: `/v1/webshot/layer/${id}/thumbnail`,
                method: 'POST',
                headers: {
                    'x-api-key': apiKey
                }
            });
        } catch (e) {
            logger.error(`[ScreenshotService]: Error taking screenshot: ${e}`);
            throw new Error(e);
        }
    }

}

module.exports = ScreenshotService;
