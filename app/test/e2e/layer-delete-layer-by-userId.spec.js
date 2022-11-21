const nock = require('nock');
const chai = require('chai');
const Layer = require('models/layer.model');
const { getTestServer } = require('./utils/test-server');
const {
    ensureCorrectError, createLayer, mockGetUserFromToken
} = require('./utils/helpers');
const { USERS } = require('./utils/test.constants');

chai.should();

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

let requester;

describe('Delete all layers for a user', async () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('Deleting all layers of an user without being authenticated should return a 401 "Not authorized" error', async () => {
        const response = await requester.delete(`/api/v1/layer/by-user/${USERS.USER.id}`);
        response.status.should.equal(401);
        ensureCorrectError(response.body, 'Unauthorized');
    });

    it('Deleting all layers of an user while being authenticated as USER that is not the owner of layers or admin should return a 403 "Forbidden" error', async () => {
        mockGetUserFromToken(USERS.MANAGER);
        await new Layer(createLayer({ application: ['rw'], dataset: '123', userId: USERS.USER.id })).save();

        const response = await requester
            .delete(`/api/v1/layer/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .send();

        response.status.should.equal(403);
        ensureCorrectError(response.body, 'Forbidden');
    });

    it('Deleting all layers of an user while being authenticated as ADMIN should return a 200 and all layers deleted', async () => {
        mockGetUserFromToken(USERS.ADMIN);

        nock(process.env.GATEWAY_URL)
            .get(`/auth/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    ...USERS.USER,
                }
            });

        const layerOne = await new Layer(createLayer({
            env: 'staging', application: ['rw'], dataset: '123', userId: USERS.USER.id
        })).save();
        const layerTwo = await new Layer(createLayer({
            env: 'production', application: ['gfw'], dataset: '123', userId: USERS.USER.id
        })).save();
        const fakeLayerFromAdmin = await new Layer(createLayer({
            env: 'staging', application: ['rw'], dataset: '123', userId: USERS.ADMIN.id
        })).save();
        const fakeLayerFromManager = await new Layer(createLayer({
            env: 'production', application: ['gfw'], dataset: '123', userId: USERS.MANAGER.id
        })).save();

        const response = await requester
            .delete(`/api/v1/layer/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .send();
        response.status.should.equal(200);
        response.body.deletedLayers.map((elem) => elem.attributes.name).sort().should.eql([layerOne.name, layerTwo.name].sort());
        response.body.deletedLayers.map((elem) => elem.attributes.userId).sort().should.eql([layerOne.userId, layerTwo.userId].sort());
        response.body.deletedLayers.map((elem) => elem.attributes.dataset).sort().should.eql([layerOne.dataset, layerTwo.dataset].sort());

        const findLayerByUser = await Layer.find({ userId: { $eq: USERS.USER.id } }).exec();
        findLayerByUser.should.be.an('array').with.lengthOf(0);

        const findAllLayers = await Layer.find({}).exec();
        findAllLayers.should.be.an('array').with.lengthOf(2);

        const layerNames = findAllLayers.map((layer) => layer.name);
        layerNames.should.contain(fakeLayerFromManager.name);
        layerNames.should.contain(fakeLayerFromAdmin.name);
    });

    it('Deleting all layers of an user while being authenticated as a microservice should return a 200 and all layers deleted', async () => {
        mockGetUserFromToken(USERS.MICROSERVICE);
        const layerOne = await new Layer(createLayer({
            env: 'staging', application: ['rw'], dataset: '123', userId: USERS.USER.id
        })).save();
        const layerTwo = await new Layer(createLayer({
            env: 'production', application: ['gfw'], dataset: '123', userId: USERS.USER.id
        })).save();
        const fakeLayerFromAdmin = await new Layer(createLayer({
            env: 'staging', application: ['rw'], dataset: '123', userId: USERS.ADMIN.id
        })).save();
        const fakeLayerFromManager = await new Layer(createLayer({
            env: 'production', application: ['gfw'], dataset: '123', userId: USERS.MANAGER.id
        })).save();

        nock(process.env.GATEWAY_URL)
            .get(`/auth/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    ...USERS.USER,
                }
            });

        const response = await requester
            .delete(`/api/v1/layer/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .send();
        response.status.should.equal(200);
        response.body.deletedLayers.map((elem) => elem.attributes.name).sort().should.eql([layerOne.name, layerTwo.name].sort());
        response.body.deletedLayers.map((elem) => elem.attributes.userId).sort().should.eql([layerOne.userId, layerTwo.userId].sort());
        response.body.deletedLayers.map((elem) => elem.attributes.dataset).sort().should.eql([layerOne.dataset, layerTwo.dataset].sort());

        const findLayerByUser = await Layer.find({ userId: { $eq: USERS.USER.id } }).exec();
        findLayerByUser.should.be.an('array').with.lengthOf(0);

        const findAllLayers = await Layer.find({}).exec();
        findAllLayers.should.be.an('array').with.lengthOf(2);

        const layerNames = findAllLayers.map((layer) => layer.name);
        layerNames.should.contain(fakeLayerFromManager.name);
        layerNames.should.contain(fakeLayerFromAdmin.name);
    });

    it('Deleting a layer owned by a user that does not exist as a MICROSERVICE should return a 404', async () => {
        mockGetUserFromToken(USERS.MICROSERVICE);

        nock(process.env.GATEWAY_URL)
            .get(`/auth/user/potato`)
            .reply(403, {
                errors: [
                    {
                        status: 403,
                        detail: 'Not authorized'
                    }
                ]
            });

        const deleteResponse = await requester
            .delete(`/api/v1/layer/by-user/potato`)
            .set('Authorization', `Bearer abcd`)
            .send();

        deleteResponse.status.should.equal(404);
        deleteResponse.body.should.have.property('errors').and.be.an('array');
        deleteResponse.body.errors[0].should.have.property('detail').and.equal(`User potato does not exist`);
    });

    it('Deleting all layers of an user while being authenticated as that same user should return a 200 and all layers deleted', async () => {
        mockGetUserFromToken(USERS.USER);
        const layerOne = await new Layer(createLayer({
            env: 'staging', application: ['rw'], dataset: '123', userId: USERS.USER.id
        })).save();
        const layerTwo = await new Layer(createLayer({
            env: 'production', application: ['gfw'], dataset: '123', userId: USERS.USER.id
        })).save();
        const fakeLayerFromAdmin = await new Layer(createLayer({
            env: 'staging', application: ['rw'], dataset: '123', userId: USERS.ADMIN.id
        })).save();
        const fakeLayerFromManager = await new Layer(createLayer({
            env: 'production', application: ['gfw'], dataset: '123', userId: USERS.MANAGER.id
        })).save();

        nock(process.env.GATEWAY_URL)
            .get(`/auth/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    ...USERS.USER,
                }
            });

        const response = await requester
            .delete(`/api/v1/layer/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .send();
        response.status.should.equal(200);
        response.body.deletedLayers.map((elem) => elem.attributes.name).sort().should.eql([layerOne.name, layerTwo.name].sort());
        response.body.deletedLayers.map((elem) => elem.attributes.userId).sort().should.eql([layerOne.userId, layerTwo.userId].sort());
        response.body.deletedLayers.map((elem) => elem.attributes.dataset).sort().should.eql([layerOne.dataset, layerTwo.dataset].sort());

        const findLayerByUser = await Layer.find({ userId: { $eq: USERS.USER.id } }).exec();
        findLayerByUser.should.be.an('array').with.lengthOf(0);

        const findAllLayers = await Layer.find({}).exec();
        findAllLayers.should.be.an('array').with.lengthOf(2);

        const layerNames = findAllLayers.map((layer) => layer.name);
        layerNames.should.contain(fakeLayerFromManager.name);
        layerNames.should.contain(fakeLayerFromAdmin.name);
    });

    it('Deleting all layers of an user while being authenticated as USER should return a 200 and all layers deleted - no layers in the db', async () => {
        mockGetUserFromToken(USERS.USER);

        nock(process.env.GATEWAY_URL)
            .get(`/auth/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    ...USERS.USER,
                }
            });

        const response = await requester
            .delete(`/api/v1/layer/by-user/${USERS.USER.id}`)
            .set('Authorization', 'Bearer abcd')
            .send();

        response.status.should.equal(200);
        response.body.deletedLayers.should.be.an('array').with.lengthOf(0);
    });

    it('Deleting layers while some of them are protected should only delete unprotected ones', async () => {
        mockGetUserFromToken(USERS.USER);

        await Promise.all([...Array(100)].map(async () => {
            await new Layer(createLayer({
                env: 'staging', application: ['rw'], dataset: '123', userId: USERS.USER.id
            })).save();
            await new Layer(createLayer({
                env: 'production', application: ['gfw'], dataset: '123', userId: USERS.USER.id
            })).save();
            await new Layer(createLayer({
                env: 'production', application: ['gfw'], dataset: '123', userId: USERS.USER.id, protected: true
            })).save();
            await new Layer(createLayer({
                env: 'staging', application: ['rw'], dataset: '123', userId: USERS.ADMIN.id
            })).save();
            await new Layer(createLayer({
                env: 'production', application: ['gfw'], dataset: '123', userId: USERS.MANAGER.id
            })).save();
        }));

        nock(process.env.GATEWAY_URL)
            .get(`/auth/user/${USERS.USER.id}`)
            .reply(200, {
                data: {
                    ...USERS.USER,
                }
            });

        const deleteResponse = await requester
            .delete(`/api/v1/layer/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .send();

        deleteResponse.status.should.equal(200);
        deleteResponse.body.deletedLayers.should.be.an('array').and.with.lengthOf(200);
        deleteResponse.body.protectedLayers.should.be.an('array').and.with.lengthOf(100);

        const { deletedLayers } = deleteResponse.body;
        deletedLayers.forEach((layer) => {
            layer.attributes.protected.should.equal(false);
            layer.attributes.userId.should.equal(USERS.USER.id);
        });

        const { protectedLayers } = deleteResponse.body;
        protectedLayers.forEach((layer) => {
            layer.attributes.protected.should.equal(true);
            layer.attributes.userId.should.equal(USERS.USER.id);
        });

        const findLayerByUser = await Layer.find({ userId: { $eq: USERS.USER.id } }).exec();
        findLayerByUser.should.be.an('array').with.lengthOf(100);
        findLayerByUser.forEach((layer) => {
            layer.protected.should.equal(true);
            layer.userId.should.equal(USERS.USER.id);
        });

        const findLayerByAdminUser = await Layer.find({ userId: { $eq: USERS.ADMIN.id } }).exec();
        findLayerByAdminUser.should.be.an('array').with.lengthOf(100);
        findLayerByAdminUser.forEach((layer) => {
            layer.protected.should.equal(false);
            layer.userId.should.equal(USERS.ADMIN.id);
        });

        const findAllLayers = await Layer.find({}).exec();
        findAllLayers.should.be.an('array').with.lengthOf(300);
    });

    afterEach(async () => {
        await Layer.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
