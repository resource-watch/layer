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

const should = chai.should();

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

        const list = await requester.get('/api/v1/layer');
        list.body.should.have.property('data').and.be.an('array').and.length.above(0);
        ensureCorrectLayer(list.body.data[0], savedLayer.toObject());
    });

    it('Getting layers as ADMIN with query params user.role = ADMIN should return a list of layers created by ADMIN users (happy case)', async () => {
        const savedLayer = await new Layer(createLayer(null, null, null, ADMIN.id)).save();
        await new Layer(createLayer(null, null, null, USER.id)).save();

        createMockUserRole('ADMIN', ADMIN.id);

        const list = await requester.get('/api/v1/layer').query({
            'user.role': 'ADMIN',
            loggedUser: JSON.stringify(ADMIN)
        });

        list.body.should.have.property('data').and.be.an('array').and.length(1);
        ensureCorrectLayer(list.body.data[0], savedLayer.toObject());
    });

    it('Getting layers as ADMIN with query params user.role = MANAGER should return a list of layers created by MANAGER users (happy case)', async () => {
        const savedLayer = await new Layer(createLayer(null, null, null, MANAGER.id)).save();
        await new Layer(createLayer(null, null, null, USER.id)).save();

        createMockUserRole('MANAGER', MANAGER.id);

        const list = await requester.get('/api/v1/layer').query({
            'user.role': 'MANAGER',
            loggedUser: JSON.stringify(SUPERADMIN)
        });

        list.body.should.have.property('data').and.be.an('array').and.length(1);
        ensureCorrectLayer(list.body.data[0], savedLayer.toObject());
    });

    it('Getting layers as ADMIN with query params user.role = USER should return a list of layers created by USER (happy case)', async () => {
        const savedLayer = await new Layer(createLayer(null, null, null, USER.id)).save();
        await new Layer(createLayer(null, null, null, MANAGER.id)).save();

        createMockUserRole('USER', USER.id);

        const list = await requester.get('/api/v1/layer').query({
            'user.role': 'USER',
            loggedUser: JSON.stringify(ADMIN)
        });

        list.body.should.have.property('data').and.be.an('array').and.length(1);
        ensureCorrectLayer(list.body.data[0], savedLayer.toObject());
    });

    it('Getting layers as USER with query params user.role = USER and should return an unfiltered list of layers (happy case)', async () => {
        const savedLayer = await new Layer(createLayer(null, null, null, USER.id)).save();
        await new Layer(createLayer(null, null, null, MANAGER.id)).save();

        const list = await requester.get('/api/v1/layer').query({
            'user.role': 'USER',
            loggedUser: JSON.stringify(USER)
        });

        list.body.should.have.property('data').and.be.an('array').and.length(2);
        ensureCorrectLayer(list.body.data[0], savedLayer.toObject());
    });

    it('Getting layers as MANAGER with query params user.role = USER and should return an unfiltered list of layers (happy case)', async () => {
        const savedLayer = await new Layer(createLayer(null, null, null, USER.id)).save();
        await new Layer(createLayer(null, null, null, MANAGER.id)).save();

        const list = await requester.get('/api/v1/layer').query({
            'user.role': 'USER',
            loggedUser: JSON.stringify(MANAGER)
        });

        list.body.should.have.property('data').and.be.an('array').and.length(2);
        ensureCorrectLayer(list.body.data[0], savedLayer.toObject());
    });

    it('Getting layers as anonymous user with includes=user should return a list of layers and no user data (happy case)', async () => {
        const savedLayer = await new Layer(createLayer(null, null, null, USER.id)).save();

        createMockUser([USER]);

        const list = await requester.get('/api/v1/layer')
            .query({
                includes: 'user'
            });

        list.body.should.have.property('data').and.be.an('array').and.length.above(0);

        ensureCorrectLayer(list.body.data[0], savedLayer.toObject(), {
            user: {
                email: USER.email,
                name: USER.name
            }
        });
    });

    it('Getting layers with USER role and includes=user should return a list of layers and user name and email (happy case)', async () => {
        const savedLayer = await new Layer(createLayer(null, null, null, USER.id)).save();

        createMockUser([USER]);

        const list = await requester.get('/api/v1/layer')
            .query({
                includes: 'user',
                loggedUser: JSON.stringify(USER)
            });

        list.body.should.have.property('data').and.be.an('array').and.length.above(0);
        ensureCorrectLayer(list.body.data[0], savedLayer.toObject(), {
            user: {
                email: USER.email,
                name: USER.name
            }
        });
    });

    it('Getting layers with MANAGER role and includes=user should return a list of layers and user name and email (happy case)', async () => {
        const savedLayer = await new Layer(createLayer(null, null, null, USER.id)).save();

        createMockUser([USER]);

        const list = await requester.get('/api/v1/layer')
            .query({
                includes: 'user',
                loggedUser: JSON.stringify(MANAGER)
            });

        list.body.should.have.property('data').and.be.an('array').and.length.above(0);
        ensureCorrectLayer(list.body.data[0], savedLayer.toObject(), {
            user: {
                email: USER.email,
                name: USER.name
            }
        });
    });

    it('Getting layers with ADMIN role and includes=user should return a list of layers and user name, email and role (happy case)', async () => {
        const savedLayer = await new Layer(createLayer(null, null, null, USER.id)).save();

        createMockUser([USER]);

        const list = await requester.get('/api/v1/layer')
            .query({
                includes: 'user',
                loggedUser: JSON.stringify(ADMIN)
            });

        list.body.should.have.property('data').and.be.an('array').and.length.above(0);
        ensureCorrectLayer(list.body.data[0], savedLayer.toObject(), {
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

        createMockUser([{
            id: savedLayerOne.userId,
            role: 'USER',
            provider: 'local',
            email: 'user-one@control-tower.org',
            name: 'test user',
            extraUserData: {
                apps: [
                    'rw',
                    'gfw',
                    'gfw-climate',
                    'prep',
                    'aqueduct',
                    'forest-atlas'
                ]
            }
        }]);

        createMockUser([{
            id: savedLayerTwo.userId,
            role: 'MANAGER',
            provider: 'local',
            email: 'user-two@control-tower.org',
            extraUserData: {
                apps: [
                    'rw'
                ]
            }
        }]);

        createMockUser([{
            id: savedLayerThree.userId,
            role: 'MANAGER',
            provider: 'local',
            name: 'user three',
            extraUserData: {
                apps: [
                    'rw'
                ]
            }
        }]);

        const list = await requester.get('/api/v1/layer')
            .query({
                includes: 'user',
                loggedUser: JSON.stringify(ADMIN)
            });

        list.body.should.have.property('data').and.be.an('array').and.length.above(0);
        ensureCorrectLayer(list.body.data.find((layer) => layer.id === savedLayerOne.id), savedLayerOne.toObject(), {
            user: {
                email: 'user-one@control-tower.org',
                name: 'test user',
                role: 'USER'
            }
        });
        ensureCorrectLayer(list.body.data.find((layer) => layer.id === savedLayerTwo.id), savedLayerTwo.toObject(), {
            user: {
                email: 'user-two@control-tower.org',
                role: 'MANAGER'
            }
        });
        ensureCorrectLayer(list.body.data.find((layer) => layer.id === savedLayerThree.id), savedLayerThree.toObject(), {
            user: {
                name: 'user three',
                role: 'MANAGER'
            }
        });
    });

    afterEach(async () => {
        await Layer.remove({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
