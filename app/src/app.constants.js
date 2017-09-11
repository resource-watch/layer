const USER_ROLES = ['USER', 'MANAGER', 'ADMIN', 'SUPERADMIN'];
const PROVIDERS = {
    carto: {
        type: ['tile', 'canvas', 'geojson']
    },
    esriFeatureService: {
        type: ['geojson']
    },
    esriMapService: {
        type: ['tile']
    },
    esriImageService: {
        type: ['tile', 'canvas', 'overlay']
    },
    esriVectorService: {
        type: ['vector']
    },
    tileService: {
        type: ['tile', 'canvas']
    },
    wmsService: {
        type: ['wms', 'wfs']
    },
    mapbox: {
        type: ['vector']
    },
    gee: {
        type: ['tile', 'canvas', 'geojson']
    },
    nasaGibs: {
        type: ['tile']
    }
};

module.exports = {
    USER_ROLES,
    PROVIDERS,
};
