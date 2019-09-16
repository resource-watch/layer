const nock = require('nock');
const Layer = require('models/layer.model');
const { getTestServer } = require('./test-server');
const {
    ROLES, LAYER
} = require('./test.constants');
const {
    createLayer, createMockDataset, ensureCorrectError, getUUID
} = require('./utils/helpers');

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

describe('Layer update', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('Updating a layer should return a 404 "Dataset not found" error when the dataset doesn\'t exist', async () => {
        const datasetLayer = await requester.patch(`${datasetPrefix}/321/layer/123`);
        datasetLayer.status.should.equal(404);
        ensureCorrectError(datasetLayer.body, 'Dataset not found');
    });

    it('Updating a layer without being authenticated should return a 401 "Unauthorized" error', async () => {
        const datasetLayer = await updateLayer({ role: {} });
        datasetLayer.status.should.equal(401);
        ensureCorrectError(datasetLayer.body, 'Unauthorized');
    });

    it('Updating a layer while being authenticated as USER should return a 403 "Forbidden" error', async () => {
        const datasetLayer = await updateLayer({ role: ROLES.USER });
        datasetLayer.status.should.equal(403);
        ensureCorrectError(datasetLayer.body, 'Forbidden');
    });

    it('Updating a layer should return a 404 "Layer with id X doesn\'t exist" error when the layer doesn\'t exist', async () => {
        createMockDataset('123');
        const layer = createLayer(['rw'], '123', '321');
        await new Layer(layer).save();

        const datasetLayer = await requester
            .delete(`${datasetPrefix}/123/layer/123?loggedUser=${JSON.stringify(ROLES.ADMIN)}`)
            .send();

        datasetLayer.status.should.equal(404);
        ensureCorrectError(datasetLayer.body, 'Layer with id \'123\' doesn\'t exist');
    });

    it('Updating a layer with wrong data should return a 400 error and a meaningful error message', async () => {
        const WRONG_DATA = [
            { expectedError: '- name: can not be empty - ', data: { name: 123 } },
            { expectedError: '- application: must be a non-empty array - ', data: { application: {} } },
            { expectedError: '- description: must be a string - ', data: { description: 123 } },
            { expectedError: '- iso: must be an array - ', data: { iso: {} } },
            { expectedError: '- provider: must be a string - ', data: { provider: 123 } },
            { expectedError: '- type: must be a string - ', data: { type: 123 } },
            { expectedError: '- env: must be a string - ', data: { env: 123 } },
            { expectedError: '- layerConfig: must be an object - ', data: { layerConfig: [] } },
            { expectedError: '- legendConfig: must be an object - ', data: { legendConfig: [] } },
            { expectedError: '- interactionConfig: must be an object - ', data: { interactionConfig: [] } },
            { expectedError: '- applicationConfig: must be an object - ', data: { applicationConfig: [] } },
            { expectedError: '- staticImageConfig: must be an object - ', data: { staticImageConfig: [] } }
        ];

        await Promise.all(WRONG_DATA.map(async ({ data, expectedError }) => {
            const datasetLayer = await updateLayer({ role: ROLES.ADMIN }, data);
            datasetLayer.status.should.equal(400);
            ensureCorrectError(datasetLayer.body, expectedError);
        }));
    });

    it('Updating a layer should update should be successful and return the updated layer (happy case)', async () => {
        const LAYER_TO_UPDATE = {
            name: 'test update 123',
            application: ['rw'],
            description: 'test description',
            iso: ['123'],
            provider: 'test prodiver',
            default: true,
            published: true,
            layerConfig: { test: true },
            legendConfig: { test: true },
            interactionConfig: { test: true },
            applicationConfig: { test: true },
            staticImageConfig: { test: true }
        }

        const datasetId = getUUID();
        const layerId = getUUID();

        createMockDataset(datasetId);
        const layer = createLayer(['rw'], datasetId, layerId);
        await new Layer(layer).save();

        nock(process.env.CT_URL)
            .delete(`/v1/layer/${layer._id}/expire-cache`)
            .once()
            .reply(200, {
                status: 200,
                data: []
            });

        const datasetLayer = await requester
            .patch(`${datasetPrefix}/${datasetId}/layer/${layerId}?loggedUser=${JSON.stringify(ROLES.ADMIN)}`)
            .send(LAYER_TO_UPDATE);

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
