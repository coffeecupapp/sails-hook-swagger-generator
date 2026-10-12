import { BluePrintAction } from '../interfaces';
import { OpenApi } from '../../types/openapi';
import { Reference } from 'swagger-schema-official';
export declare const blueprintActions: Array<BluePrintAction>;
export declare const attributeValidations: string[];
export declare const loadSwaggerDocComments: (filePath: string) => Promise<OpenApi.OpenApi>;
export declare const getUniqueTagsFromPath: (paths: OpenApi.Paths) => Set<unknown>;
export declare const resolveRef: (specification: OpenApi.OpenApi, obj: (Reference | unknown)) => unknown;
/**
 * Provides limited dereferencing, or unrolling, of schemas.
 *
 * Background: The generator `generateSchemas()` produces two variants:
 * 1. The `without-required-constraint` variant containing the properties but without
 *    the specifying required fields (used for update blueprint).
 * 2. A primary variant containing an `allOf` union of the variant above
 *    and the `required` constraint (used for the create blueprint).
 *
 * This method handles this simple case, resolving references and unrolling
 * into a simple cloned schema with directly contained properties.
 *
 * Otherwise, schema returned as clone but unmodified.
 *
 * @param specification
 * @param schema
 */
export declare const unrollSchema: (specification: OpenApi.OpenApi, schema: OpenApi.UpdatedSchema | Reference) => OpenApi.UpdatedSchema;
/**
 * Derive Swagger/OpenAPI schema from example value.
 *
 * Two specific use cases:
 * 1. The Sails model attribute type 'json' may be best represented in
 *    Swagger/OpenAPI as the type 'object' or an array of elements.
 *    Let's attempt to determine this from the attribute property 'example'.
 * 2. Actions2 outputs may include `outputExample` but do not specify a
 *    type - use this method to derive a schema definition.
 *
 * @param {any} example
 */
export declare const deriveSwaggerTypeFromExample: (example: unknown, recurseToDepth?: number) => OpenApi.UpdatedSchema;
