import { SwaggerSailsModel, SwaggerRouteInfo, NameKeyMap, SwaggerModelAttribute, SwaggerSailsControllers, SwaggerControllerAttribute } from './interfaces';
/**
 * Parse Sails ORM models (runtime versions from `sails.models`).
 *
 * @param sails
 */
export declare const parseModels: (sails: Sails.Sails) => NameKeyMap<SwaggerSailsModel>;
/**
 * Parse array of routes capture from Sails 'router:bind' events.
 *
 * @note See detailed background in implementation comments.
 *
 * @param boundRoutes
 * @param models
 * @param sails
 */
export declare const parseBoundRoutes: (boundRoutes: Array<Sails.Route>, models: NameKeyMap<SwaggerSailsModel>, sails: Sails.Sails) => SwaggerRouteInfo[];
/**
 * Load and return details of all Sails controller files and actions.
 *
 * @note The loading mechanism is taken from Sails.
 * @see https://github.com/balderdashy/sails/blob/master/lib/app/private/controller/load-action-modules.js#L27
 *
 * @param sails
 */
export declare const parseControllers: (sails: Sails.Sails) => Promise<SwaggerSailsControllers>;
/**
 * Loads and parses model JSDoc, returning a map keyed on model identity.
 *
 * @note Identities lowercase.
 *
 * @param sails
 * @param models
 */
export declare const parseModelsJsDoc: (sails: Sails.Sails, models: NameKeyMap<SwaggerSailsModel>) => Promise<NameKeyMap<SwaggerModelAttribute>>;
/**
 * Loads and parses controller JSDoc, returning a map keyed on controller file identity.
 *
 * @note Identities lowercase.
 *
 * @param sails
 * @param controllers
 */
export declare const parseControllerJsDoc: (sails: Sails.Sails, controllers: SwaggerSailsControllers) => Promise<NameKeyMap<SwaggerControllerAttribute>>;
