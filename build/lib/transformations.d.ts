import { NameKeyMap, SwaggerSailsModel, SwaggerModelAttribute, SwaggerSailsControllers, SwaggerControllerAttribute, SwaggerRouteInfo } from "./interfaces";
import { Tag } from "swagger-schema-official";
import { OpenApi } from "../types/openapi";
/**
 * Maps from a Sails route path of the form `/path/:id` to a
 * Swagger path of the form `/path/{id}`.
 */
export declare const transformSailsPathsToSwaggerPaths: (routes: SwaggerRouteInfo[]) => void;
export declare const aggregateAssociationRoutes: (boundRoutes: SwaggerRouteInfo[]) => SwaggerRouteInfo[];
/**
 * Merges JSDoc `actions` and `model` elements **but not** `components` and `tags`
 * (which are merged in `mergeComponents()` and `mergeTags()`).
 *
 * @param models
 * @param modelsJsDoc
 */
export declare const mergeModelJsDoc: (models: NameKeyMap<SwaggerSailsModel>, modelsJsDoc: NameKeyMap<SwaggerModelAttribute>) => void;
/**
 * Merges JSDoc into `controllerFiles` (not `actions`).
 *
 * The merge includes JSDoc `actions` and `controller` elements **but not** `components` and `tags`
 * (which are merged in `mergeComponents()` and `mergeTags()`).
 *
 * @param controllers
 * @param controllersJsDoc
 */
export declare const mergeControllerJsDoc: (controllers: SwaggerSailsControllers, controllersJsDoc: NameKeyMap<SwaggerControllerAttribute>) => void;
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
export declare const mergeControllerSwaggerIntoRouteInfo: (sails: Sails.Sails, routes: SwaggerRouteInfo[], controllers: SwaggerSailsControllers, controllersJsDoc: NameKeyMap<SwaggerControllerAttribute>) => void;
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
export declare const mergeComponents: (dest: OpenApi.Components, models: NameKeyMap<SwaggerSailsModel>, modelsJsDoc: NameKeyMap<SwaggerModelAttribute>, controllers: SwaggerSailsControllers, controllersJsDoc: NameKeyMap<SwaggerControllerAttribute>) => void;
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
export declare const mergeTags: (dest: Tag[], models: NameKeyMap<SwaggerSailsModel>, modelsJsDoc: NameKeyMap<SwaggerModelAttribute>, controllers: SwaggerSailsControllers, controllersJsDoc: NameKeyMap<SwaggerControllerAttribute>, defaultModelTags: Tag[]) => void;
