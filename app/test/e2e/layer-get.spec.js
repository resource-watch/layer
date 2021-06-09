const nock = require('nock');
const Layer = require('models/layer.model');
const chai = require('chai');
const config = require('config');
const { getTestServer } = require('./utils/test-server');
const { createLayer, ensureCorrectLayer, mockGetUserFromToken } = require('./utils/helpers');
const { createMockUser, createMockUserRole } = require('./utils/mocks');
const {
    USERS: {
        USER, MANAGER, ADMIN, SUPERADMIN
    }
} = require('./utils/test.constants');

chai.should();

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

let requester;

describe('Get layers', () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    describe('Test pagination links', () => {
        it('Get layers without referer header should be successful and use the request host', async () => {
            const response = await requester
                .get(`/api/v1/layer`);

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array');
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/layer?page[number]=1&page[size]=10`);
            response.body.links.should.have.property('prev').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/layer?page[number]=1&page[size]=10`);
            response.body.links.should.have.property('next').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/layer?page[number]=1&page[size]=10`);
            response.body.links.should.have.property('first').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/layer?page[number]=1&page[size]=10`);
            response.body.links.should.have.property('last').and.equal(`http://127.0.0.1:${config.get('service.port')}/v1/layer?page[number]=1&page[size]=10`);
        });

        it('Get layers with referer header should be successful and use that header on the links on the response', async () => {
            const response = await requester
                .get(`/api/v1/layer`)
                .set('referer', `https://potato.com/get-me-all-the-data`);

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array');
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal('http://potato.com/v1/layer?page[number]=1&page[size]=10');
            response.body.links.should.have.property('prev').and.equal('http://potato.com/v1/layer?page[number]=1&page[size]=10');
            response.body.links.should.have.property('next').and.equal('http://potato.com/v1/layer?page[number]=1&page[size]=10');
            response.body.links.should.have.property('first').and.equal('http://potato.com/v1/layer?page[number]=1&page[size]=10');
            response.body.links.should.have.property('last').and.equal('http://potato.com/v1/layer?page[number]=1&page[size]=10');
        });

        it('Get layers with x-rw-domain header should be successful and use that header on the links on the response', async () => {
            const response = await requester
                .get(`/api/v1/layer`)
                .set('x-rw-domain', `potato.com`);

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array');
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal('http://potato.com/v1/layer?page[number]=1&page[size]=10');
            response.body.links.should.have.property('prev').and.equal('http://potato.com/v1/layer?page[number]=1&page[size]=10');
            response.body.links.should.have.property('next').and.equal('http://potato.com/v1/layer?page[number]=1&page[size]=10');
            response.body.links.should.have.property('first').and.equal('http://potato.com/v1/layer?page[number]=1&page[size]=10');
            response.body.links.should.have.property('last').and.equal('http://potato.com/v1/layer?page[number]=1&page[size]=10');
        });

        it('Get layers with x-rw-domain and referer headers should be successful and use the x-rw-domain header on the links on the response', async () => {
            const response = await requester
                .get(`/api/v1/layer`)
                .set('x-rw-domain', `potato.com`)
                .set('referer', `https://tomato.com/get-me-all-the-data`);

            response.status.should.equal(200);
            response.body.should.have.property('data').and.be.an('array');
            response.body.should.have.property('links').and.be.an('object');
            response.body.links.should.have.property('self').and.equal('http://potato.com/v1/layer?page[number]=1&page[size]=10');
            response.body.links.should.have.property('prev').and.equal('http://potato.com/v1/layer?page[number]=1&page[size]=10');
            response.body.links.should.have.property('next').and.equal('http://potato.com/v1/layer?page[number]=1&page[size]=10');
            response.body.links.should.have.property('first').and.equal('http://potato.com/v1/layer?page[number]=1&page[size]=10');
            response.body.links.should.have.property('last').and.equal('http://potato.com/v1/layer?page[number]=1&page[size]=10');
        });
    });

    it('Getting layers should return result empty result when no layers exist', async () => {
        const list = await requester.get('/api/v1/layer');
        list.status.should.equal(200);
        list.body.should.have.property('data').and.be.an('array').and.length(0);
    });

    it('Getting layers should return a list of layers (happy case)', async () => {
        const savedLayer = await new Layer(createLayer()).save();
        const foundLayer = await Layer.findById(savedLayer._id);

        const list = await requester.get('/api/v1/layer');
        list.body.should.have.property('data').and.be.an('array').and.length.above(0);
        ensureCorrectLayer(list.body.data[0], foundLayer.toObject());
    });

    it('Getting layers filtered by userName should return an unfiltered list, as userName should be ignored (anon user)', async () => {
        await new Layer(createLayer({ userName: 'a', name: 'a' })).save();
        await new Layer(createLayer({ userName: 'b', name: 'b' })).save();
        await new Layer(createLayer({ userName: 'c', name: 'c' })).save();
        await new Layer(createLayer({ userName: 'd', name: 'd' })).save();

        const response = await requester.get('/api/v1/layer').query({
            userName: 'a'
        });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(4);
        response.body.data.map((layer) => layer.attributes.name).should.be.deep.equal(['a', 'b', 'c', 'd']);
    });

    it('Getting layers filtered by userName should return an unfiltered list, as userName should be ignored (ADMIN role)', async () => {
        mockGetUserFromToken(ADMIN);
        await new Layer(createLayer({ userName: 'a', name: 'a' })).save();
        await new Layer(createLayer({ userName: 'b', name: 'b' })).save();
        await new Layer(createLayer({ userName: 'c', name: 'c' })).save();
        await new Layer(createLayer({ userName: 'd', name: 'd' })).save();

        const response = await requester.get('/api/v1/layer')
            .set('Authorization', `Bearer abcd`)
            .query({
                userName: 'a',
            });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(4);
        response.body.data.map((layer) => layer.attributes.name).should.be.deep.equal(['a', 'b', 'c', 'd']);
    });

    it('Getting layers filtered by userRole should return an unfiltered list, as userRole should be ignored (anon user)', async () => {
        await new Layer(createLayer({ userRole: 'a', name: 'a' })).save();
        await new Layer(createLayer({ userRole: 'b', name: 'b' })).save();
        await new Layer(createLayer({ userRole: 'c', name: 'c' })).save();
        await new Layer(createLayer({ userRole: 'd', name: 'd' })).save();

        const response = await requester.get('/api/v1/layer').query({
            userRole: 'a'
        });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(4);
        response.body.data.map((layer) => layer.attributes.name).should.be.deep.equal(['a', 'b', 'c', 'd']);
    });

    it('Getting layers filtered by userRole should return an unfiltered list, as userRole should be ignored (ADMIN user)', async () => {
        mockGetUserFromToken(ADMIN);
        await new Layer(createLayer({ userRole: 'a', name: 'a' })).save();
        await new Layer(createLayer({ userRole: 'b', name: 'b' })).save();
        await new Layer(createLayer({ userRole: 'c', name: 'c' })).save();
        await new Layer(createLayer({ userRole: 'd', name: 'd' })).save();

        const response = await requester.get('/api/v1/layer')
            .set('Authorization', `Bearer abcd`)
            .query({
                userRole: 'a',
            });
        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(4);
        response.body.data.map((layer) => layer.attributes.name).should.be.deep.equal(['a', 'b', 'c', 'd']);
    });

    it('Getting layers as ADMIN with query params user.role = ADMIN should return a list of layers created by ADMIN users (happy case)', async () => {
        mockGetUserFromToken(ADMIN);
        const savedLayer = await new Layer(createLayer({ userId: ADMIN.id })).save();
        const foundLayer = await Layer.findById(savedLayer._id);
        await new Layer(createLayer({ userId: USER.id })).save();

        createMockUserRole('ADMIN', ADMIN.id);

        const list = await requester.get('/api/v1/layer')
            .set('Authorization', `Bearer abcd`)
            .query({
                'user.role': 'ADMIN',
            });

        list.body.should.have.property('data').and.be.an('array').and.length(1);
        ensureCorrectLayer(list.body.data[0], foundLayer.toObject());
    });

    it('Getting layers as ADMIN with query params user.role = MANAGER should return a list of layers created by MANAGER users (happy case)', async () => {
        mockGetUserFromToken(SUPERADMIN);
        const savedLayer = await new Layer(createLayer({ userId: MANAGER.id })).save();
        const foundLayer = await Layer.findById(savedLayer._id);
        await new Layer(createLayer({ userId: USER.id })).save();

        createMockUserRole('MANAGER', MANAGER.id);

        const list = await requester.get('/api/v1/layer')
            .set('Authorization', `Bearer abcd`)
            .query({
                'user.role': 'MANAGER',
            });

        list.body.should.have.property('data').and.be.an('array').and.length(1);
        ensureCorrectLayer(list.body.data[0], foundLayer.toObject());
    });

    it('Getting layers as ADMIN with query params user.role = USER should return a list of layers created by USER (happy case)', async () => {
        mockGetUserFromToken(ADMIN);
        const savedLayer = await new Layer(createLayer({ userId: USER.id })).save();
        const foundLayer = await Layer.findById(savedLayer._id);
        await new Layer(createLayer({ userId: MANAGER.id })).save();

        createMockUserRole('USER', USER.id);

        const list = await requester.get('/api/v1/layer')
            .set('Authorization', `Bearer abcd`)
            .query({
                'user.role': 'USER',
            });

        list.body.should.have.property('data').and.be.an('array').and.length(1);
        ensureCorrectLayer(list.body.data[0], foundLayer.toObject());
    });

    it('Getting layers as USER with query params user.role = USER and should return an unfiltered list of layers (happy case)', async () => {
        mockGetUserFromToken(USER);
        const savedLayer = await new Layer(createLayer({ userId: USER.id })).save();
        const foundLayer = await Layer.findById(savedLayer._id);
        await new Layer(createLayer({ userId: MANAGER.id })).save();

        const list = await requester.get('/api/v1/layer')
            .set('Authorization', `Bearer abcd`)
            .query({
                'user.role': 'USER',
            });

        list.body.should.have.property('data').and.be.an('array').and.length(2);
        ensureCorrectLayer(list.body.data[0], foundLayer.toObject());
    });

    it('Getting layers as MANAGER with query params user.role = USER and should return an unfiltered list of layers (happy case)', async () => {
        mockGetUserFromToken(MANAGER);
        const savedLayer = await new Layer(createLayer({ userId: USER.id })).save();
        const foundLayer = await Layer.findById(savedLayer._id);
        await new Layer(createLayer({ userId: MANAGER.id })).save();

        const list = await requester.get('/api/v1/layer')
            .set('Authorization', `Bearer abcd`)
            .query({
                'user.role': 'USER',
            });

        list.body.should.have.property('data').and.be.an('array').and.length(2);
        ensureCorrectLayer(list.body.data[0], foundLayer.toObject());
    });

    it('Getting layers as anonymous user with includes=user should return a list of layers and no user data (happy case)', async () => {
        const savedLayer = await new Layer(createLayer({ userId: USER.id })).save();
        const foundLayer = await Layer.findById(savedLayer._id);

        createMockUser([USER]);

        const list = await requester.get('/api/v1/layer')
            .query({
                includes: 'user'
            });

        list.body.should.have.property('data').and.be.an('array').and.length.above(0);

        ensureCorrectLayer(list.body.data[0], foundLayer.toObject(), {
            user: {
                email: USER.email,
                name: USER.name
            }
        });
    });

    it('Getting layers with USER role and includes=user should return a list of layers and user name and email (happy case)', async () => {
        mockGetUserFromToken(USER);
        const savedLayer = await new Layer(createLayer({ userId: USER.id })).save();
        const foundLayer = await Layer.findById(savedLayer._id);

        createMockUser([USER]);

        const list = await requester.get('/api/v1/layer')
            .set('Authorization', `Bearer abcd`)
            .query({
                includes: 'user',
            });

        list.body.should.have.property('data').and.be.an('array').and.length.above(0);
        ensureCorrectLayer(list.body.data[0], foundLayer.toObject(), {
            user: {
                email: USER.email,
                name: USER.name
            }
        });
    });

    it('Getting layers with MANAGER role and includes=user should return a list of layers and user name and email (happy case)', async () => {
        mockGetUserFromToken(MANAGER);
        const savedLayer = await new Layer(createLayer({ userId: USER.id })).save();
        const foundLayer = await Layer.findById(savedLayer._id);

        createMockUser([USER]);

        const list = await requester.get('/api/v1/layer')
            .set('Authorization', `Bearer abcd`)
            .query({
                includes: 'user',
            });

        list.body.should.have.property('data').and.be.an('array').and.length.above(0);
        ensureCorrectLayer(list.body.data[0], foundLayer.toObject(), {
            user: {
                email: USER.email,
                name: USER.name
            }
        });
    });

    it('Getting layers with ADMIN role and includes=user should return a list of layers and user name, email and role (happy case)', async () => {
        mockGetUserFromToken(ADMIN);
        const savedLayer = await new Layer(createLayer({ userId: USER.id })).save();
        const foundLayer = await Layer.findById(savedLayer._id);

        createMockUser([USER]);

        const list = await requester.get('/api/v1/layer')
            .set('Authorization', `Bearer abcd`)
            .query({
                includes: 'user',
            });

        list.body.should.have.property('data').and.be.an('array').and.length.above(0);
        ensureCorrectLayer(list.body.data[0], foundLayer.toObject(), {
            user: {
                email: USER.email,
                name: USER.name,
                role: USER.role
            }
        });
    });

    it('Getting layers with ADMIN role and includes=user should return a list of layers and user name, email and role, even if only partial data exists', async () => {
        mockGetUserFromToken(ADMIN);
        const savedLayerOne = await new Layer(createLayer()).save();
        const savedLayerTwo = await new Layer(createLayer()).save();
        const savedLayerThree = await new Layer(createLayer()).save();
        const foundLayerOne = await Layer.findById(savedLayerOne._id);
        const foundLayerTwo = await Layer.findById(savedLayerTwo._id);
        const foundLayerThree = await Layer.findById(savedLayerThree._id);

        createMockUser([{
            ...USER,
            id: foundLayerOne.userId,
            email: 'user-one@control-tower.org',
            name: 'test user',
            role: 'USER'
        }]);
        createMockUser([{
            ...MANAGER,
            id: foundLayerTwo.userId,
            name: undefined,
            email: 'user-two@control-tower.org',
            role: 'MANAGER'
        }]);
        createMockUser([{
            ...ADMIN,
            id: foundLayerThree.userId,
            email: undefined,
            name: 'user three',
            role: 'MANAGER'
        }]);

        const list = await requester.get('/api/v1/layer')
            .set('Authorization', `Bearer abcd`)
            .query({
                includes: 'user',
            });

        list.body.should.have.property('data').and.be.an('array').and.length.above(0);
        ensureCorrectLayer(list.body.data.find((layer) => layer.id === foundLayerOne.id), foundLayerOne.toObject(), {
            user: {
                email: 'user-one@control-tower.org',
                name: 'test user',
                role: 'USER'
            }
        });
        ensureCorrectLayer(list.body.data.find((layer) => layer.id === foundLayerTwo.id), foundLayerTwo.toObject(), {
            user: {
                email: 'user-two@control-tower.org',
                role: 'MANAGER'
            }
        });
        ensureCorrectLayer(list.body.data.find((layer) => layer.id === foundLayerThree.id), foundLayerThree.toObject(), {
            user: {
                name: 'user three',
                role: 'MANAGER'
            }
        });
    });

    it('Getting layers filtered by user.role should not return a query param "usersRole" in the pagination links', async () => {
        mockGetUserFromToken(ADMIN);
        await new Layer(createLayer()).save();
        createMockUserRole('ADMIN', ADMIN.id);

        const list = await requester
            .get('/api/v1/layer?user.role=ADMIN')
            .set('Authorization', `Bearer abcd`);

        list.body.should.have.property('links').and.be.an('object');
        list.body.links.should.have.property('self').and.not.includes('usersRole=');
        list.body.links.should.have.property('next').and.not.includes('usersRole=');
        list.body.links.should.have.property('prev').and.not.includes('usersRole=');
        list.body.links.should.have.property('first').and.not.includes('usersRole=');
        list.body.links.should.have.property('last').and.not.includes('usersRole=');
    });

    /**
     * We'll want to limit the maximum page size in the future
     * However, as this will cause a production BC break, we can't enforce it just now
     */
    // it('Getting layers with page size over 100 should return 400 Bad Request', async () => {
    //     const list = await requester.get('/api/v1/layer?page[size]=101');
    //     list.status.should.equal(400);
    //     list.body.errors[0].should.have.property('detail').and.equal('Invalid page size');
    // });

    afterEach(async () => {
        await Layer.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
