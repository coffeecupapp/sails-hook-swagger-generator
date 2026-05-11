"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseControllerJsDoc = exports.parseModelsJsDoc = exports.parseControllers = exports.parseBoundRoutes = exports.parseModels = void 0;
/**
 * Created by theophy on 02/08/2017.
 */
const path = __importStar(require("path"));
const interfaces_1 = require("./interfaces");
const utils_1 = require("./utils");
const lodash_1 = require("lodash");
const include_all_1 = __importDefault(require("include-all"));
/**
 * Parses Sails route path of the form `/path/:id` to extract list of variables
 * and optional variables.
 *
 * Optional variables are annotated with a `?` as `/path/:id?`.
 *
 * @note The `variables` elements contains all variables (including optional).
 */
const parsePath = (path) => {
    const variables = [];
    const optionalVariables = [];
    path
        .split('/')
        .map(v => {
        const match = v.match(/^:([^/:?]+)(\?)?$/);
        if (match) {
            variables.push(match[1]);
            if (match[2])
                optionalVariables.push(match[1]);
        }
    });
    return { path, variables, optionalVariables };
};
/**
 * Parse Sails ORM models (runtime versions from `sails.models`).
 *
 * @param sails
 */
const parseModels = (sails) => {
    const filteredModels = (0, lodash_1.pickBy)(sails.models, (model /*, _identity */) => {
        // consider all models except associative tables and 'Archive' model special case
        return !!model.globalId && model.globalId !== 'Archive';
    });
    return (0, lodash_1.mapValues)(filteredModels, model => {
        return {
            globalId: model.globalId,
            primaryKey: model.primaryKey,
            identity: model.identity,
            // Some cc models override the lowercase Sails-default identity with a camelCase
            // `_identity` (e.g. TeamAssignment → 'teamAssignment'). The blueprint's
            // actionUtil.parseValues reads req.param(_identity || identity), so the request
            // body wrapper key in the spec must match `_identity` when set.
            _identity: model._identity,
            identityPlural: model._identity_plural || model.identity + 's',
            attributes: model.attributes,
            associations: model.associations,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            hiddenAttributes: model.hiddenAttributes || [],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            readOnlyAttributes: model.readOnlyAttributes || [],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            criteriaWhitelist: model.criteriaWhitelist,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            fulltextColumns: model.fulltextColumns,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            likeColumns: model.likeColumns,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            populateable: model.populateable,
            standardLimit: model.standardLimit,
            maximumLimit: model.maximumLimit,
            jsonSchemas: model.jsonSchemas,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            swagger: model.swagger || {},
            supportsHistory: !!model.supportsHistory,
            logStripFields: model.logStripFields,
        };
    });
};
exports.parseModels = parseModels;
/**
 * Parse array of routes capture from Sails 'router:bind' events.
 *
 * @note See detailed background in implementation comments.
 *
 * @param boundRoutes
 * @param models
 * @param sails
 */
const parseBoundRoutes = (boundRoutes, models, sails) => {
    /* example of Sails.Route (in particular `options`) for standard blueprint */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const standardBlueprintRouteExampleForReference = {
        path: '/user',
        target: '[Function: routeTargetFnWrapper]',
        verb: 'get',
        options: {
            model: 'user',
            associations: [{ alias: 'pets', type: 'collection', collection: 'pet', via: 'owner' }],
            autoWatch: true,
            detectedVerb: { verb: '', original: '/user', path: '/user' },
            action: 'user/find',
            _middlewareType: 'BLUEPRINT: find',
            skipRegex: []
        },
        originalFn: { /*[Function] */ _middlewareType: 'BLUEPRINT: find' }
    };
    /* example of standard blueprint route but with standard action overridden in controller */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const standardBlueprintRouteWithOverriddenActionExampleForReference = {
        path: '/user',
        target: '[Function: routeTargetFnWrapper]',
        verb: 'post',
        options: {
            model: 'user',
            associations: [ /* [Object], [Object], [Object] */],
            autoWatch: true,
            detectedVerb: { verb: '', original: '/user', path: '/user' },
            action: 'user/create',
            _middlewareType: 'ACTION: user/create',
            skipRegex: []
        },
        originalFn: /* [Function] */ { _middlewareType: 'ACTION: user/create' }
    };
    /* example of Sails.Route for custom route targetting blueprint action */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const customRouteTargettingBlueprintExampleForReference = {
        path: '/user/test2/:phoneNumber',
        target: '[Function]',
        verb: 'get',
        options: {
            detectedVerb: { verb: '', original: '/user/test2/:phoneNumber', path: '/user/test2/:phoneNumber' },
            swagger: { summary: 'Unusual route to access `find` blueprint' },
            action: 'user/find',
            _middlewareType: 'BLUEPRINT: find',
            skipRegex: [/^[^?]*\/[^?/]+\.[^?/]+(\?.*)?$/],
            skipAssets: true
        },
        originalFn: { /* [Function] */ _middlewareType: 'BLUEPRINT: find' }
    };
    /* example of Sails.Route for custom route action */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const customRouteTargettingActionExampleForReference = {
        path: '/api/v2/reporting/period-summary',
        target: '[Function: routeTargetFnWrapper]',
        verb: 'get',
        options: {
            detectedVerb: { verb: '', original: '/api/v2/reporting/period-summary', path: '/api/v2/reporting/period-summary' },
            action: 'reporting/periodsummary/run',
            _middlewareType: 'ACTION: reporting/periodsummary/run',
            skipRegex: []
        },
        originalFn: { /* [Function] */ _middlewareType: 'ACTION: reporting/periodsummary/run' }
    };
    /*
     * Background notes on Sails 'router:bind' events.
     *
     * Sails 'router:bind' emits events for the action **and** all middleware
     * (run before the action itself) applicable to the route. Events are emitted
     * in the order executed i.e. middleware (CORS, policies etc) with action handler
     * last.
     *
     * We filter based on `options._middlewareType` (taking actions and blueprints,
     * ignoring others) and merge for unique `verb`/`path` tuples.
     *
     * Note that:
     * 1. Middleware typically includes options of the final action (except
     *    CORS setHeaders it would seem).
     * 2. The value `originalFn._middlewareType` can be used to determine
     *    the nature of the middleware/action itself.
     *
     * @see https://github.com/balderdashy/sails/blob/master/lib/EVENTS.md#routerbind
     */
    /*
     * Background notes on `options.action`.
     *
     * Note that 'router:bind' events have a normalised action identity; lowercase, with
     * `Controller` removed and dots with slashes (`.`'s replaced with `/`'s).
     *
     * @see https://github.com/balderdashy/sails/blob/ef8e98f09d9a97ea9a22b1a7c961800bc906c061/lib/router/index.js#L455
     */
    /*
     * Background on `options` element of 'router:bind' events.
     *
     * Options contains values from several possible sources:
     * 1. Sails configuration `config/routes.js` route target objects (including
     *    all actions and actions targetting a blueprint action).
     * 2. Sails hook initialization `hook.routes.before` or `hook.routes.after`.
     * 3. Sails automatic blueprint routes.
     *
     * Most (all?) actions include the following options:
     * - action e.g. 'user/find'
     * - _middlewareType e.g. 'BLUEPRINT: find', 'ACTION: user/logout' or 'ACTION: subdir/actions2'
     *
     * Automatic blueprint routes also include:
     * - model - the identity of the model that a particular blueprint action should target
     * - alias - for blueprint actions that directly involve an association, indicates the name of the associating attribute
     * - associations - copy of `sails.models[identity].associations`
     *
     * Whilst automatic blueprints `options.model` is set (see above), Sails `parseBlueprintOptions()`
     * (see below) uses the model identity parsed from the action 'user/find' --> model 'User', blueprint action 'find'.
     * This rule (parsing from action) is used below.
     *
     * We can pick up `swagger` objects from either custom routes or hook routes.
     *
     * @see https://sailsjs.com/documentation/reference/request-req/req-options
     * @see https://sailsjs.com/documentation/concepts/extending-sails/hooks/hook-specification/routes
     * @see https://github.com/balderdashy/sails/blob/master/lib/hooks/blueprints/parse-blueprint-options.js#L58
     */
    /*
     * Background on shortcut route patterns used to detect blueprint shortcut routes.
     *
     * The following patterns are used to detect shortcut blueprint routes:
     * -  GET /:modelIdentity/find
     * -  GET /:modelIdentity/find/:id
     * -  GET /:modelIdentity/create
     * -  GET /:modelIdentity/update/:id
     * -  GET /:modelIdentity/destroy/:id
     * -  GET /:modelIdentity/:parentid/:association/add/:childid
     * -  GET /:modelIdentity/:parentid/:association/remove/:childid
     * -  GET /:modelIdentity/:parentid/:association/replace?association=[1,2...]
     */
    // key is `${verb}|${path}`, used to merge duplicate routes as per notes above
    const routeLookup = {};
    const ignoreDuplicateCheck = {};
    return boundRoutes
        .map(route => {
        const verb = route.verb.toLowerCase();
        // ignore RegExp-based routes
        if (typeof route.path !== 'string') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const routeKey = verb + '|' + route.path.toString();
            if (!ignoreDuplicateCheck[routeKey]) {
                ignoreDuplicateCheck[routeKey] = true;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (typeof route.path.exec === 'function') { // test for RegExp
                    sails.log.warn(`WARNING: sails-hook-swagger-generator: Ignoring regular expression based bound route '${route.verb} ${route.path}' - you will need to document manually if required`);
                }
                else {
                    sails.log.warn(`WARNING: sails-hook-swagger-generator: Ignoring route with unrecognised path '${route.verb} ${route.path}' - you will need to document manually if required`);
                }
            }
            return undefined;
        }
        // remove duplicates base on verb+path, merging options (overwriting); see notes above
        const routeKey = verb + '|' + route.path;
        if (!routeLookup[routeKey]) {
            routeLookup[routeKey] = {
                ...route,
                options: { ...route.options }
            };
            return routeLookup[routeKey];
        }
        else {
            Object.assign(routeLookup[routeKey].options, route.options);
            return undefined;
        }
    })
        .map(route => {
        if (!route) { // ignore removed duplicates
            return undefined;
        }
        const verb = route.verb.toLowerCase();
        const routeOptions = route.options;
        let _middlewareType, mwtAction;
        if (routeOptions._middlewareType) {
            // ACTION | BLUEPRINT | CORS HOOK | POLICY | VIEWS HOOK | CSRF HOOK | * HOOK
            const match = routeOptions._middlewareType.match(/^([^:]+):\s+(.+)$/);
            if (match) {
                _middlewareType = match[1].toLowerCase();
                mwtAction = match[2];
                if (_middlewareType !== 'action' && _middlewareType !== 'blueprint') {
                    sails.log.silly(`DEBUG: sails-hook-swagger-generator: Ignoring bound route '${route.verb} ${route.path}' bound to middleware of type '${routeOptions._middlewareType}'`);
                    return undefined;
                }
            }
            else {
                sails.log.warn(`WARNING: sails-hook-swagger-generator: Ignoring bound route '${route.verb} ${route.path}' bound to middleware with unrecognised type '${routeOptions._middlewareType}'`);
                return undefined;
            }
        }
        else {
            sails.log.verbose(`WARNING: sails-hook-swagger-generator: Ignoring bound route '${route.verb} ${route.path}' as middleware type missing`);
            return undefined;
        }
        const middlewareType = _middlewareType === 'blueprint' ? interfaces_1.MiddlewareType.BLUEPRINT : interfaces_1.MiddlewareType.ACTION;
        const parsedPath = parsePath(route.path);
        // model-based (blueprint or other) actions (of the form `{modelIdentity}/{action}`)
        const [modelIdentity, blueprintAction, ...tail] = routeOptions.action.split('/');
        if (tail.length === 0) {
            const model = models[modelIdentity];
            if (model) { // blueprint / model-based action
                if (middlewareType === interfaces_1.MiddlewareType.BLUEPRINT && mwtAction !== blueprintAction) {
                    sails.log.warn(`WARNING: sails-hook-swagger-generator: Bound route '${route.verb} ${route.path}' has blueprint action mismatch '${blueprintAction}' != '${routeOptions._middlewareType}' (ignoring)`);
                }
                let isShortcutBlueprintRoute = false;
                // test for shortcut blueprint routes
                if (verb === 'get') {
                    // 1:prefix, 2:identity, 3:shortcut-action, 4:id
                    const re = /^(\/.+)?\/([^/]+)\/(find|create|update|destroy)(\/:id)?$/;
                    // 1:prefix, 2:identity, 3:id, 4:association, 5:shortcut-action, 6:id
                    const re2 = /^(\/.+)?\/([^/]+)\/(:parentid)\/([^/]+)\/(add|remove|replace)(\/:childid)?$/;
                    if (route.path.match(re) || route.path.match(re2)) {
                        // XXX TODO check identity & shortcut-action matches action
                        isShortcutBlueprintRoute = true;
                    }
                }
                return {
                    middlewareType,
                    verb: verb,
                    ...parsedPath, // path & variables
                    action: routeOptions.action,
                    actionType: 'function',
                    model,
                    associationAliases: routeOptions.alias ? [routeOptions.alias] : [],
                    blueprintAction,
                    isShortcutBlueprintRoute,
                    swagger: routeOptions.swagger,
                };
            }
        }
        // fall-through --> non-model based action
        return {
            middlewareType,
            verb: verb,
            ...parsedPath, // path & variables
            action: routeOptions.action || mwtAction || '_unknown',
            actionType: 'function',
            swagger: routeOptions.swagger,
        };
    })
        .filter(route => !!route);
};
exports.parseBoundRoutes = parseBoundRoutes;
/**
 * Load and return details of all Sails controller files and actions.
 *
 * @note The loading mechanism is taken from Sails.
 * @see https://github.com/balderdashy/sails/blob/master/lib/app/private/controller/load-action-modules.js#L27
 *
 * @param sails
 */
const parseControllers = async (sails) => {
    const controllersLoadedFromDisk = await new Promise((resolve, reject) => {
        include_all_1.default.optional({
            dirname: sails.config.paths.controllers,
            filter: /(^[^.]+\.(?:(?!md|txt).)+$)/,
            flatten: true,
            keepDirectoryPath: true,
        }, (err, files) => {
            if (err)
                reject(err);
            resolve(files);
        });
    });
    const ret = {
        controllerFiles: {},
        actions: {}
    };
    // Traditional controllers are PascalCased and end with the word "Controller".
    const traditionalRegex = new RegExp('^((?:(?:.*)/)*([0-9A-Z][0-9a-zA-Z_]*))Controller\\..+$');
    // Actions are kebab-cased.
    const actionRegex = new RegExp('^((?:(?:.*)/)*([a-z][a-z0-9-]*))\\..+$');
    (0, lodash_1.forEach)(controllersLoadedFromDisk, (moduleDef) => {
        let filePath = moduleDef.globalId;
        if (filePath[0] === '.') {
            return;
        }
        if (path.dirname(filePath) !== '.') {
            filePath = path.dirname(filePath).replace(/\./g, '/') + '/' + path.basename(filePath);
        }
        /* traditional controllers */
        let match = traditionalRegex.exec(filePath);
        if (match) {
            if (!(0, lodash_1.isObject)(moduleDef) || (0, lodash_1.isArray)(moduleDef) || (0, lodash_1.isFunction)(moduleDef)) {
                return;
            }
            const moduleIdentity = match[1].toLowerCase();
            const defaultTagName = path.basename(match[1]);
            // store keyed on controller file identity
            ret.controllerFiles[moduleIdentity] = {
                ...moduleDef,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                swagger: moduleDef.swagger || {},
                actionType: 'controller',
                defaultTagName
            };
            // check for swagger.actions[] for which action dne AND convert to case-insensitive identities
            const swaggerActions = {};
            (0, lodash_1.forEach)(ret.controllerFiles[moduleIdentity].swagger.actions || {}, (swaggerDef, actionName) => {
                if (actionName === 'allActions') {
                    // proceed
                }
                else if (!moduleDef[actionName]) {
                    sails.log.warn(`WARNING: sails-hook-swagger-generator: Controller '${filePath}' contains Swagger action definition for unknown action '${actionName}'`);
                    return;
                }
                const actionIdentity = actionName.toLowerCase();
                if (swaggerActions[actionIdentity]) {
                    sails.log.warn(`WARNING: sails-hook-swagger-generator: Controller '${filePath}' contains Swagger action definition '${actionName}' which conflicts with a previously-loaded definition`);
                }
                swaggerActions[actionIdentity] = swaggerDef;
            });
            ret.controllerFiles[moduleIdentity].swagger.actions = swaggerActions;
            (0, lodash_1.forEach)(moduleDef, (action, actionName) => {
                if ((0, lodash_1.isString)(action)) { /* ignore */
                    return;
                }
                else if (actionName === '_config') { /* ignore */
                    return;
                }
                else if (actionName === 'swagger') { /* ignore */
                    return;
                }
                else if ((0, lodash_1.isFunction)(action)) {
                    const actionIdentity = (moduleIdentity + '/' + actionName).toLowerCase();
                    if (ret.actions[actionIdentity]) {
                        // conflict --> dealt with by Sails loader so just ignore here
                    }
                    else {
                        ret.actions[actionIdentity] = {
                            actionType: 'controller',
                            defaultTagName,
                            fn: action,
                        };
                        const _action = action;
                        if (_action.swagger) {
                            ret.actions[actionIdentity].swagger = _action.swagger;
                        }
                    }
                }
            });
            /* else actions (standalone or actions2) */
        }
        else if ((match = actionRegex.exec(filePath))) {
            const actionIdentity = match[1].toLowerCase();
            if (ret.actions[actionIdentity]) {
                // conflict --> dealt with by Sails loader so just ignore here
                return;
            }
            const actionType = (0, lodash_1.isFunction)(moduleDef) ? 'standalone' : 'actions2';
            const defaultTagName = path.basename(match[1]);
            // store keyed on controller file identity
            ret.controllerFiles[actionIdentity] = {
                ...moduleDef,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                swagger: moduleDef.swagger || {},
                actionType,
                defaultTagName
            };
            if ((0, lodash_1.isFunction)(moduleDef)) {
                ret.actions[actionIdentity] = {
                    actionType,
                    defaultTagName: path.basename(match[1]),
                    fn: moduleDef,
                };
                const _action = moduleDef;
                if (_action.swagger) {
                    ret.actions[actionIdentity].swagger = _action.swagger;
                }
            }
            else if (!(0, lodash_1.isUndefined)(moduleDef.machine) || !(0, lodash_1.isUndefined)(moduleDef.friendlyName) || (0, lodash_1.isFunction)(moduleDef.fn)) {
                // note no swagger here as this is captured at the controller file level above
                ret.actions[actionIdentity] = {
                    actionType,
                    defaultTagName,
                    ...(0, lodash_1.omit)(moduleDef, 'swagger')
                };
            }
            // check for swagger.actions[] for which action dne
            (0, lodash_1.forEach)(ret.controllerFiles[actionIdentity].swagger.actions || {}, (swaggerDef, actionName) => {
                if (actionName === 'allActions')
                    return;
                if (actionName !== defaultTagName) {
                    sails.log.warn(`WARNING: sails-hook-swagger-generator: ${ret.actions[actionIdentity].actionType} action '${filePath}' contains Swagger action definition for unknown action '${actionName}' (expected '${defaultTagName}')`);
                }
            });
        }
    });
    return ret;
};
exports.parseControllers = parseControllers;
/**
 * Loads and parses model JSDoc, returning a map keyed on model identity.
 *
 * @note Identities lowercase.
 *
 * @param sails
 * @param models
 */
const parseModelsJsDoc = async (sails, models) => {
    const ret = {};
    await Promise.all((0, lodash_1.map)(models, async (model, identity) => {
        try {
            let modelFile;
            try {
                modelFile = require.resolve(path.join(sails.config.paths.models, model.globalId));
            }
            catch {
                // Model may be in a subdirectory; find it via require.cache (Sails already loaded it)
                const modelsDir = path.resolve(sails.config.paths.models);
                const cacheKey = Object.keys(require.cache).find(k => k.startsWith(modelsDir) && path.basename(k, path.extname(k)) === model.globalId);
                if (!cacheKey) {
                    sails.log.warn(`sails-hook-swagger-generator: Could not locate model file for ${model.globalId} (JSDoc parsing skipped)`);
                    return;
                }
                modelFile = cacheKey;
            }
            const swaggerDoc = await (0, utils_1.loadSwaggerDocComments)(modelFile);
            const modelJsDocPath = '/' + model.globalId;
            ret[identity] = {
                tags: swaggerDoc.tags,
                components: swaggerDoc.components,
                actions: {},
            };
            // check for paths for which an action dne AND convert to case-insensitive identities
            (0, lodash_1.forEach)(swaggerDoc.paths, (swaggerDef, actionName) => {
                if (actionName === modelJsDocPath) {
                    return;
                }
                else if (actionName === '/allActions') {
                    // proceed
                }
                else if (!actionName.startsWith('/') || !utils_1.blueprintActions.includes(actionName.slice(1))) {
                    sails.log.warn(`WARNING: sails-hook-swagger-generator: Model file '${model.globalId}' contains Swagger JSDoc action definition for unknown blueprint action '${actionName}'`);
                    return;
                }
                const actionIdentity = actionName.substring(1).toLowerCase(); // convert '/{action}' --> '{action}'
                if (ret[identity].actions[actionIdentity]) {
                    sails.log.warn(`WARNING: sails-hook-swagger-generator: Model file '${model.globalId}' contains Swagger JSDoc action definition '${actionName}' which conflicts with a previously-loaded definition`);
                }
                // note coercion as non-standard swaggerDoc i.e. '/{action}' contains operation contents (no HTTP method specified)
                ret[identity].actions[actionIdentity] = swaggerDef;
            });
            const modelJsDoc = swaggerDoc.paths['/' + model.globalId];
            if (modelJsDoc) {
                // note coercion as non-standard swaggerDoc i.e. '/{globalId}' contains operation contents (no HTTP method specified)
                ret[identity].modelSchema = modelJsDoc;
            }
        }
        catch (err) {
            sails.log.warn(`sails-hook-swagger-generator: Error parsing JSDoc for model ${model.globalId}: ${err.message || ''}`);
        }
    }));
    return ret;
};
exports.parseModelsJsDoc = parseModelsJsDoc;
/**
 * Loads and parses controller JSDoc, returning a map keyed on controller file identity.
 *
 * @note Identities lowercase.
 *
 * @param sails
 * @param controllers
 */
const parseControllerJsDoc = async (sails, controllers) => {
    const ret = {};
    await Promise.all((0, lodash_1.map)(controllers.controllerFiles, async (controller, identity) => {
        try {
            let controllerFile;
            try {
                controllerFile = require.resolve(path.join(sails.config.paths.controllers, controller.globalId));
            }
            catch {
                const controllersDir = path.resolve(sails.config.paths.controllers);
                // globalId may use dots or slashes for subdirectories; normalize to path separator
                const normalizedId = controller.globalId.replace(/\./g, '/');
                const cacheKey = Object.keys(require.cache).find(k => {
                    if (!k.startsWith(controllersDir))
                        return false;
                    const rel = k.substring(controllersDir.length + 1).replace(/\.[^.]+$/, ''); // strip extension
                    return rel === normalizedId || rel === controller.globalId;
                });
                if (!cacheKey) {
                    sails.log.verbose(`sails-hook-swagger-generator: Could not locate controller file for ${controller.globalId} (JSDoc parsing skipped)`);
                    return;
                }
                controllerFile = cacheKey;
            }
            const swaggerDoc = await (0, utils_1.loadSwaggerDocComments)(controllerFile);
            ret[identity] = {
                tags: swaggerDoc.tags,
                components: swaggerDoc.components,
                actions: {},
            };
            // check for paths for which an action dne AND convert to case-insensitive identities
            (0, lodash_1.forEach)(swaggerDoc.paths, (swaggerDef, actionName) => {
                if (actionName === '/allActions') {
                    // proceed
                }
                else if (controller.actionType === 'standalone' || controller.actionType === 'actions2') {
                    if (actionName !== `/${controller.defaultTagName}`) {
                        sails.log.warn(`WARNING: sails-hook-swagger-generator: ${controller.actionType} action '${controller.globalId}' contains Swagger JSDoc action definition for unknown action '${actionName}' (expected '/${controller.defaultTagName}')`);
                        return;
                    }
                }
                else {
                    if (!actionName.startsWith('/') || !controller[actionName.slice(1)]) {
                        sails.log.warn(`WARNING: sails-hook-swagger-generator: Controller file '${controller.globalId}' contains Swagger JSDoc action defintion for unknown action '${actionName}'`);
                        return;
                    }
                }
                const actionIdentity = actionName.substring(1).toLowerCase(); // convert '/{action}' --> '{action}'
                if (ret[identity].actions[actionIdentity]) {
                    sails.log.warn(`WARNING: sails-hook-swagger-generator: Controller file '${controller.globalId}' contains Swagger JSDoc action definition '${actionName}' which conflicts with a previously-loaded definition`);
                }
                // note coercion as non-standard swaggerDoc i.e. '/{action}' contains operation contents (no HTTP method specified)
                ret[identity].actions[actionIdentity] = swaggerDef;
            });
        }
        catch (err) {
            sails.log.warn(`sails-hook-swagger-generator: Error parsing JSDoc for controller ${controller.globalId}: ${err.message || ''}`);
        }
    }));
    return ret;
};
exports.parseControllerJsDoc = parseControllerJsDoc;
