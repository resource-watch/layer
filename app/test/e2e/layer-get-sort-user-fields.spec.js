const nock = require('nock');
const Layer = require('models/layer.model');
const chai = require('chai');
const mongoose = require('mongoose');
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

const mockLayersForSorting = async () => {
    const id = mongoose.Types.ObjectId();
    await new Layer(createLayer({ userId: USER.id })).save();
    await new Layer(createLayer({ userId: MANAGER.id })).save();
    await new Layer(createLayer({ userId: ADMIN.id })).save();
    await new Layer(createLayer({ userId: SUPERADMIN.id })).save();
    await new Layer(createLayer({ userId: id })).save();
    mockUsersForSort([USER, MANAGER, ADMIN, SUPERADMIN, { id }]);
};

describe('Get layers sorted by user fields', () => {
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
        const response = await requester.get('/api/v1/layer').query({
            sort: 'user.role',
            loggedUser: JSON.stringify(USER)
        });
        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.be.equal('Sorting by user name or role not authorized.');
    });

    it('Getting layers sorted by user.role ASC with user with role MANAGER should return 403 Forbidden', async () => {
        const response = await requester.get('/api/v1/layer').query({
            sort: 'user.role',
            loggedUser: JSON.stringify(MANAGER)
        });
        response.status.should.equal(403);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.be.equal('Sorting by user name or role not authorized.');
    });

    it('Getting layers sorted by user.role ASC should return a list of layers ordered by the role of the user who created the layer (happy case)', async () => {
        await mockLayersForSorting();
        const response = await requester.get('/api/v1/layer').query({
            includes: 'user',
            sort: 'user.role',
            loggedUser: JSON.stringify(ADMIN),
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(5);
        response.body.data.map((layer) => layer.attributes.user.role).should.be.deep.equal(['ADMIN', 'MANAGER', 'SUPERADMIN', 'USER', undefined]);
    });

    it('Getting layers sorted by user.role DESC should return a list of layers ordered by the role of the user who created the layer (happy case)', async () => {
        await mockLayersForSorting();
        const response = await requester.get('/api/v1/layer').query({
            includes: 'user',
            sort: '-user.role',
            loggedUser: JSON.stringify(ADMIN),
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(5);
        response.body.data.map((layer) => layer.attributes.user.role).should.be.deep.equal([undefined, 'USER', 'SUPERADMIN', 'MANAGER', 'ADMIN']);
    });

    it('Getting layers sorted by user.name ASC should return a list of layers ordered by the name of the user who created the layer (happy case)', async () => {
        await mockLayersForSorting();
        const response = await requester.get('/api/v1/layer').query({
            includes: 'user',
            sort: 'user.name',
            loggedUser: JSON.stringify(ADMIN),
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(5);
        response.body.data.map((layer) => layer.attributes.user.name).should.be.deep.equal(['test admin', 'test manager', 'test super admin', 'test user', undefined]);
    });

    it('Getting layers sorted by user.name DESC should return a list of layers ordered by the name of the user who created the layer (happy case)', async () => {
        await mockLayersForSorting();
        const response = await requester.get('/api/v1/layer').query({
            includes: 'user',
            sort: '-user.name',
            loggedUser: JSON.stringify(ADMIN),
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(5);
        response.body.data.map((layer) => layer.attributes.user.name).should.be.deep.equal([undefined, 'test user', 'test super admin', 'test manager', 'test admin']);
    });

    it('Sorting layers by user role ASC puts layers without valid users in the end of the list', async () => {
        await new Layer(createLayer({ userId: USER.id })).save();
        await new Layer(createLayer({ userId: MANAGER.id })).save();
        await new Layer(createLayer({ userId: ADMIN.id })).save();
        await new Layer(createLayer({ userId: SUPERADMIN.id })).save();
        const noUserLayer1 = await new Layer(createLayer({ userId: 'legacy' })).save();
        const noUserLayer2 = await new Layer(createLayer({ userId: '5accc3660bb7c603ba473d0f' })).save();

        // Custom mock user calls
        const fullUsers = [USER, MANAGER, ADMIN, SUPERADMIN].map((u) => ({ ...u, _id: u.id }));

        // Mock requests for includes=user
        fullUsers.map((user) => nock(process.env.CT_URL)
            .post('/auth/user/find-by-ids', { ids: [user.id] })
            .reply(200, { data: user }));

        // Custom mock find-by-ids call
        const userIds = [USER.id, MANAGER.id, ADMIN.id, SUPERADMIN.id, '5accc3660bb7c603ba473d0f'];
        nock(process.env.CT_URL)
            .post('/auth/user/find-by-ids', { ids: userIds })
            .reply(200, { data: fullUsers });

        const response = await requester.get('/api/v1/layer').query({
            includes: 'user',
            sort: 'user.role',
            loggedUser: JSON.stringify(ADMIN),
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(6);

        const returnedNoUserLayer1 = response.body.data.find((layer) => layer.id === noUserLayer1._id);
        const returnedNoUserLayer2 = response.body.data.find((layer) => layer.id === noUserLayer2._id);

        // Grab the last two layers of the returned data
        const len = response.body.data.length;
        const lastTwoLayers = response.body.data.slice(len - 2, len);
        lastTwoLayers.includes(returnedNoUserLayer1).should.be.equal(true);
        lastTwoLayers.includes(returnedNoUserLayer2).should.be.equal(true);
    });

    it('Sorting layers by user role DESC puts layers without valid users in the beginning of the list', async () => {
        await new Layer(createLayer({ userId: USER.id })).save();
        await new Layer(createLayer({ userId: MANAGER.id })).save();
        await new Layer(createLayer({ userId: ADMIN.id })).save();
        await new Layer(createLayer({ userId: SUPERADMIN.id })).save();
        const noUserLayer1 = await new Layer(createLayer({ userId: 'legacy' })).save();
        const noUserLayer2 = await new Layer(createLayer({ userId: '5accc3660bb7c603ba473d0f' })).save();

        // Custom mock user calls
        const fullUsers = [USER, MANAGER, ADMIN, SUPERADMIN].map((u) => ({ ...u, _id: u.id }));

        // Mock requests for includes=user
        fullUsers.map((user) => nock(process.env.CT_URL)
            .post('/auth/user/find-by-ids', { ids: [user.id] })
            .reply(200, { data: user }));

        // Custom mock find-by-ids call
        const userIds = [USER.id, MANAGER.id, ADMIN.id, SUPERADMIN.id, '5accc3660bb7c603ba473d0f'];
        nock(process.env.CT_URL)
            .post('/auth/user/find-by-ids', { ids: userIds })
            .reply(200, { data: fullUsers });

        const response = await requester.get('/api/v1/layer').query({
            includes: 'user',
            sort: '-user.role',
            loggedUser: JSON.stringify(ADMIN),
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(6);

        const returnedNoUserLayer1 = response.body.data.find((layer) => layer.id === noUserLayer1._id);
        const returnedNoUserLayer2 = response.body.data.find((layer) => layer.id === noUserLayer2._id);

        // Grab the first two layers of the returned data
        const firstTwoLayers = response.body.data.slice(0, 2);
        firstTwoLayers.includes(returnedNoUserLayer1).should.be.equal(true);
        firstTwoLayers.includes(returnedNoUserLayer2).should.be.equal(true);
    });

    it('Sorting layers by user.name is case insensitive and returns a list of layers ordered by the name of the user who created the layer', async () => {
        const firstUser = { ...USER, name: 'Anthony' };
        const secondUser = { ...MANAGER, name: 'bernard' };
        const thirdUser = { ...ADMIN, name: 'Carlos' };
        await new Layer(createLayer({ userId: firstUser.id })).save();
        await new Layer(createLayer({ userId: secondUser.id })).save();
        await new Layer(createLayer({ userId: thirdUser.id })).save();
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

    it('Sorting layers by user.name is deterministic, applying an implicit sort by id after sorting by user.name', async () => {
        const spoofedUser = { ...USER, name: 'AAA' };
        const spoofedManager = { ...MANAGER, name: 'AAA' };
        const spoofedAdmin = { ...ADMIN, name: 'AAA' };
        await new Layer(createLayer({ _id: '3', userId: spoofedUser.id })).save();
        await new Layer(createLayer({ _id: '2', userId: spoofedManager.id })).save();
        await new Layer(createLayer({ _id: '1', userId: spoofedAdmin.id })).save();
        mockUsersForSort([spoofedUser, spoofedManager, spoofedAdmin]);

        const response = await requester.get('/api/v1/layer').query({
            includes: 'user',
            sort: 'user.name',
            loggedUser: JSON.stringify(ADMIN),
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(3);
        response.body.data.map((layer) => layer.id).should.be.deep.equal(['1', '2', '3']);
    });

    afterEach(async () => {
        await Layer.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
