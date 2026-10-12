import { BlueprintActionTemplates, Action2Response, Defaults } from './interfaces';
import { OpenApi } from '../types/openapi';
import { Reference } from 'swagger-schema-official';
/**
 * Created by theophy on 02/08/2017.
 *
 * this modules helps us to stick with swagger specifications for formatting types
 */
export type SwaggerTypeAlias = 'integer' | 'long' | 'bigint' | 'float' | 'double' | 'string' | 'byte' | 'binary' | 'boolean' | 'date' | 'datetime' | 'password' | 'object' | 'any';
/**
 * this is used to map our sails types with the allowed type defintions based on swagger specification
 */
export declare const swaggerTypes: Record<SwaggerTypeAlias, OpenApi.UpdatedSchema>;
/**
 * Defines direct mappings from Sails model attribute definition values (key) to Swagger/OpenAPI
 * schema names (value).
 */
export declare const sailsAttributePropertiesMap: {
    [n in keyof Sails.AttributeDefinition]?: string;
};
/**
 * Defines direct mappings from Sails attribute validation (key) to Swagger/OpenAPI
 * schema name (value).
 */
export declare const validationsMap: {
    [n in keyof Sails.AttributeValidation]: string;
};
/**
 * Defines template for generating Swagger for each Sails blueprint action routes.
 *
 * In summary/description strings the value `{globalId}` is replaced with the applicable Sails model.
 *
 * Parameters values are Swagger definitions, with the exception of the string value
 * `primaryKeyPathParameter` used to include a reference to a model's primary key (this is
 * handled in `generatePaths()`).
 *
 * Modifiers are used to apply custom changes to the generated Swagger:
 * - String values are predefined in `generatePaths()`
 * - Functions are called with `func(blueprintActionTemplate, routeInfo, pathEntry)`
 *
 * These templates may be modfied / added to using the `updateBlueprintActionTemplates` config option
 * e.g. to support custom blueprint actions/routes.
 */
export declare const blueprintActionTemplates: BlueprintActionTemplates;
/**
 * Defines standard parameters for generated Swagger for each Sails blueprint action routes.
 */
export declare const blueprintParameterTemplates: Record<string, OpenApi.Parameter | Reference>;
/**
 * Defines standard Sails responses as used within actions2 actions.
 */
export declare const actions2Responses: Action2Response;
/**
 * Default values for produces/consumes and responses for custom actions.
 */
export declare const defaults: Defaults;
