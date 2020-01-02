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

const mockUsersForSort = (users) => {
    // Add _id property to provided users (some stuff uses _id, some uses id :shrug:)
    const fullUsers = users.map((u) => ({ ...u, _id: u.id }));

    // Mock each user request (for includes=user)
    fullUsers.map((user) => createMockUser([user]));

    // Mock all users request (for sorting by user role)
    createMockUser(fullUsers);
};

const mockFourLayersForSorting = async () => {
    await new Layer(createLayer(null, null, null, USER.id)).save();
    await new Layer(createLayer(null, null, null, MANAGER.id)).save();
    await new Layer(createLayer(null, null, null, ADMIN.id)).save();
    await new Layer(createLayer(null, null, null, SUPERADMIN.id)).save();

    mockUsersForSort([
        USER, MANAGER, ADMIN, SUPERADMIN
    ]);
};

describe('GET layers sorted by user fields', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('Getting layers sorted by user.role ASC without authentication should return 403 Forbidden', async () => {
        const response = await requester.get('/api/v1/layer').query({ sort: 'user.role' });
        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.be.equal('Sorting by user name or role not authorized.');
    });

    it('Getting layers sorted by user.role ASC with user with role USER should return 403 Forbidden', async () => {
        const response = await requester.get('/api/v1/layer').query({ sort: 'user.role', loggedUser: JSON.stringify(USER) });
        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.be.equal('Sorting by user name or role not authorized.');
    });

    it('Getting layers sorted by user.role ASC with user with role MANAGER should return 403 Forbidden', async () => {
        const response = await requester.get('/api/v1/layer').query({ sort: 'user.role', loggedUser: JSON.stringify(MANAGER) });
        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.be.equal('Sorting by user name or role not authorized.');
    });

    it('Getting layers sorted by user.role ASC should return a list of layers ordered by the role of the user who created the layer (happy case)', async () => {
        await mockFourLayersForSorting();
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
        await mockFourLayersForSorting();
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
        await mockFourLayersForSorting();
        const response = await requester.get('/api/v1/layer').query({
            includes: 'user',
            sort: 'user.name',
            loggedUser: JSON.stringify(ADMIN),
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(4);
        response.body.data.map((layer) => layer.attributes.user.name).should.be.deep.equal(['test admin', 'test manager', 'test super admin', 'test user']);
    });

    it('Getting layers sorted by user.name DESC should return a list of layers ordered by the name of the user who created the layer (happy case)', async () => {
        await mockFourLayersForSorting();
        const response = await requester.get('/api/v1/layer').query({
            includes: 'user',
            sort: '-user.name',
            loggedUser: JSON.stringify(ADMIN),
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(4);
        response.body.data.map((layer) => layer.attributes.user.name).should.be.deep.equal(['test user', 'test super admin', 'test manager', 'test admin']);
    });

    it('Sorting layers by user role ASC puts layers without valid users in the beginning of the list', async () => {
        await new Layer(createLayer(null, null, null, USER.id)).save();
        await new Layer(createLayer(null, null, null, MANAGER.id)).save();
        await new Layer(createLayer(null, null, null, ADMIN.id)).save();
        await new Layer(createLayer(null, null, null, SUPERADMIN.id)).save();
        const noUserLayer = await new Layer(createLayer(null, null, null, 'legacy')).save();

        mockUsersForSort([
            USER, MANAGER, ADMIN, SUPERADMIN
        ]);

        const response = await requester.get('/api/v1/layer').query({
            includes: 'user',
            sort: 'user.role',
            loggedUser: JSON.stringify(ADMIN),
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(5);

        const returnedNoUserLayer = response.body.data.find((layer) => layer.id === noUserLayer._id);
        response.body.data.indexOf(returnedNoUserLayer).should.be.equal(0);
    });

    it('Sorting layers by user role DESC puts layers without valid users in the end of the list', async () => {
        await new Layer(createLayer(null, null, null, USER.id)).save();
        await new Layer(createLayer(null, null, null, MANAGER.id)).save();
        await new Layer(createLayer(null, null, null, ADMIN.id)).save();
        await new Layer(createLayer(null, null, null, SUPERADMIN.id)).save();
        const noUserLayer = await new Layer(createLayer(null, null, null, 'legacy')).save();

        mockUsersForSort([
            USER, MANAGER, ADMIN, SUPERADMIN
        ]);

        const response = await requester.get('/api/v1/layer').query({
            includes: 'user',
            sort: '-user.role',
            loggedUser: JSON.stringify(ADMIN),
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(5);

        const returnedNoUserLayer = response.body.data.find((layer) => layer.id === noUserLayer._id);
        response.body.data.indexOf(returnedNoUserLayer).should.be.equal(4);
    });

    it('Sorting layers by user.name is case insensitive and returns a list of layers ordered by the name of the user who created the layer', async () => {
        const firstUser = { ...USER, name: 'Anthony' };
        const secondUser = { ...MANAGER, name: 'bernard' };
        const thirdUser = { ...ADMIN, name: 'Carlos' };
        await new Layer(createLayer(null, null, null, firstUser.id)).save();
        await new Layer(createLayer(null, null, null, secondUser.id)).save();
        await new Layer(createLayer(null, null, null, thirdUser.id)).save();
        mockUsersForSort([firstUser, secondUser, thirdUser]);

        const response = await requester.get('/api/v1/layer').query({
            includes: 'user',
            sort: 'user.name',
            loggedUser: JSON.stringify(ADMIN),
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(3);
        response.body.data.map((layer) => layer.attributes.user.name).should.be.deep.equal(['Anthony', 'bernard', 'Carlos']);
    });

    afterEach(async () => {
        await Layer.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
