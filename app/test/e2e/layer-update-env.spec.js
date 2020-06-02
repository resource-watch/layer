const nock = require('nock');
const Layer = require('models/layer.model');
const { expect } = require('chai');
const { getTestServer } = require('./utils/test-server');
const { USERS } = require('./utils/test.constants');
const {
    createLayer, createMockDataset, ensureCorrectError, getUUID
} = require('./utils/helpers');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

let requester;

const updateEnv = async ({
    role, layerId = getUUID(), apps = ['rw'], dataset = getUUID(),
}, env = 'test') => {
    createMockDataset(dataset);
    const layer = createLayer({ applications: apps, dataset, _id: layerId });
    await new Layer(layer).save();

    return requester
        .patch(`/api/v1/layer/change-environment/${dataset}/${env}`)
        .send({ loggedUser: role });
};

describe('Layer env update', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('Updating the env of a layer should return a 404 "Dataset not found" error when the dataset doesn\'t exist', async () => {
        const envLayer = await requester.patch(`/api/v1/layer/change-environment/123/test`);
        envLayer.status.should.equal(404);
        ensureCorrectError(envLayer.body, 'Dataset not found');
    });

    it('Updating the env of a layer without being authenticated should return a 401 "Not authorized" error', async () => {
        const envLayer = await updateEnv({ role: null });
        envLayer.status.should.equal(401);
        ensureCorrectError(envLayer.body, 'Not authorized');
    });

    it('Updating the env of a layer while being authenticated as ADMIN should return a 403 "Forbidden" error', async () => {
        const envLayer = await updateEnv({ role: USERS.ADMIN });
        envLayer.status.should.equal(403);
        ensureCorrectError(envLayer.body, 'Forbidden');
    });

    it('Updating the env of a layer should update the layer env (happy case)', async () => {
        const layerId = getUUID();

        const envLayer = await updateEnv({ role: USERS.MICROSERVICE, layerId });
        envLayer.status.should.equal(200);
        const layer = await Layer.findOne({ _id: layerId });
        expect(layer.env).to.be.equal('test');
    });

    afterEach(async () => {
        await Layer.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
