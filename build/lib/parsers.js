"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Created by theophy on 02/08/2017.
 */
var path = __importStar(require("path"));
var interfaces_1 = require("./interfaces");
var utils_1 = require("./utils");
var lodash_1 = require("lodash");
var include_all_1 = __importDefault(require("include-all"));
/**
 * Parses Sails route path of the form `/path/:id` to extract list of variables
 * and optional variables.
 *
 * Optional variables are annotated with a `?` as `/path/:id?`.
 *
 * @note The `variables` elements contains all variables (including optional).
 */
var parsePath = function (path) {
    var variables = [];
    var optionalVariables = [];
    path
        .split('/')
        .map(function (v) {
        var match = v.match(/^:([^/:?]+)(\?)?$/);
        if (match) {
            variables.push(match[1]);
            if (match[2])
                optionalVariables.push(match[1]);
        }
    });
    return { path: path, variables: variables, optionalVariables: optionalVariables };
};
/**
 * Parse Sails ORM models (runtime versions from `sails.models`).
 *
 * @param sails
 */
exports.parseModels = function (sails) {
    var filteredModels = lodash_1.pickBy(sails.models, function (model /*, _identity */) {
        // consider all models except associative tables and 'Archive' model special case
        return !!model.globalId && model.globalId !== 'Archive';
    });
    return lodash_1.mapValues(filteredModels, function (model) {
        return {
            globalId: model.globalId,
            primaryKey: model.primaryKey,
            identity: model.identity,
            identityPlural: model._identity_plural || model.identity + 's',
            attributes: model.attributes,
            associations: model.associations,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            swagger: model.swagger || {}
        };
    });
};
/**
 * Parse array of routes capture from Sails 'router:bind' events.
 *
 * @note See detailed background in implementation comments.
 *
 * @param boundRoutes
 * @param models
 * @param sails
 */
exports.parseBoundRoutes = function (boundRoutes, models, sails) {
    /* example of Sails.Route (in particular `options`) for standard blueprint */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    var standardBlueprintRouteExampleForReference = {
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
    var standardBlueprintRouteWithOverriddenActionExampleForReference = {
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
    var customRouteTargettingBlueprintExampleForReference = {
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
    var customRouteTargettingActionExampleForReference = {
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
    var routeLookup = {};
    var ignoreDuplicateCheck = {};
    return boundRoutes
        .map(function (route) {
        var verb = route.verb.toLowerCase();
        // ignore RegExp-based routes
        if (typeof route.path !== 'string') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            var routeKey_1 = verb + '|' + route.path.toString();
            if (!ignoreDuplicateCheck[routeKey_1]) {
                ignoreDuplicateCheck[routeKey_1] = true;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (typeof route.path.exec === 'function') { // test for RegExp
                    sails.log.warn("WARNING: sails-hook-swagger-generator: Ignoring regular expression based bound route '" + route.verb + " " + route.path + "' - you will need to document manually if required");
                }
                else {
                    sails.log.warn("WARNING: sails-hook-swagger-generator: Ignoring route with unrecognised path '" + route.verb + " " + route.path + "' - you will need to document manually if required");
                }
            }
            return undefined;
        }
        // remove duplicates base on verb+path, merging options (overwriting); see notes above
        var routeKey = verb + '|' + route.path;
        if (!routeLookup[routeKey]) {
            routeLookup[routeKey] = __assign(__assign({}, route), { options: __assign({}, route.options) });
            return routeLookup[routeKey];
        }
        else {
            Object.assign(routeLookup[routeKey].options, route.options);
            return undefined;
        }
    })
        .map(function (route) {
        if (!route) { // ignore removed duplicates
            return undefined;
        }
        var verb = route.verb.toLowerCase();
        var routeOptions = route.options;
        var _middlewareType, mwtAction;
        if (routeOptions._middlewareType) {
            // ACTION | BLUEPRINT | CORS HOOK | POLICY | VIEWS HOOK | CSRF HOOK | * HOOK
            var match = routeOptions._middlewareType.match(/^([^:]+):\s+(.+)$/);
            if (match) {
                _middlewareType = match[1].toLowerCase();
                mwtAction = match[2];
                if (_middlewareType !== 'action' && _middlewareType !== 'blueprint') {
                    sails.log.silly("DEBUG: sails-hook-swagger-generator: Ignoring bound route '" + route.verb + " " + route.path + "' bound to middleware of type '" + routeOptions._middlewareType + "'");
                    return undefined;
                }
            }
            else {
                sails.log.warn("WARNING: sails-hook-swagger-generator: Ignoring bound route '" + route.verb + " " + route.path + "' bound to middleware with unrecognised type '" + routeOptions._middlewareType + "'");
                return undefined;
            }
        }
        else {
            sails.log.verbose("WARNING: sails-hook-swagger-generator: Ignoring bound route '" + route.verb + " " + route.path + "' as middleware type missing");
            return undefined;
        }
        var middlewareType = _middlewareType === 'blueprint' ? interfaces_1.MiddlewareType.BLUEPRINT : interfaces_1.MiddlewareType.ACTION;
        var parsedPath = parsePath(route.path);
        // model-based (blueprint or other) actions (of the form `{modelIdentity}/{action}`)
        var _a = routeOptions.action.split('/'), modelIdentity = _a[0], blueprintAction = _a[1], tail = _a.slice(2);
        if (tail.length === 0) {
            var model = models[modelIdentity];
            if (model) { // blueprint / model-based action
                if (middlewareType === interfaces_1.MiddlewareType.BLUEPRINT && mwtAction !== blueprintAction) {
                    sails.log.warn("WARNING: sails-hook-swagger-generator: Bound route '" + route.verb + " " + route.path + "' has blueprint action mismatch '" + blueprintAction + "' != '" + routeOptions._middlewareType + "' (ignoring)");
                }
                var isShortcutBlueprintRoute = false;
                // test for shortcut blueprint routes
                if (verb === 'get') {
                    // 1:prefix, 2:identity, 3:shortcut-action, 4:id
                    var re = /^(\/.+)?\/([^/]+)\/(find|create|update|destroy)(\/:id)?$/;
                    // 1:prefix, 2:identity, 3:id, 4:association, 5:shortcut-action, 6:id
                    var re2 = /^(\/.+)?\/([^/]+)\/(:parentid)\/([^/]+)\/(add|remove|replace)(\/:childid)?$/;
                    if (route.path.match(re) || route.path.match(re2)) {
                        // XXX TODO check identity & shortcut-action matches action
                        isShortcutBlueprintRoute = true;
                    }
                }
                return __assign(__assign({ middlewareType: middlewareType, verb: verb }, parsedPath), { action: routeOptions.action, actionType: 'function', model: model, associationAliases: routeOptions.alias ? [routeOptions.alias] : [], blueprintAction: blueprintAction,
                    isShortcutBlueprintRoute: isShortcutBlueprintRoute, swagger: routeOptions.swagger });
            }
        }
        // fall-through --> non-model based action
        return __assign(__assign({ middlewareType: middlewareType, verb: verb }, parsedPath), { action: routeOptions.action || mwtAction || '_unknown', actionType: 'function', swagger: routeOptions.swagger });
    })
        .filter(function (route) { return !!route; });
};
/**
 * Load and return details of all Sails controller files and actions.
 *
 * @note The loading mechanism is taken from Sails.
 * @see https://github.com/balderdashy/sails/blob/master/lib/app/private/controller/load-action-modules.js#L27
 *
 * @param sails
 */
exports.parseControllers = function (sails) { return __awaiter(void 0, void 0, void 0, function () {
    var controllersLoadedFromDisk, ret, traditionalRegex, actionRegex;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, new Promise(function (resolve, reject) {
                    include_all_1.default.optional({
                        dirname: sails.config.paths.controllers,
                        filter: /(^[^.]+\.(?:(?!md|txt).)+$)/,
                        flatten: true,
                        keepDirectoryPath: true,
                    }, function (err, files) {
                        if (err)
                            reject(err);
                        resolve(files);
                    });
                })];
            case 1:
                controllersLoadedFromDisk = _a.sent();
                ret = {
                    controllerFiles: {},
                    actions: {}
                };
                traditionalRegex = new RegExp('^((?:(?:.*)/)*([0-9A-Z][0-9a-zA-Z_]*))Controller\\..+$');
                actionRegex = new RegExp('^((?:(?:.*)/)*([a-z][a-z0-9-]*))\\..+$');
                lodash_1.forEach(controllersLoadedFromDisk, function (moduleDef) {
                    var filePath = moduleDef.globalId;
                    if (filePath[0] === '.') {
                        return;
                    }
                    if (path.dirname(filePath) !== '.') {
                        filePath = path.dirname(filePath).replace(/\./g, '/') + '/' + path.basename(filePath);
                    }
                    /* traditional controllers */
                    var match = traditionalRegex.exec(filePath);
                    if (match) {
                        if (!lodash_1.isObject(moduleDef) || lodash_1.isArray(moduleDef) || lodash_1.isFunction(moduleDef)) {
                            return;
                        }
                        var moduleIdentity_1 = match[1].toLowerCase();
                        var defaultTagName_1 = path.basename(match[1]);
                        // store keyed on controller file identity
                        ret.controllerFiles[moduleIdentity_1] = __assign(__assign({}, moduleDef), { 
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            swagger: moduleDef.swagger || {}, actionType: 'controller', defaultTagName: defaultTagName_1 });
                        // check for swagger.actions[] for which action dne AND convert to case-insensitive identities
                        var swaggerActions_1 = {};
                        lodash_1.forEach(ret.controllerFiles[moduleIdentity_1].swagger.actions || {}, function (swaggerDef, actionName) {
                            if (actionName === 'allActions') {
                                // proceed
                            }
                            else if (!moduleDef[actionName]) {
                                sails.log.warn("WARNING: sails-hook-swagger-generator: Controller '" + filePath + "' contains Swagger action definition for unknown action '" + actionName + "'");
                                return;
                            }
                            var actionIdentity = actionName.toLowerCase();
                            if (swaggerActions_1[actionIdentity]) {
                                sails.log.warn("WARNING: sails-hook-swagger-generator: Controller '" + filePath + "' contains Swagger action definition '" + actionName + "' which conflicts with a previously-loaded definition");
                            }
                            swaggerActions_1[actionIdentity] = swaggerDef;
                        });
                        ret.controllerFiles[moduleIdentity_1].swagger.actions = swaggerActions_1;
                        lodash_1.forEach(moduleDef, function (action, actionName) {
                            if (lodash_1.isString(action)) { /* ignore */
                                return;
                            }
                            else if (actionName === '_config') { /* ignore */
                                return;
                            }
                            else if (actionName === 'swagger') { /* ignore */
                                return;
                            }
                            else if (lodash_1.isFunction(action)) {
                                var actionIdentity = (moduleIdentity_1 + '/' + actionName).toLowerCase();
                                if (ret.actions[actionIdentity]) {
                                    // conflict --> dealt with by Sails loader so just ignore here
                                }
                                else {
                                    ret.actions[actionIdentity] = {
                                        actionType: 'controller',
                                        defaultTagName: defaultTagName_1,
                                        fn: action,
                                    };
                                    var _action = action;
                                    if (_action.swagger) {
                                        ret.actions[actionIdentity].swagger = _action.swagger;
                                    }
                                }
                            }
                        });
                        /* else actions (standalone or actions2) */
                    }
                    else if ((match = actionRegex.exec(filePath))) {
                        var actionIdentity_1 = match[1].toLowerCase();
                        if (ret.actions[actionIdentity_1]) {
                            // conflict --> dealt with by Sails loader so just ignore here
                            return;
                        }
                        var actionType = lodash_1.isFunction(moduleDef) ? 'standalone' : 'actions2';
                        var defaultTagName_2 = path.basename(match[1]);
                        // store keyed on controller file identity
                        ret.controllerFiles[actionIdentity_1] = __assign(__assign({}, moduleDef), { 
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            swagger: moduleDef.swagger || {}, actionType: actionType,
                            defaultTagName: defaultTagName_2 });
                        if (lodash_1.isFunction(moduleDef)) {
                            ret.actions[actionIdentity_1] = {
                                actionType: actionType,
                                defaultTagName: path.basename(match[1]),
                                fn: moduleDef,
                            };
                            var _action = moduleDef;
                            if (_action.swagger) {
                                ret.actions[actionIdentity_1].swagger = _action.swagger;
                            }
                        }
                        else if (!lodash_1.isUndefined(moduleDef.machine) || !lodash_1.isUndefined(moduleDef.friendlyName) || lodash_1.isFunction(moduleDef.fn)) {
                            // note no swagger here as this is captured at the controller file level above
                            ret.actions[actionIdentity_1] = __assign({ actionType: actionType,
                                defaultTagName: defaultTagName_2 }, lodash_1.omit(moduleDef, 'swagger'));
                        }
                        // check for swagger.actions[] for which action dne
                        lodash_1.forEach(ret.controllerFiles[actionIdentity_1].swagger.actions || {}, function (swaggerDef, actionName) {
                            if (actionName === 'allActions')
                                return;
                            if (actionName !== defaultTagName_2) {
                                sails.log.warn("WARNING: sails-hook-swagger-generator: " + ret.actions[actionIdentity_1].actionType + " action '" + filePath + "' contains Swagger action definition for unknown action '" + actionName + "' (expected '" + defaultTagName_2 + "')");
                            }
                        });
                    }
                });
                return [2 /*return*/, ret];
        }
    });
}); };
/**
 * Loads and parses model JSDoc, returning a map keyed on model identity.
 *
 * @note Identities lowercase.
 *
 * @param sails
 * @param models
 */
exports.parseModelsJsDoc = function (sails, models) { return __awaiter(void 0, void 0, void 0, function () {
    var ret;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                ret = {};
                return [4 /*yield*/, Promise.all(lodash_1.map(models, function (model, identity) { return __awaiter(void 0, void 0, void 0, function () {
                        var modelFile, swaggerDoc, modelJsDocPath_1, modelJsDoc, err_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    modelFile = require.resolve(path.join(sails.config.paths.models, model.globalId));
                                    return [4 /*yield*/, utils_1.loadSwaggerDocComments(modelFile)];
                                case 1:
                                    swaggerDoc = _a.sent();
                                    modelJsDocPath_1 = '/' + model.globalId;
                                    ret[identity] = {
                                        tags: swaggerDoc.tags,
                                        components: swaggerDoc.components,
                                        actions: {},
                                    };
                                    // check for paths for which an action dne AND convert to case-insensitive identities
                                    lodash_1.forEach(swaggerDoc.paths, function (swaggerDef, actionName) {
                                        if (actionName === modelJsDocPath_1) {
                                            return;
                                        }
                                        else if (actionName === '/allActions') {
                                            // proceed
                                        }
                                        else if (!actionName.startsWith('/') || !utils_1.blueprintActions.includes(actionName.slice(1))) {
                                            sails.log.warn("WARNING: sails-hook-swagger-generator: Model file '" + model.globalId + "' contains Swagger JSDoc action definition for unknown blueprint action '" + actionName + "'");
                                            return;
                                        }
                                        var actionIdentity = actionName.substring(1).toLowerCase(); // convert '/{action}' --> '{action}'
                                        if (ret[identity].actions[actionIdentity]) {
                                            sails.log.warn("WARNING: sails-hook-swagger-generator: Model file '" + model.globalId + "' contains Swagger JSDoc action definition '" + actionName + "' which conflicts with a previously-loaded definition");
                                        }
                                        // note coercion as non-standard swaggerDoc i.e. '/{action}' contains operation contents (no HTTP method specified)
                                        ret[identity].actions[actionIdentity] = swaggerDef;
                                    });
                                    modelJsDoc = swaggerDoc.paths['/' + model.globalId];
                                    if (modelJsDoc) {
                                        // note coercion as non-standard swaggerDoc i.e. '/{globalId}' contains operation contents (no HTTP method specified)
                                        ret[identity].modelSchema = modelJsDoc;
                                    }
                                    return [3 /*break*/, 3];
                                case 2:
                                    err_1 = _a.sent();
                                    sails.log.error("ERROR: sails-hook-swagger-generator: Error resolving/loading model " + model.globalId + ": " + (err_1.message || '') /* , err */);
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); }))];
            case 1:
                _a.sent();
                return [2 /*return*/, ret];
        }
    });
}); };
/**
 * Loads and parses controller JSDoc, returning a map keyed on controller file identity.
 *
 * @note Identities lowercase.
 *
 * @param sails
 * @param controllers
 */
exports.parseControllerJsDoc = function (sails, controllers) { return __awaiter(void 0, void 0, void 0, function () {
    var ret;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                ret = {};
                return [4 /*yield*/, Promise.all(lodash_1.map(controllers.controllerFiles, function (controller, identity) { return __awaiter(void 0, void 0, void 0, function () {
                        var controllerFile, swaggerDoc, err_2;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    controllerFile = path.join(sails.config.paths.controllers, controller.globalId);
                                    return [4 /*yield*/, utils_1.loadSwaggerDocComments(controllerFile)];
                                case 1:
                                    swaggerDoc = _a.sent();
                                    ret[identity] = {
                                        tags: swaggerDoc.tags,
                                        components: swaggerDoc.components,
                                        actions: {},
                                    };
                                    // check for paths for which an action dne AND convert to case-insensitive identities
                                    lodash_1.forEach(swaggerDoc.paths, function (swaggerDef, actionName) {
                                        if (actionName === '/allActions') {
                                            // proceed
                                        }
                                        else if (controller.actionType === 'standalone' || controller.actionType === 'actions2') {
                                            if (actionName !== "/" + controller.defaultTagName) {
                                                sails.log.warn("WARNING: sails-hook-swagger-generator: " + controller.actionType + " action '" + controller.globalId + "' contains Swagger JSDoc action definition for unknown action '" + actionName + "' (expected '/" + controller.defaultTagName + "')");
                                                return;
                                            }
                                        }
                                        else {
                                            if (!actionName.startsWith('/') || !controller[actionName.slice(1)]) {
                                                sails.log.warn("WARNING: sails-hook-swagger-generator: Controller file '" + controller.globalId + "' contains Swagger JSDoc action defintion for unknown action '" + actionName + "'");
                                                return;
                                            }
                                        }
                                        var actionIdentity = actionName.substring(1).toLowerCase(); // convert '/{action}' --> '{action}'
                                        if (ret[identity].actions[actionIdentity]) {
                                            sails.log.warn("WARNING: sails-hook-swagger-generator: Controller file '" + controller.globalId + "' contains Swagger JSDoc action definition '" + actionName + "' which conflicts with a previously-loaded definition");
                                        }
                                        // note coercion as non-standard swaggerDoc i.e. '/{action}' contains operation contents (no HTTP method specified)
                                        ret[identity].actions[actionIdentity] = swaggerDef;
                                    });
                                    return [3 /*break*/, 3];
                                case 2:
                                    err_2 = _a.sent();
                                    sails.log.error("ERROR: sails-hook-swagger-generator: Error resolving/loading controller " + controller.globalId + ": " + (err_2.message || '') /* , err */);
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); }))];
            case 1:
                _a.sent();
                return [2 /*return*/, ret];
        }
    });
}); };
