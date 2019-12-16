const nock = require('nock');
const Layer = require('models/layer.model');
const { getTestServer } = require('./utils/test-server');
const {
    createLayer, createMockDataset, ensureCorrectError, ensureCorrectLayer
} = require('./utils/helpers');
const { createMockUser } = require('./utils/mocks');
const { USERS: { USER, MANAGER, ADMIN } } = require('./utils/test.constants');

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

let requester;

describe('Get layers by id', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('Getting layers by id should return a 404 "Layer with id X doesn\'t exist" error when layer doesn\'t exist', async () => {
        const layer = await requester.get(`/api/v1/layer/123`);
        layer.status.should.equal(404);
        ensureCorrectError(layer.body, 'Layer with id \'123\' doesn\'t exist');
    });

    it('Getting layers by id should return the layer when it exists (happy case)', async () => {
        const savedLayer = await new Layer(createLayer()).save();
        const foundLayer = await Layer.findById(savedLayer._id);

        const layer = await requester.get(`/api/v1/layer/${foundLayer._id}`);
        layer.status.should.equal(200);
        ensureCorrectLayer(layer.body.data, foundLayer.toObject());
    });

    it('Getting layers as anonymous user with includes=user should return a list of layers and no user data (happy case)', async () => {
        const savedLayer = await new Layer(createLayer(null, null, null, USER.id)).save();
        const foundLayer = await Layer.findById(savedLayer._id);

        createMockUser([USER]);

        const list = await requester.get(`/api/v1/layer/${foundLayer._id}`)
            .query({
                includes: 'user',
                loggedUser: JSON.stringify(USER)
            });

        list.body.should.have.property('data');
        ensureCorrectLayer(list.body.data, foundLayer.toObject(), {
            user: {
                email: USER.email,
                name: USER.name
            }
        });
    });

    it('Getting layers with USER role and includes=user should return a list of layers and user name and email (happy case)', async () => {
        const savedLayer = await new Layer(createLayer(null, null, null, USER.id)).save();
        const foundLayer = await Layer.findById(savedLayer._id);

        createMockUser([USER]);

        const list = await requester.get(`/api/v1/layer/${foundLayer._id}`)
            .query({
                includes: 'user',
                loggedUser: JSON.stringify(USER)
            });

        list.body.should.have.property('data');
        ensureCorrectLayer(list.body.data, foundLayer.toObject(), {
            user: {
                email: USER.email,
                name: USER.name
            }
        });
    });

    it('Getting layers with MANAGER role and includes=user should return a list of layers and user name and email (happy case)', async () => {
        const savedLayer = await new Layer(createLayer(null, null, null, USER.id)).save();
        const foundLayer = await Layer.findById(savedLayer._id);

        createMockUser([USER]);

        const list = await requester.get(`/api/v1/layer/${foundLayer._id}`)
            .query({
                includes: 'user',
                loggedUser: JSON.stringify(MANAGER)
            });

        list.body.should.have.property('data');
        ensureCorrectLayer(list.body.data, foundLayer.toObject(), {
            user: {
                email: USER.email,
                name: USER.name,
            }
        });
    });

    it('Getting layers with ADMIN role and includes=user should return a list of layers and user name, email and role (happy case)', async () => {
        const savedLayer = await new Layer(createLayer(null, null, null, USER.id)).save();
        const foundLayer = await Layer.findById(savedLayer._id);

        createMockUser([USER]);

        const list = await requester.get(`/api/v1/layer/${foundLayer._id}`)
            .query({
                includes: 'user',
                loggedUser: JSON.stringify(ADMIN)
            });

        list.body.should.have.property('data');
        ensureCorrectLayer(list.body.data, foundLayer.toObject(), {
            user: {
                email: USER.email,
                name: USER.name,
                role: USER.role
            }
        });
    });

    it('Getting layers by dataset should return a 404 "Dataset not found" error when the dataset doesn\'t exist', async () => {
        const datasetLayers = await requester.get(`/api/v1/dataset/321/layer`);
        datasetLayers.status.should.equal(404);
        ensureCorrectError(datasetLayers.body, 'Dataset not found');
    });

    it('Getting layers by dataset should return the layers for specific dataset when dataset exists (happy case)', async () => {
        createMockDataset('123');
        const savedLayer = await new Layer(createLayer(['rw'], '123')).save();
        const foundLayer = await Layer.findById(savedLayer._id);

        const datasetLayers = await requester.get(`/api/v1/dataset/123/layer`);
        datasetLayers.status.should.equal(200);
        datasetLayers.body.should.have.property('data').and.be.an('array').and.length.above(0);
        ensureCorrectLayer(datasetLayers.body.data[0], foundLayer.toObject());
    });

    afterEach(async () => {
        await Layer.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
