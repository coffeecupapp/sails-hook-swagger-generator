"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeTags = exports.mergeComponents = exports.mergeControllerSwaggerIntoRouteInfo = exports.mergeControllerJsDoc = exports.mergeModelJsDoc = exports.aggregateAssociationRoutes = exports.transformSailsPathsToSwaggerPaths = void 0;
const interfaces_1 = require("./interfaces");
const lodash_1 = require("lodash");
const path_1 = __importDefault(require("path"));
const utils_1 = require("./utils");
const transformSailsPathToSwaggerPath = (path) => {
    return path
        .split('/')
        .map(v => v.replace(/^:([^/:?]+)\??$/, '{$1}'))
        .join('/');
};
/**
 * Maps from a Sails route path of the form `/path/:id` to a
 * Swagger path of the form `/path/{id}`.
 */
const transformSailsPathsToSwaggerPaths = (routes) => {
    routes.map(route => {
        route.path = transformSailsPathToSwaggerPath(route.path);
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
const aggregateAssociationRoutes = (boundRoutes /*, models: NameKeyMap<SwaggerSailsModel>*/) => {
    /* standard Sails blueprint path pattern, noting that prefix (match[1]) includes
     * blueprint prefix, REST prefix, and model including any pluralization. */
    const re = /^(\/.*)\/{parentid}\/([^/]+)(\/(?:add|remove|replace))?(\/{childid})?$/;
    // only considering these relevant actions
    const actions = ['add', 'remove', 'replace', 'populate'];
    // step 1: filter to include path matched blueprint actions with a single association alias defined
    const routesToBeAggregated = boundRoutes.map(route => {
        if (route.blueprintAction && actions.indexOf(route.blueprintAction) >= 0
            && route.associationAliases && route.associationAliases.length === 1) {
            const match = route.path.match(re);
            if (match && route.associationAliases[0] === match[2]) {
                return { route, match };
            }
        }
        return undefined;
    })
        .filter(r => !!r);
    // step 2: group by verb --> then route prefix --> then model identity --> then blueprint action
    const groupedByVerb = (0, lodash_1.groupBy)(routesToBeAggregated, r => r.route.verb);
    const thenByPathPrefix = (0, lodash_1.mapValues)(groupedByVerb, verbGroup => (0, lodash_1.groupBy)(verbGroup, r => r.match[1]));
    const thenByModelIdentity = (0, lodash_1.mapValues)(thenByPathPrefix, verbGroup => (0, lodash_1.mapValues)(verbGroup, prefixGroup => (0, lodash_1.groupBy)(prefixGroup, r => r.route.model.identity)));
    const thenByAction = (0, lodash_1.mapValues)(thenByModelIdentity, verbGroup => (0, lodash_1.mapValues)(verbGroup, prefixGroup => (0, lodash_1.mapValues)(prefixGroup, modelGroup => (0, lodash_1.groupBy)(modelGroup, r => r.route.blueprintAction))));
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
    const transformedRoutes = {};
    (0, lodash_1.map)(thenByAction, verbGroup => {
        (0, lodash_1.map)(verbGroup, prefixGroup => {
            (0, lodash_1.map)(prefixGroup, modelGroup => {
                (0, lodash_1.map)(modelGroup, actionGroup => {
                    // first route becomes 'aggregated' version
                    const g = actionGroup[0];
                    const prefix = g.match[1];
                    const pk = g.route.model.primaryKey;
                    const shortcutRoutePart = g.match[3] || '';
                    const childPart = g.match[4] || '';
                    const aggregatedRoute = {
                        ...g.route,
                        path: `${prefix}/{${pk}}/{association}${shortcutRoutePart}${childPart}`,
                        variables: [...g.route.variables.map(v => v === 'parentid' ? pk : v), 'association'],
                        optionalVariables: g.route.optionalVariables.map(v => v === 'parentid' ? pk : v),
                        associationAliases: actionGroup.map(r => r.route.associationAliases[0]),
                    };
                    const routeKey = g.route.verb + '|' + g.route.path;
                    transformedRoutes[routeKey] = aggregatedRoute;
                    // mark others for removal
                    actionGroup.slice(1).map(g => {
                        const routeKey = g.route.verb + '|' + g.route.path;
                        transformedRoutes[routeKey] = 'REMOVE';
                    });
                });
            });
        });
    });
    // step 4: filter
    return boundRoutes.map(route => {
        const routeKey = route.verb + '|' + route.path;
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
        .filter(r => !!r);
};
exports.aggregateAssociationRoutes = aggregateAssociationRoutes;
/**
 * Merges JSDoc `actions` and `model` elements **but not** `components` and `tags`
 * (which are merged in `mergeComponents()` and `mergeTags()`).
 *
 * @param models
 * @param modelsJsDoc
 */
const mergeModelJsDoc = (models, modelsJsDoc) => {
    (0, lodash_1.forEach)(models, model => {
        const modelJsDoc = modelsJsDoc[model.identity];
        if (modelJsDoc) {
            if (modelJsDoc.actions) {
                (0, lodash_1.forEach)(modelJsDoc.actions, (action, actionName) => {
                    if (!model.swagger.actions) {
                        model.swagger.actions = {};
                    }
                    if (!model.swagger.actions[actionName]) {
                        model.swagger.actions[actionName] = { ...action };
                    }
                    else {
                        (0, lodash_1.defaults)(model.swagger.actions[actionName], action);
                    }
                });
            }
            if (modelJsDoc.modelSchema) {
                if (!model.swagger.modelSchema) {
                    model.swagger.modelSchema = { ...modelJsDoc.modelSchema };
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
const mergeControllerJsDoc = (controllers, controllersJsDoc) => {
    (0, lodash_1.forEach)(controllers.controllerFiles, (controllerFile, identity) => {
        const controllerJsDoc = controllersJsDoc[identity];
        if (controllerJsDoc) {
            if (controllerJsDoc.actions) {
                (0, lodash_1.forEach)(controllerJsDoc.actions, (action, actionName) => {
                    if (!controllerFile.swagger.actions) {
                        controllerFile.swagger.actions = {};
                    }
                    if (!controllerFile.swagger.actions[actionName]) {
                        controllerFile.swagger.actions[actionName] = { ...action };
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
const mergeControllerSwaggerIntoRouteInfo = (sails, routes, controllers, controllersJsDoc) => {
    routes.map(route => {
        const mergeIntoDest = (source) => {
            if (!source) {
                return;
            }
            if (!route.swagger) {
                route.swagger = { ...source };
            }
            else {
                (0, lodash_1.defaults)(route.swagger, source);
            }
        };
        const actionNameLookup = path_1.default.basename(route.action);
        // Blueprint routes have no controller source file — swagger comes from model + blueprint templates
        if (route.middlewareType === interfaces_1.MiddlewareType.BLUEPRINT
            || (route.model && route.blueprintAction && utils_1.blueprintActions.includes(route.blueprintAction))) {
            return;
        }
        const controllerAction = controllers.actions[route.action];
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
            const controllerFileIdentity = controllerAction.actionType === 'controller' ? path_1.default.dirname(route.action) : route.action;
            const controllerFile = controllers.controllerFiles[controllerFileIdentity];
            if (controllerFile) {
                if (controllerFile.swagger) {
                    // Propagate controller-level exclude to all routes
                    if (controllerFile.swagger.exclude) {
                        mergeIntoDest({ exclude: true });
                    }
                    if (controllerFile.swagger.actions) {
                        mergeIntoDest(controllerFile.swagger.actions[actionNameLookup]);
                    }
                    mergeIntoDest(controllerFile.swagger.actions?.allactions);
                }
            }
            else {
                sails.log.warn(`sails-hook-swagger-generator: No controller file found for action '${controllerFileIdentity}'`);
            }
            /*
             * Step 4: Controller file JSDoc `@swagger` comments under the `/{action}` path
             */
            const controllerJsDoc = controllersJsDoc[controllerFileIdentity];
            if (controllerJsDoc && controllerJsDoc.actions) {
                mergeIntoDest(controllerJsDoc.actions[actionNameLookup]);
                mergeIntoDest(controllerJsDoc.actions.allactions);
            }
        }
        else {
            sails.log.warn(`sails-hook-swagger-generator: No controller source found for action '${route.action}'`);
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
const mergeComponents = (dest, 
// routesJsDoc: OpenApi.OpenApi,
models, modelsJsDoc, controllers, controllersJsDoc) => {
    const mergeIntoDest = (source) => {
        if (!source) {
            return;
        }
        for (const key in source) {
            const componentName = key;
            if (!dest[componentName]) {
                dest[componentName] = {};
            }
            (0, lodash_1.defaults)(dest[componentName], source[componentName]);
        }
    };
    // WIP TBC mergeIntoDest(routesJsDoc.components);
    (0, lodash_1.forEach)(models, model => mergeIntoDest(model.swagger?.components));
    (0, lodash_1.forEach)(modelsJsDoc, jsDoc => mergeIntoDest(jsDoc.components));
    (0, lodash_1.forEach)(controllers.controllerFiles, controllerFile => mergeIntoDest(controllerFile.swagger?.components));
    (0, lodash_1.forEach)(controllersJsDoc, jsDoc => mergeIntoDest(jsDoc.components));
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
const mergeTags = (dest, 
// routesJsDoc: OpenApi.OpenApi,
models, modelsJsDoc, controllers, controllersJsDoc, defaultModelTags) => {
    const mergeIntoDest = (source) => {
        if (!source) {
            return;
        }
        source.map(sourceTag => {
            const destTag = dest.find(t => t.name === sourceTag.name);
            if (destTag) {
                (0, lodash_1.defaults)(destTag, sourceTag); // merge into existing
            }
            else {
                dest.push((0, lodash_1.cloneDeep)(sourceTag)); // add new tag
            }
        });
    };
    // WIP TBC mergeIntoDest(routesJsDoc.tags);
    (0, lodash_1.forEach)(models, model => mergeIntoDest(model.swagger?.tags));
    (0, lodash_1.forEach)(modelsJsDoc, jsDoc => mergeIntoDest(jsDoc.tags));
    (0, lodash_1.forEach)(controllers.controllerFiles, controllerFile => mergeIntoDest(controllerFile.swagger?.tags));
    (0, lodash_1.forEach)(controllersJsDoc, jsDoc => mergeIntoDest(jsDoc.tags));
    mergeIntoDest(defaultModelTags);
};
exports.mergeTags = mergeTags;
