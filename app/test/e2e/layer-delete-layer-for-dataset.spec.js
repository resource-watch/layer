const nock = require('nock');
const chai = require('chai');
const Layer = require('models/layer.model');
const { expect } = require('chai');
const { getTestServer } = require('./utils/test-server');
const {
    ensureCorrectError, createMockDataset, createLayer, mockGetUserFromToken
} = require('./utils/helpers');
const { USERS } = require('./utils/test.constants');

chai.should();

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

let requester;

const deleteLayers = async (role) => {
    createMockDataset('123');
    const layer = createLayer({ application: ['rw'], dataset: '123' });
    await new Layer(layer).save();

    mockGetUserFromToken(role);

    return requester
        .delete(`/api/v1/dataset/123/layer`)
        .set('Authorization', `Bearer abcd`)
        .send();
};

describe('Delete all layers for a dataset', async () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('Deleting all layers for a dataset should return a 404 "Dataset not found" error when the dataset doesn\'t exist', async () => {
        mockGetUserFromToken(USERS.USER);

        nock(process.env.GATEWAY_URL)
            .get(`/v1/dataset/321`)
            .reply(404, { errors: [{ status: 404, detail: 'Dataset with id \'321\' doesn\'t exist' }] });

        const datasetLayers = await requester
            .delete(`/api/v1/dataset/321/layer`)
            .set('Authorization', `Bearer abcd`);

        datasetLayers.status.should.equal(404);
        ensureCorrectError(datasetLayers.body, 'Dataset not found');
    });

    it('Deleting all layers for a dataset without being authenticated should return a 401 "Not authorized" error', async () => {
        const datasetLayers = await requester.delete(`/api/v1/dataset/123/layer`);
        datasetLayers.status.should.equal(401);
        ensureCorrectError(datasetLayers.body, 'Unauthorized');
    });

    it('Deleting all layers for a dataset while being authenticated as USER should return a 403 "Forbidden" error', async () => {
        const response = await deleteLayers(USERS.USER);
        response.status.should.equal(403);
        ensureCorrectError(response.body, 'Forbidden');
    });

    it('Deleting all layers for a dataset while being authenticated as ADMIN should return a 403 "Forbidden" error', async () => {
        const response = await deleteLayers(USERS.ADMIN);
        response.status.should.equal(403);
        ensureCorrectError(response.body, 'Forbidden');
    });

    it('Deleting all layers for a dataset while being authenticated as MANAGER should return a 403 "Forbidden" error', async () => {
        const response = await deleteLayers(USERS.MANAGER);
        response.status.should.equal(403);
        ensureCorrectError(response.body, 'Forbidden');
    });

    it('Deleting all layers for a dataset be successful', async () => {
        mockGetUserFromToken(USERS.MICROSERVICE);

        createMockDataset('123');
        const layer = createLayer({ application: ['rw'], dataset: '123' });
        await new Layer(layer).save();

        nock(process.env.GATEWAY_URL)
            .delete(`/v1/graph/layer/${layer.dataset}`)
            .once()
            .reply(200, {
                status: 200,
                data: []
            });

        nock(process.env.GATEWAY_URL)
            .delete(`/v1/dataset/${layer.dataset}/layer/${layer._id}/metadata`)
            .once()
            .reply(200, {
                status: 200,
                data: []
            });

        nock(process.env.GATEWAY_URL)
            .delete(`/v1/layer/${layer.dataset}/expire-cache`)
            .once()
            .reply(200, {
                status: 200,
                data: []
            });

        const datasetLayers = await requester
            .delete(`/api/v1/dataset/123/layer`)
            .set('Authorization', `Bearer abcd`)
            .send();

        datasetLayers.status.should.equal(200);

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
