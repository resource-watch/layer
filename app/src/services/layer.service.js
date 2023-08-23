const logger = require('logger');
const Layer = require('models/layer.model');
const GraphService = require('services/graph.service');
const LayerNotFound = require('errors/layerNotFound.error');
const LayerProtected = require('errors/layerProtected.error');
const slug = require('slug');
const RelationshipsService = require('services/relationships.service');
const { RWAPIMicroservice } = require('rw-api-microservice-node');
const ScreenshotService = require('services/screenshot.service');

const stage = process.env.NODE_ENV;

class LayerService {

    static async getSlug(name) {
        const valid = false;
        let slugTemp = null;
        let i = 0;
        while (!valid) {
            slugTemp = slug(name);
            if (i > 0) {
                slugTemp += `_${i}`;
            }
            // eslint-disable-next-line no-await-in-loop
            const currentDataset = await Layer.findOne({
                slug: slugTemp
            }).exec();
            if (!currentDataset) {
                return slugTemp;
            }
            i += 1;
        }
        return name;
    }

    static getFilteredQuery(query, ids = []) {
        const { collection } = query;
        const { favourite } = query;
        if (!query.application && query.app) {
            query.application = query.app;
            if (favourite) {
                delete query.application;
            }
        }
        if (!query.env) { // default value
            query.env = 'production';
        }
        // if (!query.published) { // default value
        //     query.published = true;
        // }
        const layerAttributes = Object.keys(Layer.schema.paths);
        Object.keys(query).forEach((param) => {
            if ((layerAttributes.indexOf(param) < 0 && param !== 'usersRole') || ['userRole', 'userName'].includes(param)) {
                delete query[param];
            } else if (!['env', 'usersRole'].includes(param)) {
                switch (Layer.schema.paths[param].instance) {

                    case 'String':
                        query[param] = {
                            $regex: query[param],
                            $options: 'i'
                        };
                        break;
                    case 'Array':
                        if (query[param].indexOf('@') >= 0) {
                            query[param] = {
                                $all: query[param].split('@').map((elem) => elem.trim())
                            };
                        } else {
                            query[param] = {
                                $in: query[param].split(',').map((elem) => elem.trim())
                            };
                        }
                        break;
                    case 'Mixed':
                        query[param] = { $ne: null };
                        break;
                    default:
                        break;

                }
            } else if (param === 'usersRole') {
                logger.debug('Params users roles');
                query.userId = { ...query.userId || {}, $in: query[param] };
                delete query.usersRole;
            } else if (param === 'env') {
                if (query[param] === 'all') {
                    logger.debug('Applying all environments filter');
                    delete query.env;
                } else {
                    query.env = {
                        $in: query[param].split(',')
                    };
                }
            }

        });
        if (ids.length > 0 || collection || favourite) {
            query._id = {
                $in: ids
            };
        }
        logger.debug(query);
        return query;
    }

    static processSortParam(sort) {
        return sort.replace(/user.role/g, 'userRole,_id').replace(/user.name/g, 'userName,_id');
    }

    static getFilteredSort(sort) {
        const sortParams = LayerService.processSortParam(sort).split(',');
        const filteredSort = {};
        const layerAttributes = Object.keys(Layer.schema.obj);
        sortParams.forEach((param) => {
            let sign = param.substr(0, 1);
            let signlessParam = param.substr(1);
            if (sign !== '-' && sign !== '+') {
                signlessParam = param;
                sign = '+';
            }
            if (layerAttributes.indexOf(signlessParam) >= 0) {
                filteredSort[signlessParam] = parseInt(sign + 1, 10);
            }
        });
        return filteredSort;
    }

    static async get(id, apiKey, includes = null, user = null) {
        logger.debug(`[LayerService - get]: Getting layer with id: ${id}`);
        const layer = await Layer.findById(id).exec() || await Layer.findOne({
            slug: id
        }).exec();
        if (!layer) {
            logger.info(`[LayerService]: Layer with id ${id} doesn't exist`);
            throw new LayerNotFound(`Layer with id '${id}' doesn't exist`);
        }
        if (includes && includes.length > 0) {
            logger.debug('Finding relationships');
            const layers = await RelationshipsService.getRelationships([layer], includes, user, {}, apiKey);
            return layers[0];
        }
        return layer;
    }

    static async create(layer, dataset, user, apiKey) {
        logger.debug(`[LayerService - create]: Getting layer with name:  ${layer.name}`);
        const tempSlug = await LayerService.getSlug(layer.name);

        logger.debug(`[DBACCESS-SAVE]: layer.name: ${layer.name}`);
        const newLayer = await new Layer({
            name: layer.name,
            slug: tempSlug,
            type: layer.type,
            dataset,
            description: layer.description,
            application: layer.application,
            iso: layer.iso,
            provider: layer.provider,
            default: layer.default,
            published: layer.published,
            protected: layer.protected,
            userId: user.id,
            env: layer.env || 'production',
            thumbnailUrl: layer.thumbnailUrl,
            layerConfig: layer.layerConfig,
            legendConfig: layer.legendConfig,
            interactionConfig: layer.interactionConfig,
            applicationConfig: layer.applicationConfig,
            staticImageConfig: layer.staticImageConfig
        }).save();
        logger.debug('[LayerService]: Creating in graph');
        if (stage !== 'staging') {
            try {
                await GraphService.createLayer(dataset, newLayer._id, apiKey);
            } catch (err) {
                logger.error('Error creating widget in graph. Removing widget');
                await newLayer.remove();
                throw new Error(err);
            }
        }

        LayerService.generateThumbnail(newLayer.id, apiKey);

        return newLayer;
    }

    static async update(id, layer, apiKey) {
        logger.debug(`[LayerService - update]: Getting layer with id:  ${id}`);
        const currentLayer = await Layer.findById(id).exec() || await Layer.findOne({
            slug: id
        }).exec();
        if (!currentLayer) {
            logger.error(`[LayerService]: Layer with id ${id} doesn't exist`);
            throw new LayerNotFound(`Layer with id '${id}' doesn't exist`);
        }
        currentLayer.name = layer.name || currentLayer.name;
        currentLayer.description = layer.description || currentLayer.description;
        currentLayer.application = layer.application || currentLayer.application;
        currentLayer.iso = layer.iso || currentLayer.iso;
        currentLayer.env = layer.env || currentLayer.env;
        currentLayer.provider = layer.provider || currentLayer.provider;
        currentLayer.type = layer.type || currentLayer.type;
        currentLayer.provider = layer.provider || currentLayer.provider;
        currentLayer.default = layer.default !== undefined ? layer.default : currentLayer.default;
        currentLayer.published = layer.published !== undefined ? layer.published : currentLayer.published;
        currentLayer.type = layer.type || currentLayer.type;
        currentLayer.layerConfig = layer.layerConfig || currentLayer.layerConfig;
        currentLayer.legendConfig = layer.legendConfig || currentLayer.legendConfig;
        currentLayer.interactionConfig = layer.interactionConfig || currentLayer.interactionConfig;
        currentLayer.applicationConfig = layer.applicationConfig || currentLayer.applicationConfig;
        currentLayer.staticImageConfig = layer.staticImageConfig || currentLayer.staticImageConfig;
        currentLayer.thumbnailUrl = layer.thumbnailUrl || currentLayer.thumbnailUrl;
        currentLayer.updatedAt = new Date();
        if (layer.protected === false || layer.protected === true) {
            currentLayer.protected = layer.protected;
        }
        logger.debug(`[DBACCESS-SAVE]: layer`);
        const newLayer = await currentLayer.save();

        LayerService.generateThumbnail(newLayer.id, apiKey);

        try {
            await LayerService.expireCacheTiles(id, apiKey);
        } catch (err) {
            logger.error('Error removing metadata of the layer', err);
        }

        return newLayer;
    }

    static async generateThumbnail(id, apiKey) {
        logger.debug('[LayerService]: Creating thumbnail');
        let thumbURL = '';
        try {
            const layerThumbnail = await ScreenshotService.takeLayerScreenshot(id, apiKey);
            thumbURL = layerThumbnail.data.layerThumbnail;
        } catch (err) {
            logger.error(`Error generating layer thumbnail: ${err.message}`);
        }

        try {
            const layer = await Layer.findById(id).exec();
            layer.thumbnailUrl = thumbURL;
            layer.save();
        } catch (err) {
            logger.error(`Error updating layer after thumbnail generation: ${err.message}`);
        }
    }

    static async updateEnvironment(dataset, env) {
        logger.debug('[LayerService - updateEnvironment]: Updating layers with dataset', dataset);
        const layers = await Layer.find({
            dataset
        }).exec();
        await Layer.updateMany({ dataset }, { $set: { env } }, { multi: true });
        return layers;
    }

    static async delete(layer, apiKey) {
        logger.debug(`[LayerService - delete]: Getting layer with id: ${layer.id}`);
        if (!layer) {
            logger.error(`[LayerService]: Layer with id ${layer.id} doesn't exist`);
            throw new LayerNotFound(`Layer with id '${layer.id}' doesn't exist`);
        }
        if (layer.protected) {
            logger.error(`[LayerService]: Layer with id ${layer.id} is protected`);
            throw new LayerProtected(`Layer is protected`);
        }
        logger.debug(`[DBACCESS-DELETE]: layer.id: ${layer.id}`);
        const deletedLayer = await layer.remove();
        logger.debug('[LayerService]: Deleting in graph');
        if (stage !== 'staging') {
            try {
                await GraphService.deleteLayer(layer.id, apiKey);
            } catch (err) {
                logger.error('Error removing layer of the graph', err);
            }
        }
        try {
            await LayerService.expireCacheTiles(layer.id, apiKey);
        } catch (err) {
            logger.error('Error expiring cache', err);
        }
        try {
            await LayerService.deleteMetadata(layer.id, layer._id, apiKey);
        } catch (err) {
            logger.error('Error removing metadata of the layer', err);
        }
        return deletedLayer;
    }

    static async deleteByDataset(id, apiKey) {
        logger.debug(`[LayerService - deleteByDataset]: Getting layers of dataset with id:  ${id}`);
        const layers = await Layer.find({
            dataset: id
        }).exec();
        if (layers) {
            // eslint-disable-next-line no-plusplus
            for (let i = 0, { length } = layers; i < length; i++) {
                const currentLayer = layers[i];
                logger.debug(`[DBACCESS-DELETE]: layer.id: ${id}`);
                // eslint-disable-next-line no-await-in-loop
                await currentLayer.remove();
                logger.debug('[LayerService]: Deleting in graph');
                try {
                    // eslint-disable-next-line no-await-in-loop
                    await GraphService.deleteLayer(id, apiKey);
                } catch (err) {
                    logger.error('Error removing layer of the graph', err);
                }
                try {
                    // eslint-disable-next-line no-await-in-loop
                    await LayerService.deleteMetadata(id, currentLayer._id, apiKey);
                } catch (err) {
                    logger.error('Error removing metadata of the layer', err);
                }
                try {
                    // eslint-disable-next-line no-await-in-loop
                    await LayerService.expireCacheTiles(id, apiKey);
                } catch (err) {
                    logger.error('Error expiring cache', err);
                }
            }
        }
        return layers;
    }

    static async deleteByUserId(userId, apiKey) {
        logger.debug(`[LayerService]: Delete layers for user with id:  ${userId}`);

        const filteredQuery = LayerService.getFilteredQuery({ userId, env: 'all' });

        const unprotectedLayers = await Layer.find({ ...filteredQuery, protected: { $ne: true } }).exec();
        const protectedLayers = await Layer.find({ ...filteredQuery, protected: true }).exec();

        await Promise.all(unprotectedLayers.map((layer) => LayerService.delete(layer, apiKey)));

        return {
            deletedLayers: unprotectedLayers,
            protectedLayers
        };
    }

    static async expireCacheTiles(layerId, apiKey) {
        logger.debug('[LayerService - expireCacheTiles]: Expiring cache of tiles');
        await RWAPIMicroservice.requestToMicroservice({
            uri: `/v1/layer/${layerId}/expire-cache`,
            method: 'DELETE',
            headers: {
                'x-api-key': apiKey
            }
        });
    }

    static async deleteMetadata(datasetId, layerId, apiKey) {
        logger.debug('[LayerService - deleteMetadata]: Deleting layer metadata');
        await RWAPIMicroservice.requestToMicroservice({
            uri: `/v1/dataset/${datasetId}/layer/${layerId}/metadata`,
            method: 'DELETE',
            headers: {
                'x-api-key': apiKey
            }
        });
    }

    static async getAll(query = {}, dataset = null, user, apiKey) {
        logger.debug(`[LayerService - getAll]: Getting all layers`);
        const sort = query.sort || '';
        const page = query['page[number]'] ? parseInt(query['page[number]'], 10) : 1;
        const limit = query['page[size]'] ? parseInt(query['page[size]'], 10) : 10;
        const ids = query.ids ? query.ids.split(',').map((elem) => elem.trim()) : [];
        const includes = query.includes ? query.includes.split(',').map((elem) => elem.trim()) : [];
        if (dataset) {
            query.dataset = dataset;
        }
        const filteredQuery = LayerService.getFilteredQuery({ ...query }, ids);
        const filteredSort = LayerService.getFilteredSort(sort);
        const options = {
            page,
            limit,
            sort: filteredSort
        };
        logger.debug(`[DBACCESS-FIND]: layer`);
        let pages = await Layer.paginate(filteredQuery, options);
        pages = { ...pages };
        if (includes.length > 0) {
            logger.debug('Finding relationships');
            pages.docs = await RelationshipsService.getRelationships(pages.docs, includes, user, { ...query }, apiKey);
        }
        return pages;
    }

    static async getByDataset(resource) {
        logger.debug(`[LayerService - getByDataset] Getting layers for datasets with ids ${resource.ids}`);
        if (resource.app) {
            if (resource.app.indexOf('@') >= 0) {
                resource.app = {
                    $all: resource.app.split('@').map((elem) => elem.trim())
                };
            } else {
                resource.app = {
                    $in: resource.app.split(',').map((elem) => elem.trim())
                };
            }
        }

        const query = {
            dataset: {
                $in: resource.ids
            }
        };

        if (resource.env) { // default value
            query.env = {
                $in: resource.env
            };
        }

        if (resource.app) {
            query.application = resource.app;
        }
        logger.debug(`[LayerService] IDs query: ${JSON.stringify(query)}`);
        return Layer.find(query).exec();
    }

    static async getAllLayersUserIds() {
        logger.debug(`[LayerService - getAllLayersUserIds]: Getting the user ids of all layers`);
        const layers = await Layer.find({}, 'userId').lean();
        const userIds = layers.map((l) => l.userId);
        return userIds.filter((item, idx) => userIds.indexOf(item) === idx && item !== 'legacy');
    }

    static async hasPermission(id, user, apiKey) {
        let permission = true;
        const layer = await LayerService.get(id, apiKey);
        const appPermission = layer.application.find((layerApp) => user.extraUserData.apps.find((app) => app === layerApp));
        if (!appPermission) {
            permission = false;
        }
        if ((user.role === 'MANAGER') && (!layer.userId || layer.userId !== user.id)) {
            permission = false;
        }
        return permission;
    }

}

module.exports = LayerService;
