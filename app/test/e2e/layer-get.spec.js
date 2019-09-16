const nock = require('nock');
const Layer = require('models/layer.model');
const { getTestServer } = require('./test-server');
const { createLayer, ensureCorrectLayer } = require('./utils/helpers');

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
        const testLayer = createLayer();
        await new Layer(testLayer).save();

        const list = await requester.get('/api/v1/layer');
        list.body.should.have.property('data').and.be.an('array').and.length.above(0);
        ensureCorrectLayer(list.body.data[0], testLayer);
    });

    it('Getting layers as anonymous user with includes=user should return a list of layers and no user data (happy case)', async () => {
        const testLayer = createLayer();
        await new Layer(testLayer).save();

        const list = await requester.get('/api/v1/layer');
        list.body.should.have.property('data').and.be.an('array').and.length.above(0);
        ensureCorrectLayer(list.body.data[0], testLayer);
    });

    it('Getting layers with USER role and includes=user should return a list of layers and user name and email (happy case)', async () => {
        const testLayer = createLayer();
        await new Layer(testLayer).save();

        const list = await requester.get('/api/v1/layer');
        list.body.should.have.property('data').and.be.an('array').and.length.above(0);
        ensureCorrectLayer(list.body.data[0], testLayer);
    });

    afterEach(() => {
        Layer.remove({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
