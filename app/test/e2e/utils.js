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

const createLayer = (apps = ['rw']) => {
    const uuid = getUUID();
    const datasetUuid = getUUID();

    return {
        _id: uuid,
        provider: 'cartodb',
        application: apps,
        status: 1,
        iso: [],
        name: `Layer ${uuid}`,
        description: '',
        published: true,
        default: true,
        dataset: datasetUuid,
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
        userId: '5858f37140621f11066fb2f7',
        protected: false
    };
};

module.exports = {
    createLayer
};
