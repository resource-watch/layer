const nock = require('nock');
const Layer = require('models/layer.model');
const { expect } = require('chai');
const { getTestServer } = require('./test-server');
const { ensureCorrectError, createMockDataset, createLayer } = require('./utils');
const { ROLES } = require('./test.constants');

const datasetPrefix = '/api/v1/dataset';
let requester;

const deleteLayers = async (role) => {
    createMockDataset('123');
    const layer = createLayer(['rw'], '123');
    await new Layer(layer).save();

    return requester
        .delete(`${datasetPrefix}/123/layer?loggedUser=${JSON.stringify(role)}`)
        .send();
};

const deleteLayer = async (role, layerId, apps = ['rw']) => {
    createMockDataset(layerId || '123');
    const layer = createLayer(apps, layerId || '123', layerId);
    await new Layer(layer).save();

    return requester
        .delete(`${datasetPrefix}/123/layer/${layerId}?loggedUser=${JSON.stringify(role)}`)
        .send();
};

describe('Layers - DELETE enpoints', async () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        nock.cleanAll();
    });

    it('DELETE /dataset/:dataset/layer - should return error not found, when dataset is not exist', async () => {
        const datasetLayers = await requester.delete(`${datasetPrefix}/321/layer`);
        datasetLayers.status.should.equal(404);
        ensureCorrectError(datasetLayers.body, 'Dataset not found');
    });

    it('DELETE /dataset/:dataset/layer - Delete layers without being authenticated should fail', async () => {
        createMockDataset('123');

        const datasetLayers = await requester.delete(`${datasetPrefix}/123/layer`);
        datasetLayers.status.should.equal(401);
        ensureCorrectError(datasetLayers.body, 'Not authorized');
    });

    it('DELETE /dataset/:dataset/layer - Delete layers by dataset with being authenticated not as MICROSERVICE should fail', async () => {
        const { USER, ADMIN, MANAGER } = ROLES;

        const userRequests = await Promise.all([await deleteLayers(USER), await deleteLayers(ADMIN), await deleteLayers(MANAGER)]);

        const testResponse = (datasetLayers) => {
            datasetLayers.status.should.equal(401);
            ensureCorrectError(datasetLayers.body, 'Not authorized');
        };

        userRequests.map(testResponse);
    });

    it('DELETE /dataset/:dataset/layer - should delete layers in specific dataset', async () => {
        const datasetLayers = await deleteLayers(ROLES.MICROSERVICE);
        datasetLayers.status.should.equal(200);

        const layers = await Layer.find({});
        expect(layers).to.be.length(0);
    });

    it('DELETE /dataset/:dataset/layer/:layer - should return error not found, when dataset is not exist', async () => {
        const datasetLayer = await requester.delete(`${datasetPrefix}/321/layer/123`);
        datasetLayer.status.should.equal(404);
        ensureCorrectError(datasetLayer.body, 'Dataset not found');
    });

    it('DELETE /dataset/:dataset/layer/:layer - Delete specific layer without being authenticated should fail', async () => {
        createMockDataset('123');

        const datasetLayer = await requester.delete(`${datasetPrefix}/123/layer`);
        datasetLayer.status.should.equal(401);
        ensureCorrectError(datasetLayer.body, 'Not authorized');
    });

    it('DELETE /dataset/:dataset/layer/:layer - Delete specific layer with being authenticated as USER should fail', async () => {
        const datasetLayer = await deleteLayer(ROLES.USER, '123');
        datasetLayer.status.should.equal(403);
        ensureCorrectError(datasetLayer.body, 'Forbidden');
    });

    it('DELETE /dataset/:dataset/layer/:layer - should return error not found, when layer is not exist', async () => {
        createMockDataset('123');
        const layer = createLayer(['rw'], '123', '321');
        await new Layer(layer).save();

        const datasetLayer = await requester
            .delete(`${datasetPrefix}/123/layer/123?loggedUser=${JSON.stringify(ROLES.ADMIN)}`)
            .send();

        datasetLayer.status.should.equal(404);
        ensureCorrectError(datasetLayer.body, 'Layer with id \'123\' doesn\'t exist');
    });

    it('DELETE /dataset/:dataset/layer/:layer - should delete the specific layer in specific dataset', async () => {
        const datasetLayer = await deleteLayer(ROLES.ADMIN, '123');
        datasetLayer.status.should.equal(200);
        const layers = await Layer.find({});
        expect(layers).to.be.length(0);
    });

    afterEach(() => {
        Layer.remove({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
