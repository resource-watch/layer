const nock = require('nock');
const Layer = require('models/layer.model');
const { expect } = require('chai');
const { getTestServer } = require('./test-server');
const { ensureCorrectError, createMockDataset, createLayer } = require('./utils');
const { ROLES } = require('./test.constants');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

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

const deleteLayer = async (role, layerId, apps = ['rw'], providedLayer) => {
    createMockDataset(layerId || '123');
    const layer = providedLayer || createLayer(apps, layerId || '123', layerId);
    await new Layer(layer).save();

    return requester
        .delete(`${datasetPrefix}/123/layer/${layerId}?loggedUser=${JSON.stringify(role)}`)
        .send();
};

describe('Layers - DELETE endpoints', async () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        nock.cleanAll();
    });

    it('DELETE /dataset/:dataset/layer - should return error not found, when dataset doesn\'t exist', async () => {
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

    it('DELETE /dataset/:dataset/layer - Delete layers by dataset while being authenticated as USER should fail', async () => {
        const response = await deleteLayers(ROLES.USER);
        response.status.should.equal(401);
        ensureCorrectError(response.body, 'Not authorized');
    });

    it('DELETE /dataset/:dataset/layer - Delete layers by dataset while being authenticated as ADMIN should fail', async () => {
        const response = await deleteLayers(ROLES.ADMIN);
        response.status.should.equal(401);
        ensureCorrectError(response.body, 'Not authorized');
    });

    it('DELETE /dataset/:dataset/layer - Delete layers by dataset while being authenticated as MANAGER should fail', async () => {
        const response = await deleteLayers(ROLES.MANAGER);
        response.status.should.equal(401);
        ensureCorrectError(response.body, 'Not authorized');
    });

    it('DELETE /dataset/:dataset/layer - should delete layers in specific dataset', async () => {
        const datasetLayers = await deleteLayers(ROLES.MICROSERVICE);
        datasetLayers.status.should.equal(200);

        const layers = await Layer.find({});
        expect(layers).to.be.length(0);
    });

    it('DELETE /dataset/:dataset/layer/:layer - should return error not found, when dataset doesn\'t exist', async () => {
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

    it('DELETE /dataset/:dataset/layer/:layer - Delete specific layer while being authenticated as USER should fail', async () => {
        const datasetLayer = await deleteLayer(ROLES.USER, '123');
        datasetLayer.status.should.equal(403);
        ensureCorrectError(datasetLayer.body, 'Forbidden');
    });

    it('DELETE /dataset/:dataset/layer/:layer - should return error not found, when layer doesn\'t exist', async () => {
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
        const layer = createLayer(['rw'], '123', '123');
        const datasetLayer = await deleteLayer(ROLES.ADMIN, '123', ['rw'], layer);

        datasetLayer.status.should.equal(200);
        datasetLayer.body.data.id.should.equal(layer._id);
        datasetLayer.body.data.type.should.equal('layer');
        const { attributes } = datasetLayer.body.data;

        // we delete fields which are not in the attributes from server response.
        delete layer._id;
        delete layer.status;
        // set properties which are created on server side
        layer.interactionConfig = attributes.interactionConfig;
        layer.updatedAt = attributes.updatedAt;

        attributes.should.deep.equal(layer);

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
