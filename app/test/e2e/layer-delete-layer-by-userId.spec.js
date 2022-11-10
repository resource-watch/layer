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
        response.body.deletedLayers.data[0].attributes.name.should.equal(layerOne.name);
        response.body.deletedLayers.data[0].attributes.userId.should.equal(layerOne.userId);
        response.body.deletedLayers.data[0].attributes.dataset.should.equal(layerOne.dataset);
        response.body.deletedLayers.data[1].attributes.name.should.equal(layerTwo.name);
        response.body.deletedLayers.data[1].attributes.userId.should.equal(layerTwo.userId);
        response.body.deletedLayers.data[1].attributes.dataset.should.equal(layerTwo.dataset);

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

        const response = await requester
            .delete(`/api/v1/layer/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .send();
        response.status.should.equal(200);
        response.body.deletedLayers.data[0].attributes.name.should.equal(layerOne.name);
        response.body.deletedLayers.data[0].attributes.userId.should.equal(layerOne.userId);
        response.body.deletedLayers.data[0].attributes.dataset.should.equal(layerOne.dataset);
        response.body.deletedLayers.data[1].attributes.name.should.equal(layerTwo.name);
        response.body.deletedLayers.data[1].attributes.userId.should.equal(layerTwo.userId);
        response.body.deletedLayers.data[1].attributes.dataset.should.equal(layerTwo.dataset);

        const findLayerByUser = await Layer.find({ userId: { $eq: USERS.USER.id } }).exec();
        findLayerByUser.should.be.an('array').with.lengthOf(0);

        const findAllLayers = await Layer.find({}).exec();
        findAllLayers.should.be.an('array').with.lengthOf(2);

        const layerNames = findAllLayers.map((layer) => layer.name);
        layerNames.should.contain(fakeLayerFromManager.name);
        layerNames.should.contain(fakeLayerFromAdmin.name);
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

        const response = await requester
            .delete(`/api/v1/layer/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .send();
        response.status.should.equal(200);
        response.body.deletedLayers.data[0].attributes.name.should.equal(layerOne.name);
        response.body.deletedLayers.data[0].attributes.userId.should.equal(layerOne.userId);
        response.body.deletedLayers.data[0].attributes.dataset.should.equal(layerOne.dataset);
        response.body.deletedLayers.data[1].attributes.name.should.equal(layerTwo.name);
        response.body.deletedLayers.data[1].attributes.userId.should.equal(layerTwo.userId);
        response.body.deletedLayers.data[1].attributes.dataset.should.equal(layerTwo.dataset);

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

        const response = await requester
            .delete(`/api/v1/layer/by-user/${USERS.USER.id}`)
            .set('Authorization', 'Bearer abcd')
            .send();

        response.status.should.equal(200);
        response.body.deletedLayers.data.should.be.an('array').with.lengthOf(0);
    });

    it('Deleting layers while some of them are protected should only delete unprotected ones', async () => {
        mockGetUserFromToken(USERS.USER);

        const layerOne = await new Layer(createLayer({
            env: 'staging', application: ['rw'], dataset: '123', userId: USERS.USER.id
        })).save();
        const layerTwo = await new Layer(createLayer({
            env: 'production', application: ['gfw'], dataset: '123', userId: USERS.USER.id
        })).save();
        const layerThree = await new Layer(createLayer({
            env: 'production', application: ['gfw'], dataset: '123', userId: USERS.USER.id, protected: true
        })).save();
        const fakeLayerFromAdmin = await new Layer(createLayer({
            env: 'staging', application: ['rw'], dataset: '123', userId: USERS.ADMIN.id
        })).save();
        const fakeLayerFromManager = await new Layer(createLayer({
            env: 'production', application: ['gfw'], dataset: '123', userId: USERS.MANAGER.id
        })).save();

        const deleteResponse = await requester
            .delete(`/api/v1/layer/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`)
            .send();

        deleteResponse.status.should.equal(200);
        deleteResponse.body.deletedLayers.should.have.property('data').with.lengthOf(2);
        deleteResponse.body.protectedLayers.should.have.property('data').with.lengthOf(1);

        const deletedLayers = deleteResponse.body.deletedLayers.data;
        let layerIds = deletedLayers.map((layer) => layer.id);
        layerIds.should.contain(layerOne._id);
        layerIds.should.contain(layerTwo._id);

        const protectedLayers = deleteResponse.body.protectedLayers.data;
        layerIds = protectedLayers.map((layer) => layer.id);
        layerIds.should.contain(layerThree._id);

        const findLayerByUser = await Layer.find({ userId: { $eq: USERS.USER.id } }).exec();
        findLayerByUser.should.be.an('array').with.lengthOf(1);
        layerIds = findLayerByUser.map((layer) => layer._id);
        layerIds.should.contain(layerThree._id);

        const findAllLayers = await Layer.find({}).exec();
        findAllLayers.should.be.an('array').with.lengthOf(3);

        layerIds = findAllLayers.map((layer) => layer._id);
        layerIds.should.contain(fakeLayerFromAdmin._id);
        layerIds.should.contain(fakeLayerFromManager._id);
        layerIds.should.contain(layerThree._id);
    });

    afterEach(async () => {
        await Layer.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
