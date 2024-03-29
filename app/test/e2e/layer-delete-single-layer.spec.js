const nock = require('nock');
const Layer = require('models/layer.model');
const { expect } = require('chai');
const { getTestServer } = require('./utils/test-server');
const {
    ensureCorrectError, createMockDataset, createLayer, mockValidateRequestWithApiKeyAndUserToken,
    mockValidateRequestWithApiKey
} = require('./utils/helpers');
const { USERS } = require('./utils/test.constants');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

let requester;

const deleteLayer = async (role, layerId, apps = ['rw'], providedLayer) => {
    createMockDataset(layerId || '123');
    const layer = providedLayer || createLayer({ application: apps, dataset: layerId || '123', _id: layerId });
    await new Layer(layer).save();

    mockValidateRequestWithApiKeyAndUserToken({ user: role });

    return requester
        .delete(`/api/v1/dataset/123/layer/${layerId}`)
        .set('x-api-key', 'api-key-test')
        .set('Authorization', `Bearer abcd`)
        .send();
};

describe('Delete single layer by id', async () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('Deleting a single layer by id should return 404 "Dataset not found" error when the dataset doesn\'t exist', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .get(`/v1/dataset/321`)
            .reply(404, { errors: [{ status: 404, detail: 'Dataset with id \'321\' doesn\'t exist' }] });

        const datasetLayer = await requester
            .delete(`/api/v1/dataset/321/layer/123`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test');

        datasetLayer.status.should.equal(404);
        ensureCorrectError(datasetLayer.body, 'Dataset not found');
    });

    it('Deleting a single layer by id without being authenticated should return a 401 "Not authorized" error\'', async () => {
        mockValidateRequestWithApiKey({});
        const datasetLayer = await requester
            .delete(`/api/v1/dataset/123/layer`)
            .set('x-api-key', 'api-key-test');
        datasetLayer.status.should.equal(401);
        ensureCorrectError(datasetLayer.body, 'Unauthorized');
    });

    it('Deleting a single layer by id while being authenticated as USER should return a 403 "Forbidden" error', async () => {
        const datasetLayer = await deleteLayer(USERS.USER, '123');
        datasetLayer.status.should.equal(403);
        ensureCorrectError(datasetLayer.body, 'Forbidden');
    });

    it('Deleting a single layer by id while being authenticated as MANAGER that does not own the layer should return a 403 "Forbidden" error', async () => {
        const datasetLayer = await deleteLayer(USERS.MANAGER, '123');
        datasetLayer.status.should.equal(403);
        ensureCorrectError(datasetLayer.body, 'Forbidden');
    });

    it('Deleting a single layer by id while being authenticated as MANAGER that owns the layer should delete the specific layer in specific dataset (happy case)', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.MANAGER });

        createMockDataset('123');

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .delete('/v1/graph/layer/123')
            .once()
            .reply(200, {});

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .delete('/v1/layer/123/expire-cache')
            .once()
            .reply(200, {});

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .delete('/v1/dataset/123/layer/123/metadata')
            .once()
            .reply(200, {});

        const layer = createLayer({
            application: ['rw'], dataset: '123', _id: '123', userId: USERS.MANAGER.id
        });
        await new Layer(layer).save();

        const datasetLayer = await requester
            .delete(`/api/v1/dataset/123/layer/123`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send();

        datasetLayer.status.should.equal(200);
        datasetLayer.body.data.id.should.equal(layer._id);
        datasetLayer.body.data.type.should.equal('layer');
        const { attributes } = datasetLayer.body.data;

        delete layer._id;
        delete layer.status;

        layer.interactionConfig = attributes.interactionConfig;
        layer.createdAt = attributes.createdAt;
        layer.updatedAt = attributes.updatedAt;

        attributes.should.deep.equal(layer);

        const layers = await Layer.find({});
        expect(layers).to.be.length(0);
    });

    it('Deleting a single layer by id should return 404 "Layer with id X not found" error when the layer doesn\'t exist', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });

        createMockDataset('123');
        const layer = createLayer({ application: ['rw'], dataset: '123', _id: '321' });
        await new Layer(layer).save();

        const datasetLayer = await requester
            .delete(`/api/v1/dataset/123/layer/123`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send();

        datasetLayer.status.should.equal(404);
        ensureCorrectError(datasetLayer.body, 'Layer with id \'123\' doesn\'t exist');
    });

    it('Deleting a single layer by id should delete the specific layer in specific dataset (happy case)', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.ADMIN });

        const layer = createLayer({ application: ['rw'], dataset: '123', _id: '123' });
        createMockDataset('123');
        await new Layer(layer).save();

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .delete(`/v1/graph/layer/${layer.dataset}`)
            .once()
            .reply(200, {
                status: 200,
                data: []
            });

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .delete(`/v1/dataset/${layer.dataset}/layer/${layer._id}/metadata`)
            .once()
            .reply(200, {
                status: 200,
                data: []
            });

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .delete(`/v1/layer/${layer._id}/expire-cache`)
            .once()
            .reply(200, {
                status: 200,
                data: []
            });

        const datasetLayer = await requester
            .delete(`/api/v1/dataset/123/layer/123`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send();

        datasetLayer.status.should.equal(200);
        datasetLayer.body.data.id.should.equal(layer._id);
        datasetLayer.body.data.type.should.equal('layer');
        const { attributes } = datasetLayer.body.data;

        // we delete fields which are not in the attributes from server response.
        delete layer._id;
        delete layer.status;
        // set properties which are created on server side
        layer.interactionConfig = attributes.interactionConfig;
        layer.createdAt = attributes.createdAt;
        layer.updatedAt = attributes.updatedAt;

        attributes.should.deep.equal(layer);

        const layers = await Layer.find({});
        expect(layers).to.be.length(0);
    });

    afterEach(async () => {
        await Layer.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
