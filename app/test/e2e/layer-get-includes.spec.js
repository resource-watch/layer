const nock = require('nock');
const chai = require('chai');
const Layer = require('models/layer.model');
const { createLayer, mockValidateRequestWithApiKey } = require('./utils/helpers');

const { getTestServer } = require('./utils/test-server');
const { createMockVocabulary } = require('./utils/mocks');

chai.should();

let requester;

describe('Get layers with includes tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        await Layer.deleteMany({}).exec();

        requester = await getTestServer();
    });

    it('Get layers with includes vocabulary should return layer with associated vocabulary data (happy case)', async () => {
        mockValidateRequestWithApiKey({});
        const fakeLayerOne = await new Layer(createLayer()).save();

        const vocabularyResponse = [
            {
                id: 'resourcewatch',
                type: 'vocabulary',
                attributes: {
                    tags: [
                        'inuncoast',
                        'rp0002',
                        'historical',
                        'nosub'
                    ],
                    name: 'resourcewatch',
                    application: 'rw'
                }
            }
        ];

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .get(`/v1/dataset/${fakeLayerOne.dataset}/layer/${fakeLayerOne._id}/vocabulary`)
            .reply(200, {
                data: vocabularyResponse
            });

        const response = await requester
            .get(`/api/v1/layer?includes=vocabulary`)
            .set('x-api-key', 'api-key-test');

        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(1);
        response.body.should.have.property('links').and.be.an('object');

        response.body.data[0].should.have.property('attributes');
        response.body.data[0].attributes.should.have.property('vocabulary').and.be.an('array').and.deep.equal(vocabularyResponse);
    });

    it('Get layers with includes vocabulary should return layer with associated vocabulary data and filter by env (includes not filtered)', async () => {
        mockValidateRequestWithApiKey({});
        await new Layer(createLayer()).save();
        const fakeLayerOne = await new Layer(createLayer({ env: 'custom' })).save();

        const vocabularyResponse = [
            {
                id: 'resourcewatch',
                type: 'vocabulary',
                env: 'custom',
                attributes: {
                    tags: [
                        'inuncoast',
                        'rp0002',
                        'historical',
                        'nosub'
                    ],
                    name: 'resourcewatch',
                    application: 'rw'
                }
            }
        ];

        createMockVocabulary(vocabularyResponse, fakeLayerOne.dataset, fakeLayerOne._id);

        const response = await requester
            .get(`/api/v1/layer`)
            .set('x-api-key', 'api-key-test')
            .query({
                includes: 'vocabulary',
                env: 'custom'
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(1);
        response.body.should.have.property('links').and.be.an('object');

        response.body.data[0].should.have.property('attributes');
        response.body.data[0].attributes.should.have.property('vocabulary').and.be.an('array').and.deep.equal(vocabularyResponse);
    });

    it('Get layers with includes vocabulary should return layer with associated vocabulary data and filter by env (includes filtered)', async () => {
        mockValidateRequestWithApiKey({});
        await new Layer(createLayer()).save();
        const fakeLayerOne = await new Layer(createLayer({ env: 'custom' })).save();

        const vocabularyResponse = [
            {
                id: 'resourcewatch',
                type: 'vocabulary',
                env: 'custom',
                attributes: {
                    tags: [
                        'inuncoast',
                        'rp0002',
                        'historical',
                        'nosub'
                    ],
                    name: 'resourcewatch',
                    application: 'rw'
                }
            }
        ];

        createMockVocabulary(vocabularyResponse, fakeLayerOne.dataset, fakeLayerOne._id, { env: 'custom' });

        const response = await requester
            .get(`/api/v1/layer`)
            .set('x-api-key', 'api-key-test')
            .query({
                includes: 'vocabulary',
                filterIncludesByEnv: true,
                env: 'custom'
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(1);
        response.body.should.have.property('links').and.be.an('object');

        response.body.data[0].should.have.property('attributes');
        response.body.data[0].attributes.should.have.property('vocabulary').and.be.an('array').and.deep.equal(vocabularyResponse);
    });

    afterEach(async () => {
        await Layer.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
