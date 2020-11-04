const nock = require('nock');
const chai = require('chai');
const Layer = require('models/layer.model');
const { getTestServer } = require('./utils/test-server');
const { ensureCorrectError, createLayer } = require('./utils/helpers');
const { USERS } = require('./utils/test.constants');

chai.should();

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

let requester;

const expireLayerCache = async (role) => {
    const layer = createLayer({ application: ['rw'], _id: '123' });
    await new Layer(layer).save();

    return requester
        .delete(`/api/v1/layer/123/expire-cache?loggedUser=${JSON.stringify(role)}`)
        .send();
};

describe('Expire layer cache', async () => {
    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();
    });

    it('Expiring layer cache without being authenticated should return a 401 "Not authorized" error', async () => {
        const datasetLayers = await requester.delete(`/api/v1/layer/123/expire-cache`);
        datasetLayers.status.should.equal(401);
        ensureCorrectError(datasetLayers.body, 'Not authorized');
    });

    it('Expiring layer cache while being authenticated as USER should return a 403 "Forbidden" error', async () => {
        const response = await expireLayerCache(USERS.USER);
        response.status.should.equal(403);
        ensureCorrectError(response.body, 'Forbidden');
    });

    it('Expiring layer cache while being authenticated as MANAGER should return a 403 "Forbidden" error', async () => {
        const response = await expireLayerCache(USERS.MANAGER);
        response.status.should.equal(403);
        ensureCorrectError(response.body, 'Forbidden');
    });

    it('Expiring layer cache while being authenticated as MICROSERVICE for a GEE layer should return a 200 and the response from the proxied MS', async () => {
        const layer = createLayer({ provider: 'gee' });
        await new Layer(layer).save();

        const reply = { result: 'OK' };

        nock(process.env.CT_URL)
            .delete(`/v1/layer/gee/${layer._id}/expire-cache`)
            .reply(200, reply);

        const response = await requester
            .delete(`/api/v1/layer/${layer._id}/expire-cache?loggedUser=${JSON.stringify(USERS.MICROSERVICE)}`)
            .send();

        response.status.should.equal(200);
        response.body.should.deep.equal(reply);
    });

    it('Expiring layer cache while being authenticated as MICROSERVICE for a LOCA layer should return a 200 and the response from the proxied MS', async () => {
        const layer = createLayer({ provider: 'loca' });
        await new Layer(layer).save();

        const reply = { result: 'OK' };

        nock(process.env.CT_URL)
            .delete(`/v1/layer/loca/${layer._id}/expire-cache`)
            .reply(200, reply);

        const response = await requester
            .delete(`/api/v1/layer/${layer._id}/expire-cache?loggedUser=${JSON.stringify(USERS.MICROSERVICE)}`)
            .send();

        response.status.should.equal(200);
        response.body.should.deep.equal(reply);
    });

    it('Expiring layer cache while being authenticated as MICROSERVICE for a NEXGDDP layer should return a 200 and the response from the proxied MS', async () => {
        const layer = createLayer({ provider: 'nexgddp' });
        await new Layer(layer).save();

        const reply = { result: 'OK' };

        nock(process.env.CT_URL)
            .delete(`/v1/layer/nexgddp/${layer._id}/expire-cache`)
            .reply(200, reply);

        const response = await requester
            .delete(`/api/v1/layer/${layer._id}/expire-cache?loggedUser=${JSON.stringify(USERS.MICROSERVICE)}`)
            .send();

        response.status.should.equal(200);
        response.body.should.deep.equal(reply);
    });

    it('Expiring layer cache while being authenticated as ADMIN for a GEE layer should return a 200 and the response from the proxied MS', async () => {
        const layer = createLayer({ provider: 'gee' });
        await new Layer(layer).save();

        const reply = { result: 'OK' };

        nock(process.env.CT_URL)
            .delete(`/v1/layer/gee/${layer._id}/expire-cache`)
            .reply(200, reply);

        const response = await requester
            .delete(`/api/v1/layer/${layer._id}/expire-cache?loggedUser=${JSON.stringify(USERS.ADMIN)}`)
            .send();

        response.status.should.equal(200);
        response.body.should.deep.equal(reply);
    });

    it('Expiring layer cache while being authenticated as ADMIN for a LOCA layer should return a 200 and the response from the proxied MS', async () => {
        const layer = createLayer({ provider: 'loca' });
        await new Layer(layer).save();

        const reply = { result: 'OK' };

        nock(process.env.CT_URL)
            .delete(`/v1/layer/loca/${layer._id}/expire-cache`)
            .reply(200, reply);

        const response = await requester
            .delete(`/api/v1/layer/${layer._id}/expire-cache?loggedUser=${JSON.stringify(USERS.ADMIN)}`)
            .send();

        response.status.should.equal(200);
        response.body.should.deep.equal(reply);
    });

    it('Expiring layer cache while being authenticated as ADMIN for a NEXGDDP layer should return a 200 and the response from the proxied MS', async () => {
        const layer = createLayer({ provider: 'nexgddp' });
        await new Layer(layer).save();

        const reply = { result: 'OK' };

        nock(process.env.CT_URL)
            .delete(`/v1/layer/nexgddp/${layer._id}/expire-cache`)
            .reply(200, reply);

        const response = await requester
            .delete(`/api/v1/layer/${layer._id}/expire-cache?loggedUser=${JSON.stringify(USERS.ADMIN)}`)
            .send();

        response.status.should.equal(200);
        response.body.should.deep.equal(reply);
    });

    it('Expiring layer cache while being authenticated as ADMIN for a NEXGDDP layer should return the same response code as the proxied MS call', async () => {
        const layer = createLayer({ provider: 'nexgddp' });
        await new Layer(layer).save();

        const reply = { result: 'OK' };

        nock(process.env.CT_URL)
            .delete(`/v1/layer/nexgddp/${layer._id}/expire-cache`)
            .reply(403, reply);

        const response = await requester
            .delete(`/api/v1/layer/${layer._id}/expire-cache?loggedUser=${JSON.stringify(USERS.ADMIN)}`)
            .send();

        response.status.should.equal(403);
        response.body.should.deep.equal({
            errors: [
                {
                    detail: JSON.stringify(reply),
                    status: 403
                }
            ]
        });
    });

    afterEach(async () => {
        await Layer.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
