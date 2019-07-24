const nock = require('nock');
const Layer = require('models/layer.model');
const { getTestServer } = require('./test-server');
const { createLayer, createMockDataset, ensureCorrectError } = require('./utils');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

const layerPrefix = '/api/v1/layer';
const datasetPrefix = '/api/v1/dataset';
let requester;

const ensureCorrectLayer = (receivedLayer, createdLayer) => {
    receivedLayer.id.should.equal(createdLayer._id);

    // delete fields which we will not receive in the attributes place
    delete createdLayer._id;
    delete createdLayer.status;

    // add fields that are generated on the api side
    createdLayer.interactionConfig = {};
    createdLayer.updatedAt = receivedLayer.attributes.updatedAt;

    receivedLayer.attributes.should.deep.equal(createdLayer);
};

describe('Layers - GET endpoints', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('GET /layer - should return result empty result, when layers doesn\'t exist', async () => {
        const list = await requester.get(layerPrefix);
        list.status.should.equal(200);
        list.body.should.have.property('data').and.be.an('array').and.length(0);
    });

    it('GET /layer - should return layers, when layers exists', async () => {
        const testLayer = createLayer();
        await new Layer(testLayer).save();

        const list = await requester.get(layerPrefix);
        list.body.should.have.property('data').and.be.an('array').and.length.above(0);
        ensureCorrectLayer(list.body.data[0], testLayer);
    });

    it('GET /layer/:layer - should return error not found, when layer doesn\'t exist', async () => {
        const layer = await requester.get(`${layerPrefix}/123`);
        layer.status.should.equal(404);
        ensureCorrectError(layer.body, 'Layer with id \'123\' doesn\'t exist');
    });

    it('GET /layer/:layer - should return layer, when layer exists', async () => {
        const testLayer = createLayer();
        await new Layer(testLayer).save();

        const layer = await requester.get(`${layerPrefix}/${testLayer._id}`);
        layer.status.should.equal(200);
        ensureCorrectLayer(layer.body.data, testLayer);
    });

    it('GET /dataset/:dataset/layer - should return error not found, when dataset doesn\'t exist', async () => {
        const datasetLayers = await requester.get(`${datasetPrefix}/321/layer`);
        datasetLayers.status.should.equal(404);
        ensureCorrectError(datasetLayers.body, 'Dataset not found');
    });

    it('GET /dataset/:dataset/layer - should return layers for specific dataset, when dataset exists', async () => {
        createMockDataset('123');
        const testLayer = createLayer(['rw'], '123');
        await new Layer(testLayer).save();

        const datasetLayers = await requester.get(`${datasetPrefix}/123/layer`);
        datasetLayers.status.should.equal(200);
        datasetLayers.body.should.have.property('data').and.be.an('array').and.length.above(0);
        ensureCorrectLayer(datasetLayers.body.data[0], testLayer);
    });

    afterEach(() => {
        Layer.remove({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
