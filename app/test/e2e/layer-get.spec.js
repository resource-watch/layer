const nock = require('nock');
const Layer = require('models/layer.model');
const chai = require('chai');
const { getTestServer } = require('./utils/test-server');
const { createLayer, ensureCorrectLayer } = require('./utils/helpers');
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

    it('Getting layers as ADMIN with query params user.role = ADMIN should return a list of layers created by ADMIN users (happy case)', async () => {
        const savedLayer = await new Layer(createLayer({ userId: ADMIN.id })).save();
        const foundLayer = await Layer.findById(savedLayer._id);
        await new Layer(createLayer({ userId: USER.id })).save();

        createMockUserRole('ADMIN', ADMIN.id);

        const list = await requester.get('/api/v1/layer').query({
            'user.role': 'ADMIN',
            loggedUser: JSON.stringify(ADMIN)
        });

        list.body.should.have.property('data').and.be.an('array').and.length(1);
        ensureCorrectLayer(list.body.data[0], foundLayer.toObject());
    });

    it('Getting layers as ADMIN with query params user.role = MANAGER should return a list of layers created by MANAGER users (happy case)', async () => {
        const savedLayer = await new Layer(createLayer({ userId: MANAGER.id })).save();
        const foundLayer = await Layer.findById(savedLayer._id);
        await new Layer(createLayer({ userId: USER.id })).save();

        createMockUserRole('MANAGER', MANAGER.id);

        const list = await requester.get('/api/v1/layer').query({
            'user.role': 'MANAGER',
            loggedUser: JSON.stringify(SUPERADMIN)
        });

        list.body.should.have.property('data').and.be.an('array').and.length(1);
        ensureCorrectLayer(list.body.data[0], foundLayer.toObject());
    });

    it('Getting layers as ADMIN with query params user.role = USER should return a list of layers created by USER (happy case)', async () => {
        const savedLayer = await new Layer(createLayer({ userId: USER.id })).save();
        const foundLayer = await Layer.findById(savedLayer._id);
        await new Layer(createLayer({ userId: MANAGER.id })).save();

        createMockUserRole('USER', USER.id);

        const list = await requester.get('/api/v1/layer').query({
            'user.role': 'USER',
            loggedUser: JSON.stringify(ADMIN)
        });

        list.body.should.have.property('data').and.be.an('array').and.length(1);
        ensureCorrectLayer(list.body.data[0], foundLayer.toObject());
    });

    it('Getting layers as USER with query params user.role = USER and should return an unfiltered list of layers (happy case)', async () => {
        const savedLayer = await new Layer(createLayer({ userId: USER.id })).save();
        const foundLayer = await Layer.findById(savedLayer._id);
        await new Layer(createLayer({ userId: MANAGER.id })).save();

        const list = await requester.get('/api/v1/layer').query({
            'user.role': 'USER',
            loggedUser: JSON.stringify(USER)
        });

        list.body.should.have.property('data').and.be.an('array').and.length(2);
        ensureCorrectLayer(list.body.data[0], foundLayer.toObject());
    });

    it('Getting layers as MANAGER with query params user.role = USER and should return an unfiltered list of layers (happy case)', async () => {
        const savedLayer = await new Layer(createLayer({ userId: USER.id })).save();
        const foundLayer = await Layer.findById(savedLayer._id);
        await new Layer(createLayer({ userId: MANAGER.id })).save();

        const list = await requester.get('/api/v1/layer').query({
            'user.role': 'USER',
            loggedUser: JSON.stringify(MANAGER)
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
        const savedLayer = await new Layer(createLayer({ userId: USER.id })).save();
        const foundLayer = await Layer.findById(savedLayer._id);

        createMockUser([USER]);

        const list = await requester.get('/api/v1/layer')
            .query({
                includes: 'user',
                loggedUser: JSON.stringify(USER)
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
        const savedLayer = await new Layer(createLayer({ userId: USER.id })).save();
        const foundLayer = await Layer.findById(savedLayer._id);

        createMockUser([USER]);

        const list = await requester.get('/api/v1/layer')
            .query({
                includes: 'user',
                loggedUser: JSON.stringify(MANAGER)
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
        const savedLayer = await new Layer(createLayer({ userId: USER.id })).save();
        const foundLayer = await Layer.findById(savedLayer._id);

        createMockUser([USER]);

        const list = await requester.get('/api/v1/layer')
            .query({
                includes: 'user',
                loggedUser: JSON.stringify(ADMIN)
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
            .query({
                includes: 'user',
                loggedUser: JSON.stringify(ADMIN)
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
        await new Layer(createLayer()).save();
        createMockUserRole('ADMIN', ADMIN.id);

        const list = await requester
            .get('/api/v1/layer?user.role=ADMIN')
            .query({ loggedUser: JSON.stringify(ADMIN) });

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
