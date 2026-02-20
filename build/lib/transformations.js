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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeTags = exports.mergeComponents = exports.mergeControllerSwaggerIntoRouteInfo = exports.mergeControllerJsDoc = exports.mergeModelJsDoc = exports.aggregateAssociationRoutes = exports.transformSailsPathsToSwaggerPaths = void 0;
var interfaces_1 = require("./interfaces");
var lodash_1 = require("lodash");
var path_1 = __importDefault(require("path"));
var utils_1 = require("./utils");
var transformSailsPathToSwaggerPath = function (path) {
    return path
        .split('/')
        .map(function (v) { return v.replace(/^:([^/:?]+)\??$/, '{$1}'); })
        .join('/');
};
/**
 * Maps from a Sails route path of the form `/path/:id` to a
 * Swagger path of the form `/path/{id}`.
 *
 * Also transform standard Sails primary key reference '{id}' to
 * '_{primaryKeyAttributeName}'.
 *
 * Add underscore to path variable names, used to differentiate the PK value
 * used for paths from query variables. Specifically, differentiate the PK value
 * used for shortcut blueprint update routes, which allow for PK update
 * using query parameters. Some validators expect unique names across all
 * parameter types.
 */
var transformSailsPathsToSwaggerPaths = function (routes) {
    routes.map(function (route) {
        var _a;
        route.path = transformSailsPathToSwaggerPath(route.path);
        if ((_a = route.model) === null || _a === void 0 ? void 0 : _a.primaryKey) {
            var pathVariable_1 = '_' + route.model.primaryKey;
            route.path = route.path.replace('{id}', "{".concat(pathVariable_1, "}"));
            route.variables = route.variables.map(function (v) { return v === 'id' ? pathVariable_1 : v; });
            route.optionalVariables = route.optionalVariables.map(function (v) { return v === 'id' ? pathVariable_1 : v; });
        }
    });
};
exports.transformSailsPathsToSwaggerPaths = transformSailsPathsToSwaggerPaths;
/*
  * Sails returns individual routes for each association:
  * - /api/v1/quote/:parentid/supplier/:childid
  * - /api/v1/quote/:parentid/items/:childid
  *
  * where the model is 'quote' and the populate aliases are 'supplier' and 'items'.
  *
  * We now aggreggate these routes considering:
  * 1. Blueprint prefix, REST prefix, and model including any pluralization
  * 2. More complete grouping check including verb, model, and blueprint
  *
  * Note that we seek to maintain order of routes.
  *
  * RESTful Blueprint Routes
  * - **add**: PUT /api/v2/activitysummary/:parentid/${alias}/:childid
  * - **remove**: DELETE /api/v2/activitysummary/:parentid/${alias}/:childid
  * - **replace**: PUT /api/v2/activitysummary/:parentid/${alias}
  * - **populate**: GET /api/v2/activitysummary/:parentid/${alias}
  *
  * Shortcut Routes
  * - **add**: GET /api/v2/activitysummary/:parentid/${alias}/add/:childid
  * - **remove**: GET /api/v2/activitysummary/:parentid/${alias}/remove/:childid
  * - **replace**: GET /api/v2/activitysummary/:parentid/${alias}/replace
  *
  * @see https://sailsjs.com/documentation/concepts/blueprints/blueprint-routes#?restful-blueprint-routes
  * @see https://sailsjs.com/documentation/concepts/blueprints/blueprint-routes#?shortcut-blueprint-routes
  *
  */
var aggregateAssociationRoutes = function (boundRoutes /*, models: NameKeyMap<SwaggerSailsModel>*/) {
    /* standard Sails blueprint path pattern, noting that prefix (match[1]) includes
     * blueprint prefix, REST prefix, and model including any pluralization. */
    var re = /^(\/.*)\/{parentid}\/([^/]+)(\/(?:add|remove|replace))?(\/{childid})?$/;
    // only considering these relevant actions
    var actions = ['add', 'remove', 'replace', 'populate'];
    // step 1: filter to include path matched blueprint actions with a single association alias defined
    var routesToBeAggregated = boundRoutes.map(function (route) {
        if (route.blueprintAction && actions.indexOf(route.blueprintAction) >= 0
            && route.associationAliases && route.associationAliases.length === 1) {
            var match = route.path.match(re);
            if (match && route.associationAliases[0] === match[2]) {
                return { route: route, match: match };
            }
        }
        return undefined;
    })
        .filter(function (r) { return !!r; });
    // step 2: group by verb --> then route prefix --> then model identity --> then blueprint action
    var groupedByVerb = (0, lodash_1.groupBy)(routesToBeAggregated, function (r) { return r.route.verb; });
    var thenByPathPrefix = (0, lodash_1.mapValues)(groupedByVerb, function (verbGroup) { return (0, lodash_1.groupBy)(verbGroup, function (r) { return r.match[1]; }); });
    var thenByModelIdentity = (0, lodash_1.mapValues)(thenByPathPrefix, function (verbGroup) { return (0, lodash_1.mapValues)(verbGroup, function (prefixGroup) { return (0, lodash_1.groupBy)(prefixGroup, function (r) { return r.route.model.identity; }); }); });
    var thenByAction = (0, lodash_1.mapValues)(thenByModelIdentity, function (verbGroup) { return (0, lodash_1.mapValues)(verbGroup, function (prefixGroup) { return (0, lodash_1.mapValues)(prefixGroup, function (modelGroup) { return (0, lodash_1.groupBy)(modelGroup, function (r) { return r.route.blueprintAction; }); }); }); });
    // const example = {
    //   get: { // <-- verb groups
    //     '/api/v9/rest/pets': { // <-- url prefix groups
    //       pet: { // <-- model identity groups
    //         populate: [ // <-- blueprint association action groups (add, remove, replace, populate)
    //           {
    //             route: { path: '/api/v9/rest/pets/{parentid}/owner', ... },
    //             match: ['/api/v9/rest/pets/{parentid}/owner', '/api/v9/rest/pets', ... ],
    //           }, {
    //             route: { path: '/api/v9/rest/pets/{parentid}/caredForBy', ... },
    //             match: ['/api/v9/rest/pets/{parentid}/caredForBy', '/api/v9/rest/pets', ... ],
    //           }
    //         ]
    //       }
    //     }
    //   }
    // };
    // step 3: perform aggregation of leaf groups
    var transformedRoutes = {};
    (0, lodash_1.map)(thenByAction, function (verbGroup) {
        (0, lodash_1.map)(verbGroup, function (prefixGroup) {
            (0, lodash_1.map)(prefixGroup, function (modelGroup) {
                (0, lodash_1.map)(modelGroup, function (actionGroup) {
                    // first route becomes 'aggregated' version
                    var g = actionGroup[0];
                    var prefix = g.match[1];
                    var pk = '_' + g.route.model.primaryKey; // note '_' as per transformSailsPathsToSwaggerPaths()
                    var shortcutRoutePart = g.match[3] || '';
                    var childPart = g.match[4] || '';
                    var aggregatedRoute = __assign(__assign({}, g.route), { path: "".concat(prefix, "/{").concat(pk, "}/{association}").concat(shortcutRoutePart).concat(childPart), variables: __spreadArray(__spreadArray([], g.route.variables.map(function (v) { return v === 'parentid' ? pk : v; }), true), ['association'], false), optionalVariables: g.route.optionalVariables.map(function (v) { return v === 'parentid' ? pk : v; }), associationAliases: actionGroup.map(function (r) { return r.route.associationAliases[0]; }) });
                    var routeKey = g.route.verb + '|' + g.route.path;
                    transformedRoutes[routeKey] = aggregatedRoute;
                    // mark others for removal
                    actionGroup.slice(1).map(function (g) {
                        var routeKey = g.route.verb + '|' + g.route.path;
                        transformedRoutes[routeKey] = 'REMOVE';
                    });
                });
            });
        });
    });
    // step 4: filter
    return boundRoutes.map(function (route) {
        var routeKey = route.verb + '|' + route.path;
        if (transformedRoutes[routeKey] === undefined) {
            return route; // not being aggregrated --> retain
        }
        else if (transformedRoutes[routeKey] === 'REMOVE') {
            return undefined; // mark for removal
        }
        else {
            return transformedRoutes[routeKey]; // new aggregated route
        }
    })
        .filter(function (r) { return !!r; });
};
exports.aggregateAssociationRoutes = aggregateAssociationRoutes;
/**
 * Merges JSDoc `actions` and `model` elements **but not** `components` and `tags`
 * (which are merged in `mergeComponents()` and `mergeTags()`).
 *
 * @param models
 * @param modelsJsDoc
 */
var mergeModelJsDoc = function (models, modelsJsDoc) {
    (0, lodash_1.forEach)(models, function (model) {
        var modelJsDoc = modelsJsDoc[model.identity];
        if (modelJsDoc) {
            if (modelJsDoc.actions) {
                (0, lodash_1.forEach)(modelJsDoc.actions, function (action, actionName) {
                    if (!model.swagger.actions) {
                        model.swagger.actions = {};
                    }
                    if (!model.swagger.actions[actionName]) {
                        model.swagger.actions[actionName] = __assign({}, action);
                    }
                    else {
                        (0, lodash_1.defaults)(model.swagger.actions[actionName], action);
                    }
                });
            }
            if (modelJsDoc.modelSchema) {
                if (!model.swagger.modelSchema) {
                    model.swagger.modelSchema = __assign({}, modelJsDoc.modelSchema);
                }
                else {
                    (0, lodash_1.defaults)(model.swagger.modelSchema, modelJsDoc.modelSchema);
                }
            }
        }
    });
};
exports.mergeModelJsDoc = mergeModelJsDoc;
/**
 * Merges JSDoc into `controllerFiles` (not `actions`).
 *
 * The merge includes JSDoc `actions` and `controller` elements **but not** `components` and `tags`
 * (which are merged in `mergeComponents()` and `mergeTags()`).
 *
 * @param controllers
 * @param controllersJsDoc
 */
var mergeControllerJsDoc = function (controllers, controllersJsDoc) {
    (0, lodash_1.forEach)(controllers.controllerFiles, function (controllerFile, identity) {
        var controllerJsDoc = controllersJsDoc[identity];
        if (controllerJsDoc) {
            if (controllerJsDoc.actions) {
                (0, lodash_1.forEach)(controllerJsDoc.actions, function (action, actionName) {
                    if (!controllerFile.swagger.actions) {
                        controllerFile.swagger.actions = {};
                    }
                    if (!controllerFile.swagger.actions[actionName]) {
                        controllerFile.swagger.actions[actionName] = __assign({}, action);
                    }
                    else {
                        (0, lodash_1.defaults)(controllerFile.swagger.actions[actionName], action);
                    }
                });
            }
        }
    });
};
exports.mergeControllerJsDoc = mergeControllerJsDoc;
/**
 * Merges controller file Swagger/JSDoc into `routes` from controller files and controller file JSDoc.
 *
 * The merge includes JSDoc `actions` and `exclude` elements **but not** `components` and `tags`
 * (which are merged in `mergeComponents()` and `mergeTags()`).
 *
 * Specifically, in order of precedence:
 * 1. Route itself; in `SwaggerRouteInfo` and taken from `route.options` (from `config/routes.js` or route bound by hook)
 * 2. Controller file action function `swagger` element (`controllers.actions[].swagger` below)
 * 3. Controller file `swagger` element export (`controllers.controllerFiles[].swagger.actions[]` below) incl `allActions`.
 * 4. Controller file JSDoc `@swagger` comments under the `/{action}` path (`controllersJsDoc[].actions[]` below) incl `allActions`.
 *
 * This function also merges the Actions2Machine details (inputs, exits etc) into `routes`.
 *
 * @param sails
 * @param routes
 * @param controllers
 * @param controllersJsDoc
 */
var mergeControllerSwaggerIntoRouteInfo = function (sails, routes, controllers, controllersJsDoc) {
    routes.map(function (route) {
        var _a;
        var mergeIntoDest = function (source) {
            if (!source) {
                return;
            }
            if (!route.swagger) {
                route.swagger = __assign({}, source);
            }
            else {
                (0, lodash_1.defaults)(route.swagger, source);
            }
        };
        var actionNameLookup = path_1.default.basename(route.action);
        // Blueprint routes have no controller source file — swagger comes from model + blueprint templates
        if (route.middlewareType === interfaces_1.MiddlewareType.BLUEPRINT
            || (route.model && route.blueprintAction && utils_1.blueprintActions.includes(route.blueprintAction))) {
            return;
        }
        var controllerAction = controllers.actions[route.action];
        if (controllerAction) {
            // for actions, route will have action type 'function' --> update from controller info
            route.actionType = controllerAction.actionType;
            route.defaultTagName = controllerAction.defaultTagName;
            // for actions2, store machine metadata (inputs, exits etc) into route
            if (route.actionType === 'actions2') {
                route.actions2Machine = controllerAction;
            }
            /*
             * Step 2: Controller file action function `swagger` element
             */
            mergeIntoDest(controllerAction.swagger);
            /*
             * Step 3: Controller file `swagger` element export
             */
            var controllerFileIdentity = controllerAction.actionType === 'controller' ? path_1.default.dirname(route.action) : route.action;
            var controllerFile = controllers.controllerFiles[controllerFileIdentity];
            if (controllerFile) {
                if (controllerFile.swagger) {
                    if (controllerFile.swagger.actions) {
                        mergeIntoDest(controllerFile.swagger.actions[actionNameLookup]);
                    }
                    mergeIntoDest((_a = controllerFile.swagger.actions) === null || _a === void 0 ? void 0 : _a.allactions);
                }
            }
            else {
                sails.log.warn("sails-hook-swagger-generator: No controller file found for action '".concat(controllerFileIdentity, "'"));
            }
            /*
             * Step 4: Controller file JSDoc `@swagger` comments under the `/{action}` path
             */
            var controllerJsDoc = controllersJsDoc[controllerFileIdentity];
            if (controllerJsDoc && controllerJsDoc.actions) {
                mergeIntoDest(controllerJsDoc.actions[actionNameLookup]);
                mergeIntoDest(controllerJsDoc.actions.allactions);
            }
        }
        else {
            sails.log.warn("sails-hook-swagger-generator: No controller source found for action '".concat(route.action, "'"));
        }
    });
};
exports.mergeControllerSwaggerIntoRouteInfo = mergeControllerSwaggerIntoRouteInfo;
/**
 * Merge elements of components from `config/routes.js`, model definition files and
 * controller definition files.
 *
 * Elements of components are added to the top-level Swagger/OpenAPI definitions as follows:
 * 1. Elements of the component definition reference (schemas, parameters, etc) are added where
 *    they **do not exist**.
 * 2. Existing elements are **not** overwritten or merged.
 *
 * For example, the element `components.schemas.pet` will be added as part of a merge process,
 * but the contents of multiple definitions of `pet` **will not** be merged.
 *
 * @param dest
 * @param routesJsDoc
 * @param models
 * @param controllers
 */
var mergeComponents = function (dest, 
// routesJsDoc: OpenApi.OpenApi,
models, modelsJsDoc, controllers, controllersJsDoc) {
    var mergeIntoDest = function (source) {
        if (!source) {
            return;
        }
        for (var key in source) {
            var componentName = key;
            if (!dest[componentName]) {
                dest[componentName] = {};
            }
            (0, lodash_1.defaults)(dest[componentName], source[componentName]);
        }
    };
    // WIP TBC mergeIntoDest(routesJsDoc.components);
    (0, lodash_1.forEach)(models, function (model) { var _a; return mergeIntoDest((_a = model.swagger) === null || _a === void 0 ? void 0 : _a.components); });
    (0, lodash_1.forEach)(modelsJsDoc, function (jsDoc) { return mergeIntoDest(jsDoc.components); });
    (0, lodash_1.forEach)(controllers.controllerFiles, function (controllerFile) { var _a; return mergeIntoDest((_a = controllerFile.swagger) === null || _a === void 0 ? void 0 : _a.components); });
    (0, lodash_1.forEach)(controllersJsDoc, function (jsDoc) { return mergeIntoDest(jsDoc.components); });
};
exports.mergeComponents = mergeComponents;
/**
 * Merge tag definitions from `config/routes.js`, model definition files and
 * controller definition files.
 *
 * Tags are added to the top-level Swagger/OpenAPI definitions as follows:
 * 1. If a tags with the specified name **does not** exist, it is added.
 * 1. Where a tag with the specified name **does** exist, elements _of that tag_ that do not exist are added
 *    e.g. `description` and `externalDocs` elements.
 *
 * @param dest
 * @param routesJsDoc
 * @param models
 * @param controllers
 */
var mergeTags = function (dest, 
// routesJsDoc: OpenApi.OpenApi,
models, modelsJsDoc, controllers, controllersJsDoc, defaultModelTags) {
    var mergeIntoDest = function (source) {
        if (!source) {
            return;
        }
        source.map(function (sourceTag) {
            var destTag = dest.find(function (t) { return t.name === sourceTag.name; });
            if (destTag) {
                (0, lodash_1.defaults)(destTag, sourceTag); // merge into existing
            }
            else {
                dest.push((0, lodash_1.cloneDeep)(sourceTag)); // add new tag
            }
        });
    };
    // WIP TBC mergeIntoDest(routesJsDoc.tags);
    (0, lodash_1.forEach)(models, function (model) { var _a; return mergeIntoDest((_a = model.swagger) === null || _a === void 0 ? void 0 : _a.tags); });
    (0, lodash_1.forEach)(modelsJsDoc, function (jsDoc) { return mergeIntoDest(jsDoc.tags); });
    (0, lodash_1.forEach)(controllers.controllerFiles, function (controllerFile) { var _a; return mergeIntoDest((_a = controllerFile.swagger) === null || _a === void 0 ? void 0 : _a.tags); });
    (0, lodash_1.forEach)(controllersJsDoc, function (jsDoc) { return mergeIntoDest(jsDoc.tags); });
    mergeIntoDest(defaultModelTags);
};
exports.mergeTags = mergeTags;
