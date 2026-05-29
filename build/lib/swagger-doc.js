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
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const lodash_1 = require("lodash");
const type_formatter_1 = require("./type-formatter");
const parsers_1 = require("./parsers");
const utils_1 = require("./utils");
const generators_1 = require("./generators");
const transformations_1 = require("./transformations");
const pluralize = require("pluralize");
exports.default = async (sails, sailsRoutes, context) => {
    // fs.writeFileSync('./test/fixtures/sailsRoutes.json', JSON.stringify(sailsRoutes, null, 2));
    const hookConfig = sails.config[context.configKey];
    if (hookConfig.disabled) {
        return;
    }
    let blueprintActionTemplates = (0, lodash_1.cloneDeep)(type_formatter_1.blueprintActionTemplates);
    if (hookConfig.updateBlueprintActionTemplates) {
        blueprintActionTemplates = hookConfig.updateBlueprintActionTemplates(blueprintActionTemplates);
    }
    const specifications = (0, lodash_1.cloneDeep)(hookConfig.swagger || {});
    const theDefaults = hookConfig.defaults || type_formatter_1.defaults;
    /*
     * parse models and controllers (structures, source Swagger and JSDoc Swagger)
     */
    const models = (0, parsers_1.parseModels)(sails);
    const modelsJsDoc = await (0, parsers_1.parseModelsJsDoc)(sails, models);
    const controllers = await (0, parsers_1.parseControllers)(sails);
    const controllersJsDoc = await (0, parsers_1.parseControllerJsDoc)(sails, controllers);
    let routes = (0, parsers_1.parseBoundRoutes)(sailsRoutes, models, sails);
    // fs.writeFileSync('./test/fixtures/parsedRoutes.json', JSON.stringify(routes, null, 2));
    /*
     * transformations phase - filter, transform, merge into consistent single model
     * of SwaggerRouteInfo[]
     */
    // remove globally excluded routes
    routes = routes.filter(route => route.path !== '/__getcookie');
    (0, transformations_1.transformSailsPathsToSwaggerPaths)(routes);
    routes = (0, transformations_1.aggregateAssociationRoutes)(routes);
    if (hookConfig.includeRoute) {
        routes = routes.filter(route => hookConfig.includeRoute(route));
    }
    /*
     * Sails 1.0 includes `PUT` and `PATCH` routes to the `update` blueprint although `PUT` deprecated;
     * default to excluding the `PUT` route.
     * @see https://sailsjs.com/documentation/reference/blueprint-api/update#?notes
     * @see https://github.com/balderdashy/sails/blob/master/lib/hooks/blueprints/index.js#L401
     */
    if (hookConfig.excludeDeprecatedPutBlueprintRoutes) {
        routes = routes.filter(route => !(route.blueprintAction === 'update' && route.verb === 'put'));
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
    const defaultModelTags = (0, generators_1.generateDefaultModelTags)(models);
    (0, transformations_1.mergeComponents)(specifications.components, /* routesJsDoc, */ models, modelsJsDoc, controllers, controllersJsDoc);
    (0, transformations_1.mergeTags)(specifications.tags, /* routesJsDoc, */ models, modelsJsDoc, controllers, controllersJsDoc, defaultModelTags);
    (0, lodash_1.defaults)(specifications.paths, (0, generators_1.generatePaths)(routes, blueprintActionTemplates, theDefaults, specifications, models, sails));
    (0, lodash_1.defaults)(specifications.components.parameters, type_formatter_1.blueprintParameterTemplates);
    /*
     * Expand generic /:modelIdentity/history route into concrete per-model paths.
     * Models opt in via `supportsHistory: true`; the generic path is removed.
     * The per-model operation schema is supplied by `hookConfig.buildHistoryOperation`;
     * if absent, the generic path is removed but no concrete paths are emitted.
     */
    {
        const historyPathKey = Object.keys(specifications.paths).find(p => p.includes('{modelIdentity}') && p.endsWith('/history'));
        if (historyPathKey) {
            const historyModels = Object.values(models).filter(m => m.supportsHistory);
            const shouldPluralize = sails.config.blueprints && sails.config.blueprints.pluralize;
            if (hookConfig.buildHistoryOperation) {
                for (const model of historyModels) {
                    // Match the blueprint hook's kebab-case + pluralize convention
                    let pathSegment = model.globalId
                        .replace(/[A-Z]/g, (c, i) => (i > 0 ? '-' : '') + c.toLowerCase());
                    if (shouldPluralize) {
                        pathSegment = pluralize(pathSegment);
                    }
                    const concretePath = historyPathKey.replace('{modelIdentity}', pathSegment);
                    const op = hookConfig.buildHistoryOperation(model, { generateAttributeSchema: generators_1.generateAttributeSchema });
                    specifications.paths[concretePath] = { get: op };
                }
            }
            delete specifications.paths[historyPathKey];
        }
    }
    // Classify tags based on operation types (blueprint CRUD vs custom)
    const tagHasBlueprint = {};
    const tagHasCustom = {};
    for (const path in specifications.paths) {
        const pathDef = specifications.paths[path];
        for (const verb in pathDef) {
            const op = pathDef[verb];
            if (op.tags) {
                op.tags.forEach(tag => {
                    if (op['x-blueprint']) {
                        tagHasBlueprint[tag] = true;
                    }
                    else {
                        tagHasCustom[tag] = true;
                    }
                });
            }
        }
    }
    // clean up of specification, removing unreferenced tags
    const referencedTags = (0, utils_1.getUniqueTagsFromPath)(specifications.paths);
    specifications.tags = specifications.tags.filter(tagDef => {
        const ret = referencedTags.has(tagDef.name);
        if (!ret) {
            sails.log.verbose(`sails-hook-swagger-generator: Tag '${tagDef.name}' defined but not referenced; removing`);
        }
        return ret;
    });
    // clean up of specification, define referenced tags that dne
    referencedTags.forEach(tagName => {
        const tagDef = specifications.tags.find(t => t.name === tagName);
        if (!tagDef) {
            sails.log.verbose(`sails-hook-swagger-generator: Tag '${tagName}' referenced but not defined; adding`);
            specifications.tags.push({ name: tagName });
        }
    });
    // Update tag descriptions based on classification (after all tags are finalized).
    // The classification header is always emitted for consistency across resources;
    // if the corresponding model has a `swagger.modelSchema.description`, it is
    // appended below the header as the resource-specific blurb.
    specifications.tags.forEach(tagDef => {
        const hasCrud = tagHasBlueprint[tagDef.name];
        const hasCustom = tagHasCustom[tagDef.name];
        let header;
        if (hasCrud && hasCustom) {
            header = `Resource: **${tagDef.name}** — CRUD and model-specific endpoints`;
        }
        else if (hasCrud) {
            header = `Resource: **${tagDef.name}** — CRUD endpoints`;
        }
        else {
            header = `**${tagDef.name}** — domain-specific endpoints`;
        }
        const model = Object.values(models).find(m => m.globalId === tagDef.name);
        const modelDescription = model?.swagger?.modelSchema?.description;
        tagDef.description = modelDescription ? `${header}\n\n${modelDescription}` : header;
    });
    /*
     * Reorder paths so that within each tag group, blueprint CRUD operations appear
     * in standard REST order (find all, create, find one, update, delete) followed
     * by custom actions. Verbs within each path are also sorted (get, post, put, patch, delete).
     */
    {
        const paths = specifications.paths;
        const verbOrder = { get: 0, post: 1, put: 2, patch: 3, delete: 4 };
        const asRecord = (pathDef) => pathDef;
        const getTag = (pathDef) => {
            const rec = asRecord(pathDef);
            for (const verb in rec) {
                if (rec[verb]?.tags?.[0])
                    return rec[verb].tags[0];
            }
            return '';
        };
        const hasBlueprint = (pathDef) => {
            const rec = asRecord(pathDef);
            for (const verb in rec) {
                if (rec[verb]?.['x-blueprint'])
                    return true;
            }
            return false;
        };
        const isHistory = (path) => path.endsWith('/history');
        // Sort path keys: by tag, then CRUD blueprints first (base before {id}),
        // then history, then custom actions alphabetically.
        const sortedKeys = Object.keys(paths).sort((a, b) => {
            const tagA = getTag(paths[a]);
            const tagB = getTag(paths[b]);
            if (tagA !== tagB)
                return tagA.localeCompare(tagB);
            const bpA = hasBlueprint(paths[a]);
            const bpB = hasBlueprint(paths[b]);
            if (bpA !== bpB)
                return bpA ? -1 : 1;
            // Within blueprints: base path before {id} path
            if (bpA && bpB) {
                const aHasParam = a.indexOf('{') >= 0;
                const bHasParam = b.indexOf('{') >= 0;
                if (aHasParam !== bHasParam)
                    return aHasParam ? 1 : -1;
                return a.localeCompare(b);
            }
            // History comes before other custom actions
            const hA = isHistory(a);
            const hB = isHistory(b);
            if (hA !== hB)
                return hA ? -1 : 1;
            return a.localeCompare(b);
        });
        // Rebuild paths with sorted keys and sorted verbs within each path
        const sorted = {};
        for (const key of sortedKeys) {
            const pathDef = paths[key];
            const sortedVerbs = Object.keys(pathDef).sort((a, b) => (verbOrder[a] ?? 9) - (verbOrder[b] ?? 9));
            const sortedPathDef = {};
            for (const verb of sortedVerbs) {
                sortedPathDef[verb] = pathDef[verb];
            }
            sorted[key] = sortedPathDef;
        }
        specifications.paths = sorted;
    }
    if (hookConfig.postProcess) {
        hookConfig.postProcess(specifications);
    }
    const destPath = hookConfig.swaggerJsonPath;
    if (destPath) {
        try {
            fs.writeFileSync(destPath, JSON.stringify(specifications, null, 2));
        }
        catch (e) {
            sails.log.error(`ERROR: sails-hook-swagger-generator: Error writing ${destPath}: ${e.message}`, e);
        }
    }
    sails.log.info('Swagger generated successfully');
    return specifications;
};
