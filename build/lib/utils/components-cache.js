"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var set_1 = __importDefault(require("lodash/set"));
var componentDefinitionCache = {
    // Reusable schemas (data models)
    schemas: {},
    // Reusable path, query, header and cookie parameters
    parameters: {},
    // Security scheme definitions (see Authentication)
    securitySchemes: {},
    // Reusable request bodies
    requestBodies: {},
    // Reusable responses, such as 401 Unauthorized or 400 Bad Request
    responses: {},
    // Reusable response headers
    headers: {},
    // Reusable examples
    examples: {},
    // Reusable links
    links: {},
    // Reusable callbacks
    callbacks: {},
};
exports.default = {
    getCache: function () { return componentDefinitionCache; },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    write: function (path, value) {
        (0, set_1.default)(componentDefinitionCache, path, value);
    }
};
