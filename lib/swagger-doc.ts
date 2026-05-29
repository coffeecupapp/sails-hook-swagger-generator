import * as fs from 'fs';
import { SwaggerGenerator } from './interfaces';
import { cloneDeep, defaultsDeep, defaults } from 'lodash';
import { blueprintActionTemplates as defaultBlueprintActionTemplates, defaults as configurationDefaults, blueprintParameterTemplates } from './type-formatter';
import { parseModels, parseControllers, parseModelsJsDoc, parseBoundRoutes, parseControllerJsDoc } from './parsers';
import { getUniqueTagsFromPath } from './utils';
import { generateSchemas, generatePaths, generateDefaultModelTags, generateAttributeSchema } from './generators';
import { OpenApi } from '../types/openapi';
import { mergeModelJsDoc, mergeTags, mergeComponents, mergeControllerJsDoc, transformSailsPathsToSwaggerPaths, aggregateAssociationRoutes, mergeControllerSwaggerIntoRouteInfo } from './transformations';
import { Tag } from 'swagger-schema-official';
import pluralize = require('pluralize');

export default async (sails: Sails.Sails, sailsRoutes: Array<Sails.Route>, context: Sails.Hook<SwaggerGenerator>): Promise<OpenApi.OpenApi | undefined> => {

  // fs.writeFileSync('./test/fixtures/sailsRoutes.json', JSON.stringify(sailsRoutes, null, 2));

  const hookConfig: SwaggerGenerator = sails.config[context.configKey!];

  if (hookConfig.disabled) {
    return;
  }

  let blueprintActionTemplates = cloneDeep(defaultBlueprintActionTemplates);
  if (hookConfig.updateBlueprintActionTemplates) {
    blueprintActionTemplates = hookConfig.updateBlueprintActionTemplates(blueprintActionTemplates);
  }

  const specifications = cloneDeep(hookConfig.swagger || {}) as OpenApi.OpenApi;

  const theDefaults = hookConfig.defaults || configurationDefaults;

  /*
   * parse models and controllers (structures, source Swagger and JSDoc Swagger)
   */

  const models = parseModels(sails);
  const modelsJsDoc = await parseModelsJsDoc(sails, models);

  const controllers = await parseControllers(sails);
  const controllersJsDoc = await parseControllerJsDoc(sails, controllers);

  let routes = parseBoundRoutes(sailsRoutes, models, sails);

  // fs.writeFileSync('./test/fixtures/parsedRoutes.json', JSON.stringify(routes, null, 2));

  /*
   * transformations phase - filter, transform, merge into consistent single model
   * of SwaggerRouteInfo[]
   */

  // remove globally excluded routes
  routes = routes.filter(route => route.path !== '/__getcookie')

  transformSailsPathsToSwaggerPaths(routes);
  routes = aggregateAssociationRoutes(routes);

  if (hookConfig.includeRoute) {
    routes = routes.filter(route => hookConfig.includeRoute!(route));
  }

  /*
   * Sails 1.0 includes `PUT` and `PATCH` routes to the `update` blueprint although `PUT` deprecated;
   * default to excluding the `PUT` route.
   * @see https://sailsjs.com/documentation/reference/blueprint-api/update#?notes
   * @see https://github.com/balderdashy/sails/blob/master/lib/hooks/blueprints/index.js#L401
   */
  if(hookConfig.excludeDeprecatedPutBlueprintRoutes) {
    routes = routes.filter(route => !(route.blueprintAction === 'update' && route.verb === 'put'));
  }

  mergeModelJsDoc(models, modelsJsDoc);
  mergeControllerJsDoc(controllers, controllersJsDoc);

  mergeControllerSwaggerIntoRouteInfo(sails, routes, controllers, controllersJsDoc);

  /*
   * generation phase
   */

  defaultsDeep(specifications, {
    tags: [],
    components: {
      schemas: {},
      parameters: {},
    },
    paths: {},
  });

  defaults(specifications.components!.schemas, generateSchemas(models));

  const defaultModelTags = generateDefaultModelTags(models);

  mergeComponents(specifications.components!, /* routesJsDoc, */ models, modelsJsDoc, controllers, controllersJsDoc);
  mergeTags(specifications.tags!, /* routesJsDoc, */ models, modelsJsDoc, controllers, controllersJsDoc, defaultModelTags);

  defaults(specifications.paths, generatePaths(routes, blueprintActionTemplates, theDefaults, specifications, models, sails));

  defaults(specifications.components!.parameters, blueprintParameterTemplates);

  /*
   * Expand generic /:modelIdentity/history route into concrete per-model paths.
   * Models opt in via `supportsHistory: true`; the generic path is removed.
   * The per-model operation schema is supplied by `hookConfig.buildHistoryOperation`;
   * if absent, the generic path is removed but no concrete paths are emitted.
   */
  {
    const historyPathKey = Object.keys(specifications.paths!).find(
      p => p.includes('{modelIdentity}') && p.endsWith('/history')
    );
    if (historyPathKey) {
      const historyModels = Object.values(models).filter(m => m.supportsHistory);
      const shouldPluralize = sails.config.blueprints && sails.config.blueprints.pluralize;

      if (hookConfig.buildHistoryOperation) {
        for (const model of historyModels) {
          // Match the blueprint hook's kebab-case + pluralize convention
          let pathSegment = model.globalId
            .replace(/[A-Z]/g, (c: string, i: number) => (i > 0 ? '-' : '') + c.toLowerCase());
          if (shouldPluralize) {
            pathSegment = pluralize(pathSegment);
          }
          const concretePath = historyPathKey.replace('{modelIdentity}', pathSegment);
          const op = hookConfig.buildHistoryOperation(model, { generateAttributeSchema });
          specifications.paths![concretePath] = { get: op } as OpenApi.Path;
        }
      }

      delete specifications.paths![historyPathKey];
    }
  }

  // Classify tags based on operation types (blueprint CRUD vs custom)
  const tagHasBlueprint: Record<string, boolean> = {};
  const tagHasCustom: Record<string, boolean> = {};
  for (const path in specifications.paths) {
    const pathDef = specifications.paths[path];
    for (const verb in pathDef) {
      const op = pathDef[verb as keyof OpenApi.Path] as OpenApi.Operation & { 'x-blueprint'?: boolean };
      if (op.tags) {
        op.tags.forEach(tag => {
          if (op['x-blueprint']) {
            tagHasBlueprint[tag] = true;
          } else {
            tagHasCustom[tag] = true;
          }
        });
      }
    }
  }

  // clean up of specification, removing unreferenced tags
  const referencedTags = getUniqueTagsFromPath(specifications.paths);

  specifications.tags = specifications.tags!.filter(tagDef => {
    const ret = referencedTags.has(tagDef.name);
    if(!ret) {
      sails.log.verbose(`sails-hook-swagger-generator: Tag '${tagDef.name}' defined but not referenced; removing`);
    }
    return ret;
  });

  // clean up of specification, define referenced tags that dne
  referencedTags.forEach(tagName => {
    const tagDef = specifications.tags!.find(t => t.name === tagName);
    if(!tagDef) {
      sails.log.verbose(`sails-hook-swagger-generator: Tag '${tagName}' referenced but not defined; adding`);
      specifications.tags!.push({ name: tagName } as Tag);
    }
  });

  // Update tag descriptions based on classification (after all tags are finalized).
  // The classification header is always emitted for consistency across resources;
  // if the corresponding model has a `swagger.modelSchema.description`, it is
  // appended below the header as the resource-specific blurb.
  specifications.tags!.forEach(tagDef => {
    const hasCrud = tagHasBlueprint[tagDef.name];
    const hasCustom = tagHasCustom[tagDef.name];
    let header: string;
    if (hasCrud && hasCustom) {
      header = `Resource: **${tagDef.name}** — CRUD and model-specific endpoints`;
    } else if (hasCrud) {
      header = `Resource: **${tagDef.name}** — CRUD endpoints`;
    } else {
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
    const paths = specifications.paths!;
    const verbOrder: Record<string, number> = { get: 0, post: 1, put: 2, patch: 3, delete: 4 };

    const asRecord = (pathDef: OpenApi.Path): Record<string, any> => pathDef as Record<string, any>;

    const getTag = (pathDef: OpenApi.Path): string => {
      const rec = asRecord(pathDef);
      for (const verb in rec) {
        if (rec[verb]?.tags?.[0]) return rec[verb].tags[0];
      }
      return '';
    };

    const hasBlueprint = (pathDef: OpenApi.Path): boolean => {
      const rec = asRecord(pathDef);
      for (const verb in rec) {
        if (rec[verb]?.['x-blueprint']) return true;
      }
      return false;
    };

    const isHistory = (path: string): boolean => path.endsWith('/history');

    // Sort path keys: by tag, then CRUD blueprints first (base before {id}),
    // then history, then custom actions alphabetically.
    const sortedKeys = Object.keys(paths).sort((a, b) => {
      const tagA = getTag(paths[a]);
      const tagB = getTag(paths[b]);
      if (tagA !== tagB) return tagA.localeCompare(tagB);

      const bpA = hasBlueprint(paths[a]);
      const bpB = hasBlueprint(paths[b]);
      if (bpA !== bpB) return bpA ? -1 : 1;

      // Within blueprints: base path before {id} path
      if (bpA && bpB) {
        const aHasParam = a.indexOf('{') >= 0;
        const bHasParam = b.indexOf('{') >= 0;
        if (aHasParam !== bHasParam) return aHasParam ? 1 : -1;
        return a.localeCompare(b);
      }

      // History comes before other custom actions
      const hA = isHistory(a);
      const hB = isHistory(b);
      if (hA !== hB) return hA ? -1 : 1;

      return a.localeCompare(b);
    });

    // Rebuild paths with sorted keys and sorted verbs within each path
    const sorted: Record<string, any> = {};
    for (const key of sortedKeys) {
      const pathDef = paths[key] as Record<string, any>;
      const sortedVerbs = Object.keys(pathDef).sort(
        (a, b) => (verbOrder[a] ?? 9) - (verbOrder[b] ?? 9)
      );
      const sortedPathDef: Record<string, any> = {};
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
    } catch (e: any) {
      sails.log.error(`ERROR: sails-hook-swagger-generator: Error writing ${destPath}: ${e.message}`, e);
    }
  }

  sails.log.info('Swagger generated successfully');

  return specifications;
}
