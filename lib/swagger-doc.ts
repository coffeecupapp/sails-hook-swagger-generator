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
   */
  {
    const historyPathKey = Object.keys(specifications.paths!).find(
      p => p.includes('{modelIdentity}') && p.endsWith('/history')
    );
    if (historyPathKey) {
      const historyOp = (specifications.paths![historyPathKey] as Record<string, any>)?.get;
      if (historyOp) {
        const historyModels = Object.values(models).filter(m => m.supportsHistory);

        for (const model of historyModels) {
          const concretePath = historyPathKey.replace('{modelIdentity}', model.identity);

          // Build oldState/newState schema from model attributes
          const stateProperties: Record<string, OpenApi.UpdatedSchema> = {};
          const stripFields = model.logStripFields || [];

          for (const [name, attr] of Object.entries(model.attributes)) {
            if ((attr as any).collection) continue;
            if (name.startsWith('_')) continue;
            if (stripFields.includes(name)) continue;
            if (model.hiddenAttributes.includes(name)) continue;

            if ((attr as any).model) {
              stateProperties[name] = { type: 'integer' };
            } else {
              stateProperties[name] = generateAttributeSchema(attr, name);
            }
          }

          const stateSchema: OpenApi.UpdatedSchema = {
            type: 'object',
            description: 'Only the fields that changed are included. Fields may be further omitted based on the requesting user\'s permissions.',
            properties: stateProperties,
          };

          const op: OpenApi.Operation = {
            tags: [model.globalId],
            summary: `Get ${model.globalId} history log`,
            description: `Returns the history log for a **${model.globalId}** record. Each entry contains \`oldState\` and \`newState\` objects with only the fields that changed between revisions. Fields may be further omitted based on the requesting user's permissions.`,
            parameters: [
              {
                in: 'query',
                name: 'id',
                required: true,
                schema: { type: 'integer' },
                description: `The ID of the ${model.globalId} record to retrieve history for`,
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
                              actionType: { type: 'string', enum: ['NEW', 'EDIT', 'DELETE'] as any, description: 'Type of change' },
                              oldState: stateSchema,
                              newState: stateSchema,
                              additionalInfo: {
                                type: 'object',
                                nullable: true,
                                description: 'Present when a comment was attached to the change. The comment author is identified by `actionUser`.',
                                properties: {
                                  comment: { type: 'string', description: 'The comment text' },
                                },
                              } as OpenApi.UpdatedSchema,
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

          specifications.paths![concretePath] = { get: op } as OpenApi.Path;
        }

        delete specifications.paths![historyPathKey];
      }
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

    // Sort path keys: by tag, then blueprints before custom, then base path before {id} path
    const sortedKeys = Object.keys(paths).sort((a, b) => {
      const tagA = getTag(paths[a]);
      const tagB = getTag(paths[b]);
      if (tagA !== tagB) return tagA.localeCompare(tagB);

      const bpA = hasBlueprint(paths[a]) ? 0 : 1;
      const bpB = hasBlueprint(paths[b]) ? 0 : 1;
      if (bpA !== bpB) return bpA - bpB;

      // Base path (e.g. /v1/absences) before param path (e.g. /v1/absences/{id})
      const aHasParam = a.indexOf('{') >= 0;
      const bHasParam = b.indexOf('{') >= 0;
      if (aHasParam !== bHasParam) return aHasParam ? 1 : -1;

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
