const nock = require('nock');
const Layer = require('models/layer.model');
const chai = require('chai');
const { getTestServer } = require('./utils/test-server');
const { createLayer } = require('./utils/helpers');
const { createMockUser } = require('./utils/mocks');
const {
    USERS: {
        USER, MANAGER, ADMIN, SUPERADMIN
    }
} = require('./utils/test.constants');

chai.should();

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

let requester;

describe('GET layers sorted by user fields', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('Getting layers sorted by user.role ASC should return a list of layers ordered by the role of the user who created the layer (happy case)', async () => {
        const layer1 = await new Layer(createLayer(null, null, null, USER.id)).save();
        const layer2 = await new Layer(createLayer(null, null, null, MANAGER.id)).save();
        const layer3 = await new Layer(createLayer(null, null, null, ADMIN.id)).save();
        const layer4 = await new Layer(createLayer(null, null, null, SUPERADMIN.id)).save();

        createMockUser([{ id: layer1.userId, role: 'USER', name: 'test user' }]);
        createMockUser([{ id: layer2.userId, role: 'MANAGER', name: 'test user' }]);
        createMockUser([{ id: layer3.userId, role: 'ADMIN', name: 'test user' }]);
        createMockUser([{ id: layer4.userId, role: 'SUPERADMIN', name: 'test user' }]);

        const response = await requester.get('/api/v1/layer').query({
            includes: 'user',
            sort: 'user.role',
            loggedUser: JSON.stringify(ADMIN),
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(4);
        response.body.data.map((layer) => layer.attributes.user.role).should.be.deep.equal(['ADMIN', 'MANAGER', 'SUPERADMIN', 'USER']);
    });

    it('Getting layers sorted by user.role DESC should return a list of layers ordered by the role of the user who created the layer (happy case)', async () => {
        const layer1 = await new Layer(createLayer(null, null, null, USER.id)).save();
        const layer2 = await new Layer(createLayer(null, null, null, MANAGER.id)).save();
        const layer3 = await new Layer(createLayer(null, null, null, ADMIN.id)).save();
        const layer4 = await new Layer(createLayer(null, null, null, SUPERADMIN.id)).save();

        createMockUser([{ id: layer1.userId, role: 'USER', name: 'test user' }]);
        createMockUser([{ id: layer2.userId, role: 'MANAGER', name: 'test user' }]);
        createMockUser([{ id: layer3.userId, role: 'ADMIN', name: 'test user' }]);
        createMockUser([{ id: layer4.userId, role: 'SUPERADMIN', name: 'test user' }]);

        const response = await requester.get('/api/v1/layer').query({
            includes: 'user',
            sort: '-user.role',
            loggedUser: JSON.stringify(ADMIN),
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(4);
        response.body.data.map((layer) => layer.attributes.user.role).should.be.deep.equal(['USER', 'SUPERADMIN', 'MANAGER', 'ADMIN']);
    });

    it('Getting layers sorted by user.name ASC should return a list of layers ordered by the name of the user who created the layer (happy case)', async () => {
        const layer1 = await new Layer(createLayer(null, null, null, USER.id)).save();
        const layer2 = await new Layer(createLayer(null, null, null, MANAGER.id)).save();
        const layer3 = await new Layer(createLayer(null, null, null, ADMIN.id)).save();
        const layer4 = await new Layer(createLayer(null, null, null, SUPERADMIN.id)).save();

        createMockUser([{ id: layer1.userId, role: 'USER', name: 'B' }]);
        createMockUser([{ id: layer2.userId, role: 'MANAGER', name: 'A' }]);
        createMockUser([{ id: layer3.userId, role: 'ADMIN', name: 'D' }]);
        createMockUser([{ id: layer4.userId, role: 'SUPERADMIN', name: 'C' }]);

        const response = await requester.get('/api/v1/layer').query({
            includes: 'user',
            sort: 'user.name',
            loggedUser: JSON.stringify(ADMIN),
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(4);
        response.body.data.map((layer) => layer.attributes.user.name).should.be.deep.equal(['A', 'B', 'C', 'D']);
    });

    it('Getting layers sorted by user.name DESC should return a list of layers ordered by the name of the user who created the layer (happy case)', async () => {
        const layer1 = await new Layer(createLayer(null, null, null, USER.id)).save();
        const layer2 = await new Layer(createLayer(null, null, null, MANAGER.id)).save();
        const layer3 = await new Layer(createLayer(null, null, null, ADMIN.id)).save();
        const layer4 = await new Layer(createLayer(null, null, null, SUPERADMIN.id)).save();

        createMockUser([{ id: layer1.userId, role: 'USER', name: 'B' }]);
        createMockUser([{ id: layer2.userId, role: 'MANAGER', name: 'A' }]);
        createMockUser([{ id: layer3.userId, role: 'ADMIN', name: 'D' }]);
        createMockUser([{ id: layer4.userId, role: 'SUPERADMIN', name: 'C' }]);

        const response = await requester.get('/api/v1/layer').query({
            includes: 'user',
            sort: '-user.name',
            loggedUser: JSON.stringify(ADMIN),
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(4);
        response.body.data.map((layer) => layer.attributes.user.name).should.be.deep.equal(['A', 'B', 'C', 'D']);
    });

    afterEach(async () => {
        await Layer.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
