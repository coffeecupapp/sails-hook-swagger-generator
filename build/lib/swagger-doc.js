"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var fs = __importStar(require("fs"));
var lodash_1 = require("lodash");
var type_formatter_1 = require("./type-formatter");
var parsers_1 = require("./parsers");
var utils_1 = require("./utils");
var generators_1 = require("./generators");
var transformations_1 = require("./transformations");
exports.default = (function (sails, sailsRoutes, context) { return __awaiter(void 0, void 0, void 0, function () {
    var hookConfig, blueprintActionTemplates, specifications, theDefaults, models, modelsJsDoc, controllers, controllersJsDoc, routes, defaultModelTags, referencedTags, destPath;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                hookConfig = sails.config[context.configKey];
                if (hookConfig.disabled) {
                    return [2 /*return*/];
                }
                blueprintActionTemplates = lodash_1.cloneDeep(type_formatter_1.blueprintActionTemplates);
                if (hookConfig.updateBlueprintActionTemplates) {
                    blueprintActionTemplates = hookConfig.updateBlueprintActionTemplates(blueprintActionTemplates);
                }
                specifications = lodash_1.cloneDeep(hookConfig.swagger || {});
                theDefaults = hookConfig.defaults || type_formatter_1.defaults;
                models = parsers_1.parseModels(sails);
                return [4 /*yield*/, parsers_1.parseModelsJsDoc(sails, models)];
            case 1:
                modelsJsDoc = _a.sent();
                return [4 /*yield*/, parsers_1.parseControllers(sails)];
            case 2:
                controllers = _a.sent();
                return [4 /*yield*/, parsers_1.parseControllerJsDoc(sails, controllers)];
            case 3:
                controllersJsDoc = _a.sent();
                routes = parsers_1.parseBoundRoutes(sailsRoutes, models, sails);
                // fs.writeFileSync('./test/fixtures/parsedRoutes.json', JSON.stringify(routes, null, 2));
                /*
                 * transformations phase - filter, transform, merge into consistent single model
                 * of SwaggerRouteInfo[]
                 */
                // remove globally excluded routes
                routes = routes.filter(function (route) { return route.path !== '/__getcookie'; });
                transformations_1.transformSailsPathsToSwaggerPaths(routes);
                routes = transformations_1.aggregateAssociationRoutes(routes);
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
                transformations_1.mergeModelJsDoc(models, modelsJsDoc);
                transformations_1.mergeControllerJsDoc(controllers, controllersJsDoc);
                transformations_1.mergeControllerSwaggerIntoRouteInfo(sails, routes, controllers, controllersJsDoc);
                /*
                 * generation phase
                 */
                lodash_1.defaultsDeep(specifications, {
                    tags: [],
                    components: {
                        schemas: {},
                        parameters: {},
                    },
                    paths: {},
                });
                lodash_1.defaults(specifications.components.schemas, generators_1.generateSchemas(models));
                defaultModelTags = generators_1.generateDefaultModelTags(models);
                transformations_1.mergeComponents(specifications.components, /* routesJsDoc, */ models, modelsJsDoc, controllers, controllersJsDoc);
                transformations_1.mergeTags(specifications.tags, /* routesJsDoc, */ models, modelsJsDoc, controllers, controllersJsDoc, defaultModelTags);
                lodash_1.defaults(specifications.paths, generators_1.generatePaths(routes, blueprintActionTemplates, theDefaults, specifications, models, sails));
                lodash_1.defaults(specifications.components.parameters, type_formatter_1.blueprintParameterTemplates);
                referencedTags = utils_1.getUniqueTagsFromPath(specifications.paths);
                specifications.tags = specifications.tags.filter(function (tagDef) {
                    var ret = referencedTags.has(tagDef.name);
                    if (!ret) {
                        sails.log.warn("WARNING: sails-hook-swagger-generator: Tag '" + tagDef.name + "' defined but not referenced; removing");
                    }
                    return ret;
                });
                // clean up of specification, define referenced tags that dne
                referencedTags.forEach(function (tagName) {
                    var tagDef = specifications.tags.find(function (t) { return t.name === tagName; });
                    if (!tagDef) {
                        sails.log.info("NOTICE: sails-hook-swagger-generator: Tag '" + tagName + "' referenced but not defined; adding");
                        specifications.tags.push({ name: tagName });
                    }
                });
                if (hookConfig.postProcess) {
                    hookConfig.postProcess(specifications);
                }
                destPath = hookConfig.swaggerJsonPath;
                if (destPath) {
                    try {
                        fs.writeFileSync(destPath, JSON.stringify(specifications, null, 2));
                    }
                    catch (e) {
                        sails.log.error("ERROR: sails-hook-swagger-generator: Error writing " + destPath + ": " + e.message, e);
                    }
                }
                sails.log.info('Swagger generated successfully');
                return [2 /*return*/, specifications];
        }
    });
}); });
