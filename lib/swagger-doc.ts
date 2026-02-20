import * as fs from 'fs';
import { SwaggerGenerator } from './interfaces';
import { cloneDeep, defaultsDeep, defaults } from 'lodash';
import { blueprintActionTemplates as defaultBlueprintActionTemplates, defaults as configurationDefaults, blueprintParameterTemplates } from './type-formatter';
import { parseModels, parseControllers, parseModelsJsDoc, parseBoundRoutes, parseControllerJsDoc } from './parsers';
import { getUniqueTagsFromPath } from './utils';
import { generateSchemas, generatePaths, generateDefaultModelTags } from './generators';
import { OpenApi } from '../types/openapi';
import { mergeModelJsDoc, mergeTags, mergeComponents, mergeControllerJsDoc, transformSailsPathsToSwaggerPaths, aggregateAssociationRoutes, mergeControllerSwaggerIntoRouteInfo } from './transformations';
import { Tag } from 'swagger-schema-official';

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

  // Update tag descriptions based on classification (after all tags are finalized)
  specifications.tags!.forEach(tagDef => {
    // Skip tags with custom descriptions from model swagger config
    const model = Object.values(models).find(m => m.globalId === tagDef.name);
    if (model?.swagger?.modelSchema?.description) return;

    const hasCrud = tagHasBlueprint[tagDef.name];
    const hasCustom = tagHasCustom[tagDef.name];
    if (hasCrud && hasCustom) {
      tagDef.description = `Resource: **${tagDef.name}** — CRUD and model-specific endpoints`;
    } else if (hasCrud) {
      tagDef.description = `Resource: **${tagDef.name}** — CRUD endpoints`;
    } else {
      tagDef.description = `**${tagDef.name}** — domain-specific endpoints`;
    }
  });

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
