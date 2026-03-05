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
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
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
Object.defineProperty(exports, "__esModule", { value: true });
var fs = __importStar(require("fs"));
var lodash_1 = require("lodash");
var type_formatter_1 = require("./type-formatter");
var parsers_1 = require("./parsers");
var utils_1 = require("./utils");
var generators_1 = require("./generators");
var transformations_1 = require("./transformations");
exports.default = (function (sails, sailsRoutes, context) { return __awaiter(void 0, void 0, void 0, function () {
    var hookConfig, blueprintActionTemplates, specifications, theDefaults, models, modelsJsDoc, controllers, controllersJsDoc, routes, defaultModelTags, historyPathKey, historyOp, historyModels, _i, historyModels_1, model, concretePath, stateProperties, stripFields, _a, _b, _c, name, attr, stateSchema, op, tagHasBlueprint, tagHasCustom, path, pathDef, _loop_1, verb, referencedTags, paths_1, verbOrder_1, asRecord_1, getTag_1, hasBlueprint_1, sortedKeys, sorted, _d, sortedKeys_1, key, pathDef, sortedVerbs, sortedPathDef, _e, sortedVerbs_1, verb, destPath;
    var _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                hookConfig = sails.config[context.configKey];
                if (hookConfig.disabled) {
                    return [2 /*return*/];
                }
                blueprintActionTemplates = (0, lodash_1.cloneDeep)(type_formatter_1.blueprintActionTemplates);
                if (hookConfig.updateBlueprintActionTemplates) {
                    blueprintActionTemplates = hookConfig.updateBlueprintActionTemplates(blueprintActionTemplates);
                }
                specifications = (0, lodash_1.cloneDeep)(hookConfig.swagger || {});
                theDefaults = hookConfig.defaults || type_formatter_1.defaults;
                models = (0, parsers_1.parseModels)(sails);
                return [4 /*yield*/, (0, parsers_1.parseModelsJsDoc)(sails, models)];
            case 1:
                modelsJsDoc = _g.sent();
                return [4 /*yield*/, (0, parsers_1.parseControllers)(sails)];
            case 2:
                controllers = _g.sent();
                return [4 /*yield*/, (0, parsers_1.parseControllerJsDoc)(sails, controllers)];
            case 3:
                controllersJsDoc = _g.sent();
                routes = (0, parsers_1.parseBoundRoutes)(sailsRoutes, models, sails);
                // fs.writeFileSync('./test/fixtures/parsedRoutes.json', JSON.stringify(routes, null, 2));
                /*
                 * transformations phase - filter, transform, merge into consistent single model
                 * of SwaggerRouteInfo[]
                 */
                // remove globally excluded routes
                routes = routes.filter(function (route) { return route.path !== '/__getcookie'; });
                (0, transformations_1.transformSailsPathsToSwaggerPaths)(routes);
                routes = (0, transformations_1.aggregateAssociationRoutes)(routes);
                if (hookConfig.includeRoute) {
                    routes = routes.filter(function (route) { return hookConfig.includeRoute(route); });
                }
                /*
                 * Sails 1.0 includes `PUT` and `PATCH` routes to the `update` blueprint although `PUT` deprecated;
                 * default to excluding the `PUT` route.
                 * @see https://sailsjs.com/documentation/reference/blueprint-api/update#?notes
                 * @see https://github.com/balderdashy/sails/blob/master/lib/hooks/blueprints/index.js#L401
                 */
                if (hookConfig.excludeDeprecatedPutBlueprintRoutes) {
                    routes = routes.filter(function (route) { return !(route.blueprintAction === 'update' && route.verb === 'put'); });
                }
                (0, transformations_1.mergeModelJsDoc)(models, modelsJsDoc);
                (0, transformations_1.mergeControllerJsDoc)(controllers, controllersJsDoc);
                (0, transformations_1.mergeControllerSwaggerIntoRouteInfo)(sails, routes, controllers, controllersJsDoc);
                /*
                 * generation phase
                 */
                (0, lodash_1.defaultsDeep)(specifications, {
                    tags: [],
                    components: {
                        schemas: {},
                        parameters: {},
                    },
                    paths: {},
                });
                (0, lodash_1.defaults)(specifications.components.schemas, (0, generators_1.generateSchemas)(models));
                defaultModelTags = (0, generators_1.generateDefaultModelTags)(models);
                (0, transformations_1.mergeComponents)(specifications.components, /* routesJsDoc, */ models, modelsJsDoc, controllers, controllersJsDoc);
                (0, transformations_1.mergeTags)(specifications.tags, /* routesJsDoc, */ models, modelsJsDoc, controllers, controllersJsDoc, defaultModelTags);
                (0, lodash_1.defaults)(specifications.paths, (0, generators_1.generatePaths)(routes, blueprintActionTemplates, theDefaults, specifications, models, sails));
                (0, lodash_1.defaults)(specifications.components.parameters, type_formatter_1.blueprintParameterTemplates);
                /*
                 * Expand generic /:modelIdentity/history route into concrete per-model paths.
                 * Models opt in via `supportsHistory: true`; the generic path is removed.
                 */
                {
                    historyPathKey = Object.keys(specifications.paths).find(function (p) { return p.includes('{modelIdentity}') && p.endsWith('/history'); });
                    if (historyPathKey) {
                        historyOp = (_f = specifications.paths[historyPathKey]) === null || _f === void 0 ? void 0 : _f.get;
                        if (historyOp) {
                            historyModels = Object.values(models).filter(function (m) { return m.supportsHistory; });
                            for (_i = 0, historyModels_1 = historyModels; _i < historyModels_1.length; _i++) {
                                model = historyModels_1[_i];
                                concretePath = historyPathKey.replace('{modelIdentity}', model.identity);
                                stateProperties = {};
                                stripFields = model.logStripFields || [];
                                for (_a = 0, _b = Object.entries(model.attributes); _a < _b.length; _a++) {
                                    _c = _b[_a], name = _c[0], attr = _c[1];
                                    if (attr.collection)
                                        continue;
                                    if (name.startsWith('_'))
                                        continue;
                                    if (stripFields.includes(name))
                                        continue;
                                    if (model.hiddenAttributes.includes(name))
                                        continue;
                                    if (attr.model) {
                                        stateProperties[name] = { type: 'integer' };
                                    }
                                    else {
                                        stateProperties[name] = (0, generators_1.generateAttributeSchema)(attr, name);
                                    }
                                }
                                stateSchema = {
                                    type: 'object',
                                    description: 'Only the fields that changed are included. Fields may be further omitted based on the requesting user\'s permissions.',
                                    properties: stateProperties,
                                };
                                op = {
                                    tags: [model.globalId],
                                    summary: "Get ".concat(model.globalId, " history log"),
                                    description: "Returns the history log for a **".concat(model.globalId, "** record. Each entry contains `oldState` and `newState` objects with only the fields that changed between revisions. Fields may be further omitted based on the requesting user's permissions."),
                                    parameters: [
                                        {
                                            in: 'query',
                                            name: 'id',
                                            required: true,
                                            schema: { type: 'integer' },
                                            description: "The ID of the ".concat(model.globalId, " record to retrieve history for"),
                                        },
                                    ],
                                    responses: {
                                        '200': {
                                            description: 'Successful operation',
                                            content: {
                                                'application/json': {
                                                    schema: {
                                                        type: 'object',
                                                        properties: {
                                                            recordLog: {
                                                                type: 'array',
                                                                items: {
                                                                    type: 'object',
                                                                    properties: {
                                                                        id: { type: 'integer', description: 'History log entry ID' },
                                                                        actionId: { type: 'integer', description: 'ID of the record that was changed' },
                                                                        actionDate: { type: 'string', format: 'date-time', description: 'When the change occurred' },
                                                                        actionUser: { type: 'integer', description: 'ID of the user who made the change' },
                                                                        actionType: { type: 'string', enum: ['NEW', 'EDIT', 'DELETE'], description: 'Type of change' },
                                                                        oldState: stateSchema,
                                                                        newState: stateSchema,
                                                                        additionalInfo: {
                                                                            type: 'object',
                                                                            nullable: true,
                                                                            description: 'Present when a comment was attached to the change. The comment author is identified by `actionUser`.',
                                                                            properties: {
                                                                                comment: { type: 'string', description: 'The comment text' },
                                                                            },
                                                                        },
                                                                    },
                                                                },
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                        '400': { description: 'No id specified' },
                                        '403': { description: 'User does not have permission to access this record' },
                                        '500': { description: 'Internal server error' },
                                    },
                                };
                                specifications.paths[concretePath] = { get: op };
                            }
                            delete specifications.paths[historyPathKey];
                        }
                    }
                }
                tagHasBlueprint = {};
                tagHasCustom = {};
                for (path in specifications.paths) {
                    pathDef = specifications.paths[path];
                    _loop_1 = function (verb) {
                        var op = pathDef[verb];
                        if (op.tags) {
                            op.tags.forEach(function (tag) {
                                if (op['x-blueprint']) {
                                    tagHasBlueprint[tag] = true;
                                }
                                else {
                                    tagHasCustom[tag] = true;
                                }
                            });
                        }
                    };
                    for (verb in pathDef) {
                        _loop_1(verb);
                    }
                }
                referencedTags = (0, utils_1.getUniqueTagsFromPath)(specifications.paths);
                specifications.tags = specifications.tags.filter(function (tagDef) {
                    var ret = referencedTags.has(tagDef.name);
                    if (!ret) {
                        sails.log.verbose("sails-hook-swagger-generator: Tag '".concat(tagDef.name, "' defined but not referenced; removing"));
                    }
                    return ret;
                });
                // clean up of specification, define referenced tags that dne
                referencedTags.forEach(function (tagName) {
                    var tagDef = specifications.tags.find(function (t) { return t.name === tagName; });
                    if (!tagDef) {
                        sails.log.verbose("sails-hook-swagger-generator: Tag '".concat(tagName, "' referenced but not defined; adding"));
                        specifications.tags.push({ name: tagName });
                    }
                });
                // Update tag descriptions based on classification (after all tags are finalized)
                specifications.tags.forEach(function (tagDef) {
                    var _a, _b;
                    // Skip tags with custom descriptions from model swagger config
                    var model = Object.values(models).find(function (m) { return m.globalId === tagDef.name; });
                    if ((_b = (_a = model === null || model === void 0 ? void 0 : model.swagger) === null || _a === void 0 ? void 0 : _a.modelSchema) === null || _b === void 0 ? void 0 : _b.description)
                        return;
                    var hasCrud = tagHasBlueprint[tagDef.name];
                    var hasCustom = tagHasCustom[tagDef.name];
                    if (hasCrud && hasCustom) {
                        tagDef.description = "Resource: **".concat(tagDef.name, "** \u2014 CRUD and model-specific endpoints");
                    }
                    else if (hasCrud) {
                        tagDef.description = "Resource: **".concat(tagDef.name, "** \u2014 CRUD endpoints");
                    }
                    else {
                        tagDef.description = "**".concat(tagDef.name, "** \u2014 domain-specific endpoints");
                    }
                });
                /*
                 * Reorder paths so that within each tag group, blueprint CRUD operations appear
                 * in standard REST order (find all, create, find one, update, delete) followed
                 * by custom actions. Verbs within each path are also sorted (get, post, put, patch, delete).
                 */
                {
                    paths_1 = specifications.paths;
                    verbOrder_1 = { get: 0, post: 1, put: 2, patch: 3, delete: 4 };
                    asRecord_1 = function (pathDef) { return pathDef; };
                    getTag_1 = function (pathDef) {
                        var _a, _b;
                        var rec = asRecord_1(pathDef);
                        for (var verb in rec) {
                            if ((_b = (_a = rec[verb]) === null || _a === void 0 ? void 0 : _a.tags) === null || _b === void 0 ? void 0 : _b[0])
                                return rec[verb].tags[0];
                        }
                        return '';
                    };
                    hasBlueprint_1 = function (pathDef) {
                        var _a;
                        var rec = asRecord_1(pathDef);
                        for (var verb in rec) {
                            if ((_a = rec[verb]) === null || _a === void 0 ? void 0 : _a['x-blueprint'])
                                return true;
                        }
                        return false;
                    };
                    sortedKeys = Object.keys(paths_1).sort(function (a, b) {
                        var tagA = getTag_1(paths_1[a]);
                        var tagB = getTag_1(paths_1[b]);
                        if (tagA !== tagB)
                            return tagA.localeCompare(tagB);
                        var bpA = hasBlueprint_1(paths_1[a]) ? 0 : 1;
                        var bpB = hasBlueprint_1(paths_1[b]) ? 0 : 1;
                        if (bpA !== bpB)
                            return bpA - bpB;
                        // Base path (e.g. /v1/absences) before param path (e.g. /v1/absences/{id})
                        var aHasParam = a.indexOf('{') >= 0;
                        var bHasParam = b.indexOf('{') >= 0;
                        if (aHasParam !== bHasParam)
                            return aHasParam ? 1 : -1;
                        return a.localeCompare(b);
                    });
                    sorted = {};
                    for (_d = 0, sortedKeys_1 = sortedKeys; _d < sortedKeys_1.length; _d++) {
                        key = sortedKeys_1[_d];
                        pathDef = paths_1[key];
                        sortedVerbs = Object.keys(pathDef).sort(function (a, b) { var _a, _b; return ((_a = verbOrder_1[a]) !== null && _a !== void 0 ? _a : 9) - ((_b = verbOrder_1[b]) !== null && _b !== void 0 ? _b : 9); });
                        sortedPathDef = {};
                        for (_e = 0, sortedVerbs_1 = sortedVerbs; _e < sortedVerbs_1.length; _e++) {
                            verb = sortedVerbs_1[_e];
                            sortedPathDef[verb] = pathDef[verb];
                        }
                        sorted[key] = sortedPathDef;
                    }
                    specifications.paths = sorted;
                }
                if (hookConfig.postProcess) {
                    hookConfig.postProcess(specifications);
                }
                destPath = hookConfig.swaggerJsonPath;
                if (destPath) {
                    try {
                        fs.writeFileSync(destPath, JSON.stringify(specifications, null, 2));
                    }
                    catch (e) {
                        sails.log.error("ERROR: sails-hook-swagger-generator: Error writing ".concat(destPath, ": ").concat(e.message), e);
                    }
                }
                sails.log.info('Swagger generated successfully');
                return [2 /*return*/, specifications];
        }
    });
}); });
