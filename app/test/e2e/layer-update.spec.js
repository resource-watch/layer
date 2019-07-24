const nock = require('nock');
const Layer = require('models/layer.model');
const { getTestServer } = require('./test-server');
const {
    ROLES, WRONG_DATAS, LAYER, LAYER_TO_UPDATE
} = require('./test.constants');
const {
    createLayer, createMockDataset, ensureCorrectError, getUUID
} = require('./utils');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

const datasetPrefix = '/api/v1/dataset';
let requester;

const updateLayer = async ({
    role, layerId = getUUID(), apps = ['rw'], datasetId = getUUID()
}, layerToUpdate = LAYER) => {
    createMockDataset(datasetId);
    const layer = createLayer(apps, datasetId, layerId);
    await new Layer(layer).save();

    return requester
        .patch(`${datasetPrefix}/${datasetId}/layer/${layerId}?loggedUser=${JSON.stringify(role)}`)
        .send(layerToUpdate);
};

describe('Layers - PATCH endpoint', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('PATCH /dataset/:dataset/layer/:layer - should return error not found, when dataset doesn\'t exist', async () => {
        const datasetLayer = await requester.patch(`${datasetPrefix}/321/layer/123`);
        datasetLayer.status.should.equal(404);
        ensureCorrectError(datasetLayer.body, 'Dataset not found');
    });

    it('PATCH /dataset/:dataset/layer/:layer - Update specific layer without being authenticated should fail', async () => {
        const datasetLayer = await updateLayer({ role: {} });
        datasetLayer.status.should.equal(401);
        ensureCorrectError(datasetLayer.body, 'Unauthorized');
    });

    it('PATCH /dataset/:dataset/layer/:layer - Update specific layer while being authenticated as USER should fail', async () => {
        const datasetLayer = await updateLayer({ role: ROLES.USER });
        datasetLayer.status.should.equal(403);
        ensureCorrectError(datasetLayer.body, 'Forbidden');
    });

    it('PATCH /dataset/:dataset/layer/:layer - should return error not found, when layer doesn\'t exist', async () => {
        createMockDataset('123');
        const layer = createLayer(['rw'], '123', '321');
        await new Layer(layer).save();

        const datasetLayer = await requester
            .delete(`${datasetPrefix}/123/layer/123?loggedUser=${JSON.stringify(ROLES.ADMIN)}`)
            .send();

        datasetLayer.status.should.equal(404);
        ensureCorrectError(datasetLayer.body, 'Layer with id \'123\' doesn\'t exist');
    });

    it('PATCH /dataset/:dataset/layer/:layer - Update specific layer with wrong data, should fail', async () => {
        await Promise.all(WRONG_DATAS.map(async ({ data, expectedError }) => {
            const datasetLayer = await updateLayer({ role: ROLES.ADMIN }, data);
            datasetLayer.status.should.equal(400);
            ensureCorrectError(datasetLayer.body, expectedError);
        }));
    });

    it('PATCH /dataset/:dataset/layer/:layer - Update specific layer should update', async () => {
        const datasetLayer = await updateLayer({ role: ROLES.ADMIN }, LAYER_TO_UPDATE);
        datasetLayer.status.should.equal(200);
        const responseData = datasetLayer.body.data;

        Object.keys(LAYER_TO_UPDATE)
            .map(field => responseData.attributes[field].should.deep.equal(LAYER_TO_UPDATE[field]));
    });

    afterEach(() => {
        Layer.remove({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
