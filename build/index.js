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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const swagger_doc_1 = __importDefault(require("./lib/swagger-doc"));
module.exports = (sails) => {
    const routes = [];
    return {
        defaults: {
            disabled: false,
            __configKey__: {
                swaggerJsonPath: path.join(sails.config.appPath, '/swagger/swagger.json'),
                swagger: {
                    openapi: '3.1.0',
                    info: {
                        title: 'Swagger Json',
                        description: 'This is a generated swagger json for your sails project',
                        termsOfService: 'http://example.com/terms',
                        contact: {
                            name: 'Theophilus Omoregbee',
                            url: 'http://github.com/theo4u',
                            email: 'theo4u@ymail.com'
                        },
                        license: { name: 'Apache 2.0', url: 'http://www.apache.org/licenses/LICENSE-2.0.html' },
                        version: '1.0.0'
                    },
                    servers: [
                        { url: 'http://localhost:1337/' }
                    ],
                    externalDocs: { url: 'https://theoomoregbee.github.io/' }
                },
                excludeDeprecatedPutBlueprintRoutes: true,
            }
        },
        // Run when sails loads-- be sure and call `next()`.
        initialize: function (next) {
            // https://github.com/balderdashy/sails/blob/master/lib/EVENTS.md#routerbind
            sails.on('router:bind', routeObj => {
                routes.push(routeObj);
            });
            sails.after('ready', async () => {
                await (0, swagger_doc_1.default)(sails, routes, this);
            });
            next();
        }
    };
};
