import { SwaggerGenerator } from './interfaces';
import { OpenApi } from '../types/openapi';
declare const _default: (sails: Sails.Sails, sailsRoutes: Array<Sails.Route>, context: Sails.Hook<SwaggerGenerator>) => Promise<OpenApi.OpenApi | undefined>;
export default _default;
