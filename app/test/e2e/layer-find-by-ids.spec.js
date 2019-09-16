/* eslint-disable no-unused-vars,no-undef */
const nock = require('nock');
const chai = require('chai');
const Layer = require('models/layer.model');
const { createLayer } = require('./utils/helpers');

const { getTestServer } = require('./test-server');

const should = chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

let layerOne;
let layerTwo;


describe('Find layers by IDs', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        Layer.remove({}).exec();
    });

    it('Find layers without ids in body returns a 400 error', async () => {
        const response = await requester
            .post(`/api/v1/layer/find-by-ids`)
            .send({});

        response.status.should.equal(400);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal(`Bad request - Missing 'ids' from request body`);
    });

    it('Find layers with empty id list returns an empty list (empty db)', async () => {
        const response = await requester
            .post(`/api/v1/layer/find-by-ids`)
            .send({
                ids: []
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(0);
    });

    it('Find layers with id list containing layer that does not exist returns an empty list (empty db)', async () => {
        const response = await requester
            .post(`/api/v1/layer/find-by-ids`)
            .send({
                ids: ['abcd']
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(0);
    });

    it('Find layers with id list containing layer that does not exist returns an empty list (empty db)', async () => {
        const response = await requester
            .post(`/api/v1/layer/find-by-ids`)
            .send({
                ids: ['abcd']
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('array').and.length(0);
    });

    it('Find layers with id list containing a layer that exists returns only the listed layer', async () => {
        layerOne = await new Layer(createLayer()).save();
        layerTwo = await new Layer(createLayer()).save();

        const response = await requester
            .post(`/api/v1/layer/find-by-ids`)
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

    it('Find layers with id list containing layers that exist returns the listed layers', async () => {
        const response = await requester
            .post(`/api/v1/layer/find-by-ids`)
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

    it('Find layers with id list containing layers that exist returns the listed layers', async () => {
        const response = await requester
            .post(`/api/v1/layer/find-by-ids?ids=${layerTwo.dataset}`)
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

    afterEach(() => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });

    after(() => {
        Layer.remove({}).exec();
    });
});
