const nock = require('nock');
const Layer = require('models/layer.model');
const { expect } = require('chai');
const { getTestServer } = require('./test-server');
const { ROLES } = require('./test.constants');
const {
    createLayer, createMockDataset, ensureCorrectError, getUUID
} = require('./utils');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

const layerPrefix = '/api/v1/layer';
let requester;

const updateEnv = async ({
    role, layerId = getUUID(), apps = ['rw'], datasetId = getUUID(),
}, env = 'test') => {
    createMockDataset(datasetId);
    const layer = createLayer(apps, datasetId, layerId);
    await new Layer(layer).save();

    return requester
        .patch(`${layerPrefix}/change-environment/${datasetId}/${env}`)
        .send({ loggedUser: role });
};

describe('Layers - PATCH ENV endpoint', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('PATCH /layer/change-environment/:dataset/:env - should return error not found, when dataset doesn\'t exist', async () => {
        const envLayer = await requester.patch(`${layerPrefix}/change-environment/123/test`);
        envLayer.status.should.equal(404);
        ensureCorrectError(envLayer.body, 'Dataset not found');
    });

    it('PATCH /layer/change-environment/:dataset/:env - Update layer env without being authenticated should fail', async () => {
        const envLayer = await updateEnv({ role: null });
        envLayer.status.should.equal(403);
        ensureCorrectError(envLayer.body, 'Not authorized');
    });

    it('PATCH /layer/change-environment/:dataset/:env - Update layer env while being authenticated not as MICROSERVICE should fail', async () => {
        const envLayer = await updateEnv({ role: ROLES.ADMIN });
        envLayer.status.should.equal(403);
        ensureCorrectError(envLayer.body, 'Not authorized');
    });

    it('PATCH /layer/change-environment/:dataset/:env - Should update layer env', async () => {
        const layerId = getUUID();

        const envLayer = await updateEnv({ role: ROLES.MICROSERVICE, layerId });
        envLayer.status.should.equal(200);
        const layer = await Layer.findOne({ _id: layerId });
        expect(layer.env).to.be.equal('test');
    });

    afterEach(() => {
        Layer.remove({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
