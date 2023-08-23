const nock = require('nock');
const chai = require('chai');
const Layer = require('models/layer.model');
const { createLayer, mockValidateRequestWithApiKey } = require('./utils/helpers');

const { getTestServer } = require('./utils/test-server');

chai.should();

let requester;

let layerOne;
let layerTwo;
let layerThree;

describe('Sort layers tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        await Layer.deleteMany({}).exec();

        layerOne = await new Layer(createLayer({ provider: 'cartodb' })).save();
        layerTwo = await new Layer(createLayer({ provider: 'json' })).save();
        layerThree = await new Layer(createLayer({ provider: 'gee' })).save();

        requester = await getTestServer();
    });

    it('Sort layers by non-existent field (implicit order)', async () => {
        mockValidateRequestWithApiKey({});
        const responseOne = await requester
            .get(`/api/v1/layer`)
            .set('x-api-key', 'api-key-test')
            .query({ sort: 'potato' });

        const layersOne = responseOne.body.data;

        responseOne.status.should.equal(200);
        responseOne.body.should.have.property('data').with.lengthOf(3);
        responseOne.body.should.have.property('links').and.be.an('object');

        const layerIds = layersOne.map((layer) => layer.id);

        layerIds.should.contain(layerTwo._id);
        layerIds.should.contain(layerOne._id);
    });

    it('Sort layers by provider (implicit order)', async () => {
        mockValidateRequestWithApiKey({});
        const responseOne = await requester
            .get(`/api/v1/layer`)
            .set('x-api-key', 'api-key-test')
            .query({ sort: 'provider' });
        const layersOne = responseOne.body.data;

        responseOne.status.should.equal(200);
        responseOne.body.should.have.property('data').with.lengthOf(3);
        responseOne.body.should.have.property('links').and.be.an('object');

        const layerIdsOne = layersOne.map((layer) => layer.id);

        layerIdsOne[0].should.equal(layerOne._id);
        layerIdsOne[1].should.equal(layerThree._id);
        layerIdsOne[2].should.equal(layerTwo._id);
    });

    it('Sort layers by provider (explicit asc order)', async () => {
        mockValidateRequestWithApiKey({});
        const responseOne = await requester
            .get(`/api/v1/layer`)
            .set('x-api-key', 'api-key-test')
            .query({ sort: '+provider' });

        const layersOne = responseOne.body.data;

        responseOne.status.should.equal(200);
        responseOne.body.should.have.property('data').with.lengthOf(3);
        responseOne.body.should.have.property('links').and.be.an('object');

        const layerIdsOne = layersOne.map((layer) => layer.id);

        layerIdsOne[0].should.equal(layerOne._id);
        layerIdsOne[1].should.equal(layerThree._id);
        layerIdsOne[2].should.equal(layerTwo._id);
    });

    it('Sort layers by provider (explicit desc order)', async () => {
        mockValidateRequestWithApiKey({});
        const responseOne = await requester
            .get(`/api/v1/layer`)
            .set('x-api-key', 'api-key-test')
            .query({ sort: '-provider' });

        const layersOne = responseOne.body.data;

        responseOne.status.should.equal(200);
        responseOne.body.should.have.property('data').with.lengthOf(3);
        responseOne.body.should.have.property('links').and.be.an('object');

        const layerIdsOne = layersOne.map((layer) => layer.id);

        layerIdsOne[0].should.equal(layerTwo._id);
        layerIdsOne[1].should.equal(layerThree._id);
        layerIdsOne[2].should.equal(layerOne._id);
    });

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });

    after(async () => {
        await Layer.deleteMany({}).exec();
    });
});
