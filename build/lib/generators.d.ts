import { SwaggerSailsModel, NameKeyMap, SwaggerRouteInfo, BlueprintActionTemplates, Defaults } from './interfaces';
import { Reference, Tag } from 'swagger-schema-official';
import { OpenApi } from '../types/openapi';
/**
 * Generate Swagger schema content describing the specified Sails attribute.
 *
 * XXX TODO: add test to this function
 *
 * @see https://swagger.io/docs/specification/data-models/
 * @param {Record<string, any>} attribute Sails model attribute specification as per `Model.js` file
 */
export declare const generateAttributeSchema: (attribute: Sails.AttributeDefinition, attributeName?: string, resolveGlobalId?: ((identity: string) => string) | undefined, jsonSchema?: Record<string, any>) => OpenApi.UpdatedSchema;
/**
 * Generate the OpenAPI schemas for the foreign key values used to reference
 * ORM records for the associations of the specified Sails Model.
 *
 * Used for 'replace' REST blueprint.
 *
 * @param model
 * @param models
 */
export declare const generateModelAssociationFKAttributeSchemas: (model: SwaggerSailsModel, aliasesToInclude: string[] | undefined, models: NameKeyMap<SwaggerSailsModel>) => OpenApi.UpdatedSchema[];
/**
 * Generate the OpenAPI parameters for the foreign key values used to reference
 * ORM records for the associations of the specified Sails Model.
 *
 * Used for 'replace' shortcut blueprint.
 *
 * @param model
 * @param aliasesToInclude
 * @param models
 */
export declare const generateModelAssociationFKAttributeParameters: (model: SwaggerSailsModel, aliasesToInclude: string[] | undefined, models: NameKeyMap<SwaggerSailsModel>) => OpenApi.Parameter[];
export declare const generateSchemaAsQueryParameters: (schema: OpenApi.UpdatedSchema) => OpenApi.Parameter[];
/**
 * Generate Swagger schema content describing specified Sails models.
 *
 * @see https://swagger.io/docs/specification/data-models/
 *
 * @param models parsed Sails models as per `parsers.parseModels()`
 * @returns
 */
export declare const generateSchemas: (models: NameKeyMap<SwaggerSailsModel>) => NameKeyMap<OpenApi.UpdatedSchema | Reference>;
/**
 * Generate Swagger schema content describing specified Sails routes/actions.
 *
 * @see https://swagger.io/docs/specification/paths-and-operations/
 *
 * TODO: break down this function into smaller methods and add tests separately
 *
 * @param routes
 * @param templates
 * @param defaultsValues
 * @param models
 */
export declare const generatePaths: (routes: SwaggerRouteInfo[], templates: BlueprintActionTemplates, defaultsValues: Defaults, specification: OpenApi.OpenApi, models: NameKeyMap<SwaggerSailsModel>, sails: Sails.Sails) => OpenApi.Paths;
export declare const generateDefaultModelTags: (models: NameKeyMap<SwaggerSailsModel>) => Tag[];
