const nock = require('nock');

const getUUID = () => Math.random().toString(36).substring(7);

const layerConfig = {
    account: 'wri-rw',
    body: {
        maxzoom: 18,
        minzoom: 3,
        layers: [
            {
                type: 'mapnik',
                options: {
                    sql: 'SELECT * FROM ssta',
                    // eslint-disable-next-line max-len
                    cartocss: '#ssta {raster-opacity:1; raster-scaling:near; raster-colorizer-default-mode: linear; raster-colorizer-default-color:  transparent; raster-colorizer-epsilon:0.11; raster-colorizer-stops: stop(1, #ff4d4d) stop(140, #FEB24C) stop(200, #fff2cc) stop(220, #C7E9B4) stop(240, #0080ff)}',
                    cartocss_version: '2.3.0',
                    geom_column: 'the_raster_webmercator',
                    geom_type: 'raster',
                    raster_band: 1
                }
            }
        ]
    }
};

const ensureCorrectError = (body, errMessage) => {
    body.should.have.property('errors').and.be.an('array');
    body.errors[0].should.have.property('detail').and.equal(errMessage);
};

const createMockDataset = (id) => {
    nock(process.env.GATEWAY_URL)
        .get(`/v1/dataset/${id}`)
        .reply(200, {
            data: {
                id,
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
};

// apps = null, datasetID = null, layerId = null, userID
const createLayer = (anotherData = {}) => {
    const uuid = anotherData._id || getUUID();
    delete anotherData._id;

    return {
        _id: uuid,
        provider: 'cartodb',
        application: ['rw'],
        status: 1,
        iso: [],
        name: `Layer ${uuid}`,
        description: '',
        published: true,
        default: true,
        dataset: getUUID(),
        slug: `layer-${uuid}`,
        env: 'production',
        layerConfig,
        legendConfig: {
            type: 'cluster',
            description: 'Layer description.',
            units: 'thousand metric tons',
            items: [
                {
                    name: 'Food demand',
                    color: 'rgba(53, 89, 161, 0.85)'
                }
            ]
        },
        applicationConfig: {},
        staticImageConfig: {},
        userId: getUUID(),
        protected: false,
        createdAt: new Date(2018, 1, 1),
        updatedAt: new Date(2018, 1, 1),
        ...anotherData
    };
};

const createVocabulary = (layerId) => ({
    _id: getUUID(),
    type: 'vocabulary',
    attributes: {
        resource: {
            id: layerId,
            type: 'layer'
        },
        id: getUUID(),
        tags: [
            'daily',
            'near_real_time',
            'geospatial',
            'raster',
            'forest',
            'fire'
        ],
        application: 'rw'
    }
});

// const ensureCorrectLayer = (receivedLayer, createdLayer, additionalData = {}) => {
//     receivedLayer.id.should.equal(createdLayer._id);
//     receivedLayer.type.should.equal('layer');
//     receivedLayer.should.have.property('attributes').and.instanceOf(Object);
//
//     delete createdLayer._id;
//     delete createdLayer.__v;
//     delete createdLayer.status;
//
//     createdLayer.interactionConfig = {};
//
//     const expectedLayer = {
//         ...createdLayer,
//         createdAt: createdLayer.createdAt.toISOString(),
//         updatedAt: createdLayer.updatedAt.toISOString(),
//         ...additionalData,
//         staticImageConfig: {},
//         applicationConfig: {}
//     };
//     // remove fields which are not present to user from response body;
//     delete expectedLayer._id;
//
//     receivedLayer.attributes.should.deep.equal(expectedLayer);
// };

const ensureCorrectLayer = (actualLayerModel, expectedLayer) => {
    const layer = { ...expectedLayer, ...expectedLayer.attributes };
    delete layer.attributes;
    delete layer.type;

    let actualLayer = actualLayerModel;
    if (actualLayerModel.toObject) {
        actualLayer = actualLayerModel.toObject();
    }
    if (!actualLayer.applicationConfig) {
        actualLayer.applicationConfig = {};
    }
    if (!actualLayer.interactionConfig) {
        actualLayer.interactionConfig = {};
    }
    if (!actualLayer.staticImageConfig) {
        actualLayer.staticImageConfig = {};
    }
    actualLayer.id = actualLayer._id;
    actualLayer.updatedAt = actualLayer.updatedAt.toISOString();
    actualLayer.createdAt = actualLayer.createdAt.toISOString();
    // eslint-disable-next-line no-underscore-dangle
    delete actualLayer.__v;
    delete actualLayer._id;
    delete actualLayer.userName;
    delete actualLayer.userRole;

    actualLayer.should.deep.equal(layer);
};

const mockGetUserFromToken = (userProfile) => {
    nock(process.env.GATEWAY_URL, { reqheaders: { authorization: 'Bearer abcd' } })
        .get('/auth/user/me')
        .reply(200, userProfile);
};

module.exports = {
    createLayer,
    createMockDataset,
    ensureCorrectError,
    getUUID,
    createVocabulary,
    ensureCorrectLayer,
    mockGetUserFromToken
};
