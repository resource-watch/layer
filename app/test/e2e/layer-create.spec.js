/* eslint-disable no-unused-vars,no-undef,no-useless-escape */
const nock = require('nock');
const chai = require('chai');
const Layer = require('models/layer.model');
const { USERS } = require('./utils/test.constants');
const { getTestServer } = require('./utils/test-server');
const { mockGetUserFromToken } = require('./utils/helpers');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Layer create tests', () => {

    before(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Layer.deleteMany({}).exec();
    });

    it('Create a layer without being authenticated should fail (401 http code)', async () => {
        const layer = {
            name: `Carto DB Layer - 123456789`,
            application: ['rw']
        };

        const response = await requester
            .post(`/api/v1/dataset/123456789/layer`)
            .send({
                layer
            });

        response.status.should.equal(401);
        response.body.should.have.property('errors').and.be.an('array');
    });

    it('Create a layer for a dataset (layer root object) should be successful (happy case)', async () => {
        const layer = {
            name: `Carto DB Layer - 123456789`,
            application: ['rw']
        };

        nock(process.env.GATEWAY_URL)
            .get(`/v1/dataset/123456789`)
            .reply(200, {
                data: {
                    id: '123456789',
                    type: 'dataset',
                    attributes: {
                        name: 'Uncontrolled Public-Use Airports -- U.S.',
                        slug: 'Uncontrolled-Public-Use-Airports-US_2',
                        type: null,
                        subtitle: null,
                        application: ['rw'],
                        dataPath: null,
                        attributesPath: null,
                        connectorType: 'rest',
                        provider: 'featureservice',
                        userId: '1a10d7c6e0a37126611fd7a7',
                        connectorUrl: 'https://services.arcgis.com/uDTUpUPbk8X8mXwl/arcgis/rest/services/Public_Schools_in_Onondaga_County/FeatureServer/0?f=json',
                        tableName: 'Public_Schools_in_Onondaga_County',
                        status: 'pending',
                        published: true,
                        overwrite: false,
                        verified: false,
                        blockchain: {},
                        mainDateField: null,
                        env: 'production',
                        geoInfo: false,
                        protected: false,
                        legend: {
                            date: [], region: [], country: [], nested: []
                        },
                        clonedHost: {},
                        errorMessage: null,
                        taskId: null,
                        updatedAt: '2018-11-05T15:25:53.321Z',
                        dataLastUpdated: null,
                        widgetRelevantProps: [],
                        layerRelevantProps: []
                    }
                }
            });

        nock(process.env.GATEWAY_URL)
            .post(async (uri) => {
                const regex = `^\/v1\/graph\/layer\/123456789\/([A-Za-z0-9-]+)`;
                const matches = uri.match(regex);

                if (matches.length !== 2) return false;

                const matchingLayer = await Layer.findOne({ _id: matches[1] }).exec();

                return !!matchingLayer;
            })
            .reply(200, (uri) => {
                const regex = `^\/v1\/graph\/layer\/123456789\/([A-Za-z0-9-]+)`;
                const matches = uri.match(regex);
                const layerId = matches[1];

                return {
                    records: [
                        {
                            keys: [
                                'layer',
                                'dataset',
                                'r'
                            ],
                            length: 3,
                            _fields: [
                                {
                                    identity: {
                                        low: 5610,
                                        high: 0
                                    },
                                    labels: [
                                        'LAYER'
                                    ],
                                    properties: {
                                        id: layerId
                                    }
                                },
                                {
                                    identity: {
                                        low: 5590,
                                        high: 0
                                    },
                                    labels: [
                                        'DATASET'
                                    ],
                                    properties: {
                                        views: {
                                            low: 0,
                                            high: 0
                                        },
                                        id: '123456789'
                                    }
                                },
                                {
                                    identity: {
                                        low: 5122,
                                        high: 0
                                    },
                                    start: {
                                        low: 5610,
                                        high: 0
                                    },
                                    end: {
                                        low: 5590,
                                        high: 0
                                    },
                                    type: 'BELONGS_TO',
                                    properties: {}
                                }
                            ],
                            _fieldLookup: {
                                layer: 0,
                                dataset: 1,
                                r: 2
                            }
                        }
                    ],
                    summary: {
                        statement: {
                            text: '\n  MATCH (dataset: DATASET {id: {idDataset}})\n  MERGE (layer: LAYER {id: {idLayer}})\n  MERGE (layer)-[r:BELONGS_TO]->(dataset) RETURN layer, dataset, r\n',
                            parameters: {
                                idLayer: layerId,
                                idDataset: '123456789'
                            }
                        },
                        statementType: 'rw',
                        counters: {
                            _stats: {
                                nodesCreated: 1,
                                nodesDeleted: 0,
                                relationshipsCreated: 1,
                                relationshipsDeleted: 0,
                                propertiesSet: 1,
                                labelsAdded: 1,
                                labelsRemoved: 0,
                                indexesAdded: 0,
                                indexesRemoved: 0,
                                constraintsAdded: 0,
                                constraintsRemoved: 0
                            }
                        },
                        updateStatistics: {
                            _stats: {
                                nodesCreated: 1,
                                nodesDeleted: 0,
                                relationshipsCreated: 1,
                                relationshipsDeleted: 0,
                                propertiesSet: 1,
                                labelsAdded: 1,
                                labelsRemoved: 0,
                                indexesAdded: 0,
                                indexesRemoved: 0,
                                constraintsAdded: 0,
                                constraintsRemoved: 0
                            }
                        },
                        plan: false,
                        profile: false,
                        notifications: [],
                        server: {
                            address: 'localhost:7687',
                            version: 'Neo4j/3.4.9'
                        },
                        resultConsumedAfter: {
                            low: 0,
                            high: 0
                        },
                        resultAvailableAfter: {
                            low: 16,
                            high: 0
                        }
                    }
                };
            });

        mockGetUserFromToken(USERS.ADMIN);
        const response = await requester
            .post(`/api/v1/dataset/123456789/layer`)
            .set('Authorization', `Bearer abcd`)
            .send({
                layer,
            });

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        const createdLayer = response.body.data.attributes;

        createdLayer.should.have.property('name').and.equal(`Carto DB Layer - 123456789`);
        createdLayer.should.have.property('application').and.be.an('array').and.contain('rw');
        createdLayer.should.have.property('dataset').and.equal(`123456789`);
        createdLayer.should.have.property('slug').and.equal(`Carto-DB-Layer-123456789`);
        createdLayer.should.have.property('protected').and.equal(false);
        createdLayer.should.have.property('default').and.equal(false);
        createdLayer.should.have.property('published').and.equal(true);

        createdLayer.layerConfig.should.be.an.instanceOf(Object);
        createdLayer.legendConfig.should.be.an.instanceOf(Object);
        createdLayer.applicationConfig.should.be.an.instanceOf(Object);
        createdLayer.interactionConfig.should.be.an.instanceOf(Object);
        createdLayer.staticImageConfig.should.be.an.instanceOf(Object);
    });

    it('Create a layer for a dataset (no layer root object) should be successful', async () => {
        mockGetUserFromToken(USERS.ADMIN);

        const layer = {
            name: `Carto DB Layer - 123456789`,
            application: ['rw'],
        };

        nock(process.env.GATEWAY_URL)
            .get(`/v1/dataset/123456789`)
            .reply(200, {
                data: {
                    id: '123456789',
                    type: 'dataset',
                    attributes: {
                        name: 'Uncontrolled Public-Use Airports -- U.S.',
                        slug: 'Uncontrolled-Public-Use-Airports-US_2',
                        type: null,
                        subtitle: null,
                        application: ['rw'],
                        dataPath: null,
                        attributesPath: null,
                        connectorType: 'rest',
                        provider: 'featureservice',
                        userId: '1a10d7c6e0a37126611fd7a7',
                        connectorUrl: 'https://services.arcgis.com/uDTUpUPbk8X8mXwl/arcgis/rest/services/Public_Schools_in_Onondaga_County/FeatureServer/0?f=json',
                        tableName: 'Public_Schools_in_Onondaga_County',
                        status: 'pending',
                        published: true,
                        overwrite: false,
                        verified: false,
                        blockchain: {},
                        mainDateField: null,
                        env: 'production',
                        geoInfo: false,
                        protected: false,
                        legend: {
                            date: [], region: [], country: [], nested: []
                        },
                        clonedHost: {},
                        errorMessage: null,
                        taskId: null,
                        updatedAt: '2018-11-05T15:25:53.321Z',
                        dataLastUpdated: null,
                        widgetRelevantProps: [],
                        layerRelevantProps: []
                    }
                }
            });

        nock(process.env.GATEWAY_URL)
            .post(async (uri) => {
                const regex = `^\/v1\/graph\/layer\/123456789\/([A-Za-z0-9-]+)`;
                const matches = uri.match(regex);

                if (matches.length !== 2) return false;

                const matchingLayer = await Layer.findOne({ _id: matches[1] }).exec();

                return !!matchingLayer;
            })
            .reply(200, (uri) => {
                const regex = `^\/v1\/graph\/layer\/123456789\/([A-Za-z0-9-]+)`;
                const matches = uri.match(regex);
                const layerId = matches[1];

                return {
                    records: [
                        {
                            keys: [
                                'layer',
                                'dataset',
                                'r'
                            ],
                            length: 3,
                            _fields: [
                                {
                                    identity: {
                                        low: 5610,
                                        high: 0
                                    },
                                    labels: [
                                        'LAYER'
                                    ],
                                    properties: {
                                        id: layerId
                                    }
                                },
                                {
                                    identity: {
                                        low: 5590,
                                        high: 0
                                    },
                                    labels: [
                                        'DATASET'
                                    ],
                                    properties: {
                                        views: {
                                            low: 0,
                                            high: 0
                                        },
                                        id: '123456789'
                                    }
                                },
                                {
                                    identity: {
                                        low: 5122,
                                        high: 0
                                    },
                                    start: {
                                        low: 5610,
                                        high: 0
                                    },
                                    end: {
                                        low: 5590,
                                        high: 0
                                    },
                                    type: 'BELONGS_TO',
                                    properties: {}
                                }
                            ],
                            _fieldLookup: {
                                layer: 0,
                                dataset: 1,
                                r: 2
                            }
                        }
                    ],
                    summary: {
                        statement: {
                            text: '\n  MATCH (dataset: DATASET {id: {idDataset}})\n  MERGE (layer: LAYER {id: {idLayer}})\n  MERGE (layer)-[r:BELONGS_TO]->(dataset) RETURN layer, dataset, r\n',
                            parameters: {
                                idLayer: layerId,
                                idDataset: '123456789'
                            }
                        },
                        statementType: 'rw',
                        counters: {
                            _stats: {
                                nodesCreated: 1,
                                nodesDeleted: 0,
                                relationshipsCreated: 1,
                                relationshipsDeleted: 0,
                                propertiesSet: 1,
                                labelsAdded: 1,
                                labelsRemoved: 0,
                                indexesAdded: 0,
                                indexesRemoved: 0,
                                constraintsAdded: 0,
                                constraintsRemoved: 0
                            }
                        },
                        updateStatistics: {
                            _stats: {
                                nodesCreated: 1,
                                nodesDeleted: 0,
                                relationshipsCreated: 1,
                                relationshipsDeleted: 0,
                                propertiesSet: 1,
                                labelsAdded: 1,
                                labelsRemoved: 0,
                                indexesAdded: 0,
                                indexesRemoved: 0,
                                constraintsAdded: 0,
                                constraintsRemoved: 0
                            }
                        },
                        plan: false,
                        profile: false,
                        notifications: [],
                        server: {
                            address: 'localhost:7687',
                            version: 'Neo4j/3.4.9'
                        },
                        resultConsumedAfter: {
                            low: 0,
                            high: 0
                        },
                        resultAvailableAfter: {
                            low: 16,
                            high: 0
                        }
                    }
                };
            });

        const response = await requester
            .post(`/api/v1/dataset/123456789/layer`)
            .set('Authorization', `Bearer abcd`)
            .send(layer);

        response.status.should.equal(200);
        response.body.should.have.property('data').and.be.an('object');

        const createdLayer = response.body.data.attributes;

        createdLayer.should.have.property('name').and.equal(`Carto DB Layer - 123456789`);
        createdLayer.should.have.property('application').and.be.an('array').and.contain('rw');
        createdLayer.should.have.property('dataset').and.equal(`123456789`);
        createdLayer.should.have.property('slug').and.equal(`Carto-DB-Layer-123456789`);
        createdLayer.should.have.property('protected').and.equal(false);
        createdLayer.should.have.property('default').and.equal(false);
        createdLayer.should.have.property('published').and.equal(true);

        createdLayer.layerConfig.should.be.an.instanceOf(Object);
        createdLayer.legendConfig.should.be.an.instanceOf(Object);
        createdLayer.applicationConfig.should.be.an.instanceOf(Object);
        createdLayer.interactionConfig.should.be.an.instanceOf(Object);
        createdLayer.staticImageConfig.should.be.an.instanceOf(Object);
    });

    afterEach(async () => {
        await Layer.deleteMany({}).exec();

        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }
    });
});
