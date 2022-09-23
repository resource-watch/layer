const Router = require('koa-router');
const logger = require('logger');
const { RWAPIMicroservice } = require('rw-api-microservice-node');
const LayerModel = require('models/layer.model');
const LayerService = require('services/layer.service');
const DatasetService = require('services/dataset.service');
const RelationshipsService = require('services/relationships.service');
const LayerValidator = require('validators/layer.validator');
const LayerSerializer = require('serializers/layer.serializer');
const LayerDuplicated = require('errors/layerDuplicated.error');
const LayerNotFound = require('errors/layerNotFound.error');
const LayerProtected = require('errors/layerProtected.error');
const LayerNotValid = require('errors/layerNotValid.error');
const { USER_ROLES } = require('app.constants');

const router = new Router({});

const serializeObjToQuery = (obj) => Object.keys(obj).reduce((a, k) => {
    a.push(`${k}=${encodeURIComponent(obj[k])}`);
    return a;
}, []).join('&');

const getHostForPaginationLink = (ctx) => {
    if ('x-rw-domain' in ctx.request.header) {
        return ctx.request.header['x-rw-domain'];
    }
    if ('referer' in ctx.request.header) {
        const url = new URL(ctx.request.header.referer);
        return url.host;
    }
    return ctx.request.host;
};

class LayerRouter {

    static getUser(ctx) {
        let user = { ...(ctx.request.query.loggedUser ? JSON.parse(ctx.request.query.loggedUser) : {}), ...ctx.request.body.loggedUser };
        if (ctx.request.body.fields) {
            user = Object.assign(user, JSON.parse(ctx.request.body.fields.loggedUser));
        }
        return user;
    }

    static async get(ctx) {
        const id = ctx.params.layer;
        logger.info(`[LayerRouter] Getting layer with id: ${id}`);
        const includes = ctx.query.includes ? ctx.query.includes.split(',').map((elem) => elem.trim()) : [];
        const { query } = ctx;
        const user = ctx.query.loggedUser && ctx.query.loggedUser !== 'null' ? JSON.parse(ctx.query.loggedUser) : null;
        delete query.loggedUser;
        try {
            const layer = await LayerService.get(id, includes, user);
            ctx.body = LayerSerializer.serialize(layer);
            const cache = [id, layer.slug];
            if (includes) {
                includes.forEach((inc) => {
                    cache.push(`${id}-${inc}`);
                    cache.push(`${layer.slug}-${inc}`);
                });
            }
            ctx.set('cache', cache.join(' '));
        } catch (err) {
            if (err instanceof LayerNotFound) {
                ctx.throw(404, err.message);
                return;
            }
            throw err;
        }
    }

    static async create(ctx) {
        logger.info(`[LayerRouter] Creating layer with name: ${ctx.request.body.name}`);
        try {
            const { dataset } = ctx.params;
            const user = LayerRouter.getUser(ctx);
            const layer = await LayerService.create(ctx.request.body, dataset, user);
            ctx.set('cache-control', 'flush');
            ctx.body = LayerSerializer.serialize(layer);

            ctx.set('uncache', ['layer', `${ctx.state.dataset.id}-layer`, `${ctx.state.dataset.attributes.slug}-layer`, `${ctx.state.dataset.id}-layer-all`]);

        } catch (err) {
            if (err instanceof LayerDuplicated) {
                ctx.throw(400, err.message);
                return;
            }
            throw err;
        }
    }

    static async update(ctx) {
        const id = ctx.params.layer;
        logger.info(`[LayerRouter] Updating layer with id: ${id}`);
        try {
            const layer = await LayerService.update(id, ctx.request.body);
            ctx.set('cache-control', 'flush');
            ctx.body = LayerSerializer.serialize(layer);
            ctx.set('uncache', ['layer', id, layer.slug, `${layer.dataset}-layer`, `${ctx.state.dataset.attributes.slug}-layer`, `${ctx.state.dataset.id}-layer-all`]);
        } catch (err) {
            if (err instanceof LayerNotFound) {
                ctx.throw(404, err.message);
                return;
            }
            if (err instanceof LayerDuplicated) {
                ctx.throw(400, err.message);
                return;
            }
            throw err;
        }
    }

    static async delete(ctx) {
        const id = ctx.params.layer;
        logger.info(`[LayerRouter] Deleting layer with id: ${id}`);
        try {
            const layer = await LayerService.delete(id);
            ctx.set('cache-control', 'flush');
            ctx.body = LayerSerializer.serialize(layer);
            ctx.set('uncache', ['layer', id, layer.slug, `${layer.dataset}-layer`, `${ctx.state.dataset.attributes.slug}-layer`, `${ctx.state.dataset.id}-layer-all`]);
        } catch (err) {
            if (err instanceof LayerNotFound) {
                ctx.throw(404, err.message);
                return;
            }
            if (err instanceof LayerProtected) {
                ctx.throw(400, err.message);
                return;
            }
            throw err;
        }
    }

    static async deleteByDataset(ctx) {
        const id = ctx.params.dataset;
        logger.info(`[LayerRouter] Deleting layers of dataset with id: ${id}`);
        try {
            const layers = await LayerService.deleteByDataset(id);
            ctx.set('cache-control', 'flush');
            ctx.body = LayerSerializer.serialize(layers);
            const uncache = ['layer', `${ctx.state.dataset.id}-layer`, `${ctx.state.dataset.attributes.slug}-layer`, `${ctx.state.dataset.id}-layer-all`];
            if (layers) {
                layers.forEach((layer) => {
                    uncache.push(layer._id);
                    uncache.push(layer.slug);
                });
            }
            ctx.set('uncache', uncache.join(' '));
        } catch (err) {
            if (err instanceof LayerNotFound) {
                ctx.throw(404, err.message);
                return;
            }
            throw err;
        }
    }

    static async deleteByUserId(ctx) {
        const userIdToDelete = ctx.params.userId;

        logger.info(`[LayerRouter] Deleting all layer for user with id: ${userIdToDelete}`);
        try {
            const deletedLayers = await LayerService.deleteByUserId(userIdToDelete);
            ctx.body = LayerSerializer.serialize(deletedLayers);
        } catch (err) {
            logger.error(`Error deleting layers from user ${userIdToDelete}`, err);
            ctx.throw(500, `Error deleting layers from user ${userIdToDelete}`);
        }
    }

    static async expireCache(ctx) {
        const layerId = ctx.params.layer;

        logger.info(`[LayerRouter - expireCache] Expiring cache for layer with id: ${layerId}`);

        try {
            const layer = await LayerService.get(layerId);
            if (!['gee', 'loca', 'nexgddp'].includes(layer.provider)) {
                ctx.throw(400, 'Layer provider does not support cache expiration');
            }
            const response = await RWAPIMicroservice.requestToMicroservice({
                uri: `/v1/layer/${layer.provider}/${layerId}/expire-cache`,
                method: 'DELETE',
                json: true
            });
            ctx.body = response;
            ctx.status = 200;
        } catch (err) {
            if (err instanceof LayerNotFound) {
                ctx.throw(404, err.message);
                return;
            }
            ctx.throw(err.statusCode, JSON.stringify(err.error));
        }
    }

    static async getAll(ctx) {
        logger.info(`[LayerRouter] Getting all layers`);
        const { query } = ctx;
        const dataset = ctx.params.dataset || null;
        const user = ctx.query.loggedUser && ctx.query.loggedUser !== 'null' ? JSON.parse(ctx.query.loggedUser) : null;
        const userId = user ? user.id : null;
        const isAdmin = ['ADMIN', 'SUPERADMIN'].includes(user && user.role);

        delete query.loggedUser;

        if (ctx.query.sort && (ctx.query.sort.includes('user.role') || ctx.query.sort.includes('user.name'))) {
            logger.debug('Detected sorting by user role or name');
            if (!user || !isAdmin) {
                ctx.throw(403, 'Sorting by user name or role not authorized.');
                return;
            }

            // Reset all layers' sorting columns
            await LayerModel.updateMany({}, { userRole: '', userName: '' });

            // Fetch info to sort again
            const ids = await LayerService.getAllLayersUserIds();
            const users = await RelationshipsService.getUsersInfoByIds(ids);
            await Promise.all(users.map((u) => LayerModel.updateMany(
                { userId: u._id },
                {
                    userRole: u.role ? u.role.toLowerCase() : '',
                    userName: u.name ? u.name.toLowerCase() : ''
                },
            )));
        }

        /**
         * We'll want to limit the maximum page size in the future
         * However, as this will cause a production BC break, we can't enforce it just now
         */
        // if (query['page[size]'] && query['page[size]'] > 100) {
        //     ctx.throw(400, 'Invalid page size');
        // }

        if (Object.keys(query).find((el) => el.indexOf('collection') >= 0)) {
            if (!userId) {
                ctx.throw(403, 'Collection filter not authorized');
                return;
            }
            logger.debug('Obtaining collections', userId);
            ctx.query.ids = await RelationshipsService.getCollections(ctx.query.collection, userId);
            ctx.query.ids = ctx.query.ids.length > 0 ? ctx.query.ids.join(',') : '';
            logger.debug('Ids from collections', ctx.query.ids);
        }
        if (Object.keys(query).find((el) => el.indexOf('user.role') >= 0) && isAdmin) {
            logger.debug('Obtaining users with role');
            ctx.query.usersRole = await RelationshipsService.getUsersWithRole(ctx.query['user.role']);
            logger.debug('Ids from users with role', ctx.query.usersRole);
        }
        if (Object.keys(query).find((el) => el.indexOf('favourite') >= 0)) {
            if (!userId) {
                ctx.throw(403, 'Fav filter not authorized');
                return;
            }
            const app = ctx.query.app || ctx.query.application || 'rw';
            ctx.query.ids = await RelationshipsService.getFavorites(app, userId);
            ctx.query.ids = ctx.query.ids.length > 0 ? ctx.query.ids.join(',') : '';
            logger.debug('Ids from collections', ctx.query.ids);
        }
        // Links creation
        const clonedQuery = { ...query };
        delete clonedQuery['page[size]'];
        delete clonedQuery['page[number]'];
        delete clonedQuery.ids;
        delete clonedQuery.usersRole;
        const serializedQuery = serializeObjToQuery(clonedQuery) ? `?${serializeObjToQuery(clonedQuery)}&` : '?';
        const apiVersion = ctx.mountPath.split('/')[ctx.mountPath.split('/').length - 1];
        const link = `${ctx.request.protocol}://${getHostForPaginationLink(ctx)}/${apiVersion}${ctx.request.path}${serializedQuery}`;
        const layers = await LayerService.getAll(query, dataset, user);
        ctx.body = LayerSerializer.serialize(layers, link);

        const includes = ctx.query.includes ? ctx.query.includes.split(',').map((elem) => elem.trim()) : [];
        const cache = ['layer'];
        if (ctx.params.dataset) {
            cache.push(`${ctx.params.dataset}-layer-all`);
        }
        if (includes) {
            includes.forEach((inc) => {
                cache.push(`layer-${inc}`);
                if (ctx.params.dataset) {
                    cache.push(`${ctx.params.dataset}-layer-all-${inc}`);
                }
            });
        }
        ctx.set('cache', cache.join(' '));
    }

    static async findByIds(ctx) {
        const { body } = ctx.request;
        if (body.layer) {
            body.ids = body.layer.ids;
        }
        logger.info(`[LayerRouter] Getting layers for datasets with id: ${body.ids}`);
        const resource = {
            ids: body.ids,
            app: body.app,
            env: body.env
        };
        if (typeof resource.ids === 'string') {
            resource.ids = resource.ids.split(',').map((elem) => elem.trim());
        }
        if (typeof resource.env === 'string') {
            resource.env = resource.env.split(',').map((elem) => elem.trim());
        }
        const result = await LayerService.getByDataset(resource);
        ctx.body = LayerSerializer.serialize(result, null, true);
    }

    static async updateEnvironment(ctx) {
        logger.info('Updating environment of all layers with dataset ', ctx.params.dataset, ' to environment', ctx.params.env);
        const layers = await LayerService.updateEnvironment(ctx.params.dataset, ctx.params.env);
        const uncache = ['layer', `${ctx.params.dataset}-layer`, `${ctx.state.dataset.attributes.slug}-layer`, 'dataset-layer'];
        if (layers) {
            layers.forEach((layer) => {
                uncache.push(layer._id);
                uncache.push(layer.slug);
            });
        }
        ctx.set('uncache', uncache.join(' '));
        ctx.body = '';
    }

}

const validationMiddleware = async (ctx, next) => {
    logger.info(`[LayerRouter] Validating`);
    if (ctx.request.body.layer) {
        ctx.request.body = Object.assign(ctx.request.body, ctx.request.body.layer);
        delete ctx.request.body.layer;
    }
    try {
        const newLayerCreation = ctx.request.method === 'POST';
        if (newLayerCreation) {
            await LayerValidator.validateCreation(ctx);
        } else {
            await LayerValidator.validateUpdate(ctx);
        }
    } catch (err) {
        if (err instanceof LayerNotValid) {
            ctx.throw(400, err.getMessages());
            return;
        }
        throw err;
    }
    await next();
};

const datasetValidationMiddleware = async (ctx, next) => {
    logger.info(`[LayerRouter] Validating dataset presence`);

    // supports the deprecated "layer" root object on the request
    if (ctx.request.body && ctx.request.body.layer) {
        ctx.request.body = Object.assign(ctx.request.body, ctx.request.body.layer);
        delete ctx.request.body.layer;
    }
    // END REMOVE
    try {
        ctx.state.dataset = await DatasetService.checkDataset(ctx);
    } catch (err) {
        ctx.throw(404, 'Dataset not found');
    }
    await next();
};

const findByIdValidationMiddleware = async (ctx, next) => {
    logger.info(`[LayerRouter] Validating find by id`);
    try {
        await LayerValidator.validateFindById(ctx);
    } catch (err) {
        if (err instanceof LayerNotValid) {
            ctx.throw(400, err.getMessages());
            return;
        }
        throw err;
    }

    await next();
};

const isMicroservice = async (ctx, next) => {
    logger.debug('Checking if is a microservice');
    const user = LayerRouter.getUser(ctx);
    if (!user || !user.id) {
        ctx.throw(401, 'Not authorized');
        return;
    }
    if (user.id !== 'microservice') {
        ctx.throw(403, 'Forbidden');
        return;
    }
    await next();
};

const isMicroserviceOrAdmin = async (ctx, next) => {
    logger.debug('Checking if is a microservice or admin');
    const user = LayerRouter.getUser(ctx);
    if (!user || !user.id) {
        ctx.throw(401, 'Not authorized');
        return;
    }
    if (user.id !== 'microservice' && user.role !== 'ADMIN') {
        ctx.throw(403, 'Forbidden');
        return;
    }
    await next();
};

const authorizationMiddleware = async (ctx, next) => {
    logger.info(`[LayerRouter] Checking authorization`);
    // Get user from query (delete) or body (post-patch)
    const newLayerCreation = ctx.request.method === 'POST';
    const user = LayerRouter.getUser(ctx);
    if (user.id === 'microservice') {
        await next();
        return;
    }
    if (!user || USER_ROLES.indexOf(user.role) === -1) {
        ctx.throw(401, 'Unauthorized'); // if not logged or invalid ROLE -> out
        return;
    }
    if (user.role === 'USER') {
        if (!newLayerCreation) {
            ctx.throw(403, 'Forbidden'); // if user is USER -> out
            return;
        }
    }
    const application = ctx.request.query.application ? ctx.request.query.application : ctx.request.body.application;
    if (application) {
        const appPermission = application.find((app) => user.extraUserData.apps.find((userApp) => userApp === app));
        if (!appPermission) {
            ctx.throw(403, 'Forbidden'); // if manager or admin but no application -> out
            return;
        }
    }
    const allowedOperations = newLayerCreation;
    if ((user.role === 'MANAGER' || user.role === 'ADMIN') && !allowedOperations) {
        const permission = await LayerService.hasPermission(ctx.params.layer, user);
        if (!permission) {
            ctx.throw(403, 'Forbidden');
            return;
        }
    }
    await next(); // SUPERADMIN is included here
};

const isAuthenticatedMiddleware = async (ctx, next) => {
    logger.info(`Verifying if user is authenticated`);
    const { query, body } = ctx.request;

    const user = { ...(query.loggedUser ? JSON.parse(query.loggedUser) : {}), ...body.loggedUser };

    if (!user || !user.id) {
        ctx.throw(401, 'Unauthorized');
        return;
    }
    await next();
};

const deleteResourceAuthorizationMiddleware = async (ctx, next) => {
    logger.info(`[LayerRouter] Checking authorization`);
    const user = LayerRouter.getUser(ctx);
    const userFromParam = ctx.params.userId;

    if (user.id === 'microservice' || user.role === 'ADMIN') {
        await next();
        return;
    }

    if (userFromParam === user.id) {
        await next();
        return;
    }

    ctx.throw(403, 'Forbidden');
};

router.get('/layer', LayerRouter.getAll);
router.get('/layer/:layer', LayerRouter.get);
router.get('/dataset/:dataset/layer', datasetValidationMiddleware, LayerRouter.getAll);

router.post('/dataset/:dataset/layer', isAuthenticatedMiddleware, datasetValidationMiddleware, validationMiddleware, authorizationMiddleware, LayerRouter.create);
router.get('/dataset/:dataset/layer/:layer', datasetValidationMiddleware, LayerRouter.get);
router.patch('/dataset/:dataset/layer/:layer', isAuthenticatedMiddleware, datasetValidationMiddleware, validationMiddleware, authorizationMiddleware, LayerRouter.update);
router.delete('/dataset/:dataset/layer/:layer', isAuthenticatedMiddleware, datasetValidationMiddleware, authorizationMiddleware, LayerRouter.delete);
router.delete('/dataset/:dataset/layer', isAuthenticatedMiddleware, datasetValidationMiddleware, isMicroservice, LayerRouter.deleteByDataset);

router.delete('/layer/by-user/:userId', isAuthenticatedMiddleware, deleteResourceAuthorizationMiddleware, LayerRouter.deleteByUserId);

router.delete('/layer/:layer/expire-cache', isAuthenticatedMiddleware, isMicroserviceOrAdmin, LayerRouter.expireCache);

router.post('/layer/find-by-ids', isAuthenticatedMiddleware, findByIdValidationMiddleware, LayerRouter.findByIds);
router.patch('/layer/change-environment/:dataset/:env', isAuthenticatedMiddleware, datasetValidationMiddleware, isMicroservice, LayerRouter.updateEnvironment);

module.exports = router;
