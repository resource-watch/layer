const nock = require('nock');
const chai = require('chai');
const Layer = require('models/layer.model');
const { createLayer, mockGetUserFromToken, getUUID } = require('./utils/helpers');
const { USERS } = require('./utils/test.constants');

const { getTestServer } = require('./utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Find layers by IDs', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Layer.deleteMany({}).exec();
    });

    it('Find layers without being authenticated returns a 401', async () => {
        const response = await requester
            .post(`/api/v1/layer/find-by-ids`)
            .send({});

        response.status.should.equal(401);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`Unauthorized`);
    });

    it('Find layers without ids in body returns a 400 error', async () => {
        mockGetUserFromToken(USERS.USER);

        const response = await requester
            .post(`/api/v1/layer/find-by-ids`)
            .set('Authorization', `Bearer abcd`)
            .send({});

        response.status.should.equal(400);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`- ids: must be an array - `);
    });

    it('Find layers with empty id list returns an empty list (empty db)', async () => {
        mockGetUserFromToken(USERS.USER);

        const response = await requester
            .post(`/api/v1/layer/find-by-ids`)
            .set('Authorization', `Bearer abcd`)
            .send({
                ids: []
            });

        response.status.should.equal(400);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`- ids: must be an array of strings - `);
    });

    it('Find layers with id list containing layer that does not exist returns an empty list (empty db)', async () => {
        mockGetUserFromToken(USERS.USER);

        const response = await requester
            .post(`/api/v1/layer/find-by-ids`)
            .set('Authorization', `Bearer abcd`)
            .send({
                ids: ['abcd']
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(0);
    });

    it('Find layers with id list containing layer that does not exist returns an empty list (empty db)', async () => {
        mockGetUserFromToken(USERS.USER);

        const response = await requester
            .post(`/api/v1/layer/find-by-ids`)
            .set('Authorization', `Bearer abcd`)
            .send({
                ids: ['abcd']
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(0);
    });

    it('Find layers with id list containing a layer that exists returns only the listed layer', async () => {
        mockGetUserFromToken(USERS.USER);

        const layerOne = await new Layer(createLayer()).save();
        await new Layer(createLayer()).save();

        const response = await requester
            .post(`/api/v1/layer/find-by-ids`)
            .set('Authorization', `Bearer abcd`)
            .send({
                ids: [layerOne.dataset]
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);

        const responseLayerOne = response.body.data[0].attributes;

        responseLayerOne.should.have.property('name').and.equal(layerOne.name);
        responseLayerOne.should.have.property('application').and.be.an('array').and.deep.equal(layerOne.application);
        responseLayerOne.should.have.property('dataset').and.equal(layerOne.dataset);
        responseLayerOne.should.have.property('slug').and.equal(layerOne.slug);
        responseLayerOne.should.have.property('protected').and.equal(false);
        responseLayerOne.should.have.property('default').and.equal(true);
        responseLayerOne.should.have.property('published').and.equal(true);

        responseLayerOne.layerConfig.should.be.an.instanceOf(Object);
        responseLayerOne.legendConfig.should.be.an.instanceOf(Object);
        responseLayerOne.applicationConfig.should.be.an.instanceOf(Object);
        responseLayerOne.interactionConfig.should.be.an.instanceOf(Object);
        responseLayerOne.staticImageConfig.should.be.an.instanceOf(Object);
    });

    it('Find layers with id list containing layers that exist returns the listed layers (multiple results)', async () => {
        mockGetUserFromToken(USERS.USER);

        const layerOne = await new Layer(createLayer()).save();
        const layerTwo = await new Layer(createLayer()).save();

        const response = await requester
            .post(`/api/v1/layer/find-by-ids`)
            .set('Authorization', `Bearer abcd`)
            .send({
                ids: [layerOne.dataset, layerTwo.dataset]
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(2);

        const responseLayerOne = response.body.data[0].attributes;
        const responseLayerTwo = response.body.data[1].attributes;

        responseLayerOne.should.have.property('name').and.equal(layerOne.name);
        responseLayerOne.should.have.property('application').and.be.an('array').and.deep.equal(layerOne.application);
        responseLayerOne.should.have.property('dataset').and.equal(layerOne.dataset);
        responseLayerOne.should.have.property('slug').and.equal(layerOne.slug);
        responseLayerOne.should.have.property('protected').and.equal(false);
        responseLayerOne.should.have.property('default').and.equal(true);
        responseLayerOne.should.have.property('published').and.equal(true);

        responseLayerOne.layerConfig.should.be.an.instanceOf(Object);
        responseLayerOne.legendConfig.should.be.an.instanceOf(Object);
        responseLayerOne.applicationConfig.should.be.an.instanceOf(Object);
        responseLayerOne.interactionConfig.should.be.an.instanceOf(Object);
        responseLayerOne.staticImageConfig.should.be.an.instanceOf(Object);

        responseLayerTwo.should.have.property('name').and.equal(layerTwo.name);
        responseLayerTwo.should.have.property('application').and.be.an('array').and.deep.equal(layerTwo.application);
        responseLayerTwo.should.have.property('dataset').and.equal(layerTwo.dataset);
        responseLayerTwo.should.have.property('slug').and.equal(layerTwo.slug);
        responseLayerTwo.should.have.property('protected').and.equal(false);
        responseLayerTwo.should.have.property('default').and.equal(true);
        responseLayerTwo.should.have.property('published').and.equal(true);

        responseLayerTwo.layerConfig.should.be.an.instanceOf(Object);
        responseLayerTwo.legendConfig.should.be.an.instanceOf(Object);
        responseLayerTwo.applicationConfig.should.be.an.instanceOf(Object);
        responseLayerTwo.interactionConfig.should.be.an.instanceOf(Object);
        responseLayerTwo.staticImageConfig.should.be.an.instanceOf(Object);
    });

    it('Find layers by dataset id with single env filter returns the existing layers filtered by env (single result)', async () => {
        mockGetUserFromToken(USERS.USER);

        const layerOne = await new Layer(createLayer({ env: 'custom' })).save();
        const layerTwo = await new Layer(createLayer()).save();

        const response = await requester
            .post(`/api/v1/layer/find-by-ids`)
            .set('Authorization', `Bearer abcd`)
            .send({
                ids: [layerOne.dataset, layerTwo.dataset],
                env: 'custom'
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);

        const responseLayerOne = response.body.data[0].attributes;

        responseLayerOne.should.have.property('name').and.equal(layerOne.name);
        responseLayerOne.should.have.property('application').and.be.an('array').and.deep.equal(layerOne.application);
        responseLayerOne.should.have.property('dataset').and.equal(layerOne.dataset);
        responseLayerOne.should.have.property('env').and.equal('custom');
        responseLayerOne.should.have.property('slug').and.equal(layerOne.slug);
        responseLayerOne.should.have.property('protected').and.equal(false);
        responseLayerOne.should.have.property('default').and.equal(true);
        responseLayerOne.should.have.property('published').and.equal(true);

        responseLayerOne.layerConfig.should.be.an.instanceOf(Object);
        responseLayerOne.legendConfig.should.be.an.instanceOf(Object);
        responseLayerOne.applicationConfig.should.be.an.instanceOf(Object);
        responseLayerOne.interactionConfig.should.be.an.instanceOf(Object);
        responseLayerOne.staticImageConfig.should.be.an.instanceOf(Object);
    });

    it('Find layers by dataset id with multiple env filter returns the existing layers filtered by env (multiple results)', async () => {
        mockGetUserFromToken(USERS.USER);

        const layerOne = await new Layer(createLayer({ env: 'custom' })).save();
        await new Layer(createLayer({ env: 'potato', dataset: layerOne.dataset })).save();
        const layerThree = await new Layer(createLayer({ env: 'production', dataset: layerOne.dataset })).save();
        const layerFour = await new Layer(createLayer({ env: 'custom' })).save();
        await new Layer(createLayer({ env: 'potato', dataset: layerFour.dataset })).save();
        const layerSix = await new Layer(createLayer({ env: 'production', dataset: layerFour.dataset })).save();

        const response = await requester
            .post(`/api/v1/layer/find-by-ids`)
            .set('Authorization', `Bearer abcd`)
            .send({
                ids: [layerOne.dataset, layerFour.dataset, getUUID()],
                env: 'production,custom'
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(4);

        const ids = response.body.data.map((layer) => layer.id);
        ids.sort().should.deep.equal([layerOne.id, layerThree.id, layerFour.id, layerSix.id].sort());
    });

    it('Find layers with id list containing layers that exist returns the layers requested on the body, ignoring query param \'ids\'', async () => {
        mockGetUserFromToken(USERS.USER);

        const layerOne = await new Layer(createLayer()).save();
        const layerTwo = await new Layer(createLayer()).save();

        const response = await requester
            .post(`/api/v1/layer/find-by-ids?ids=${layerTwo.dataset}`)
            .set('Authorization', `Bearer abcd`)
            .send({
                ids: [layerOne.dataset]
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);

        const responseLayerOne = response.body.data[0].attributes;

        responseLayerOne.should.have.property('name').and.equal(layerOne.name);
        responseLayerOne.should.have.property('application').and.be.an('array').and.deep.equal(layerOne.application);
        responseLayerOne.should.have.property('dataset').and.equal(layerOne.dataset);
        responseLayerOne.should.have.property('slug').and.equal(layerOne.slug);
        responseLayerOne.should.have.property('protected').and.equal(false);
        responseLayerOne.should.have.property('default').and.equal(true);
        responseLayerOne.should.have.property('published').and.equal(true);

        responseLayerOne.layerConfig.should.be.an.instanceOf(Object);
        responseLayerOne.legendConfig.should.be.an.instanceOf(Object);
        responseLayerOne.applicationConfig.should.be.an.instanceOf(Object);
        responseLayerOne.interactionConfig.should.be.an.instanceOf(Object);
        responseLayerOne.staticImageConfig.should.be.an.instanceOf(Object);
    });

    it('Find layers with id list containing layers that exist returns the layers requested on the body, ignoring query param \'user.role\'', async () => {
        mockGetUserFromToken(USERS.USER);

        const layerOne = await new Layer(createLayer()).save();
        await new Layer(createLayer()).save();

        const response = await requester
            .post(`/api/v1/layer/find-by-ids?user.role=FAKE`)
            .set('Authorization', `Bearer abcd`)
            .send({
                ids: [layerOne.dataset]
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(1);

        const responseLayerOne = response.body.data[0].attributes;

        responseLayerOne.should.have.property('name').and.equal(layerOne.name);
        responseLayerOne.should.have.property('application').and.be.an('array').and.deep.equal(layerOne.application);
        responseLayerOne.should.have.property('dataset').and.equal(layerOne.dataset);
        responseLayerOne.should.have.property('slug').and.equal(layerOne.slug);
        responseLayerOne.should.have.property('protected').and.equal(false);
        responseLayerOne.should.have.property('default').and.equal(true);
        responseLayerOne.should.have.property('published').and.equal(true);

        responseLayerOne.layerConfig.should.be.an.instanceOf(Object);
        responseLayerOne.legendConfig.should.be.an.instanceOf(Object);
        responseLayerOne.applicationConfig.should.be.an.instanceOf(Object);
        responseLayerOne.interactionConfig.should.be.an.instanceOf(Object);
        responseLayerOne.staticImageConfig.should.be.an.instanceOf(Object);
    });

    afterEach(async () => {
        await Layer.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
