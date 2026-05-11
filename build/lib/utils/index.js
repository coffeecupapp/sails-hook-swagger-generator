"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveSwaggerTypeFromExample = exports.unrollSchema = exports.resolveRef = exports.getUniqueTagsFromPath = exports.loadSwaggerDocComments = exports.attributeValidations = exports.blueprintActions = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const lodash_1 = require("lodash");
const type_formatter_1 = require("../type-formatter");
exports.blueprintActions = ['findone', 'find', 'create', 'update', 'destroy', 'populate', 'add', 'remove', 'replace'];
exports.attributeValidations = [
    'isAfter',
    'isBefore',
    'isBoolean',
    'isCreditCard',
    'isEmail',
    'isHexColor',
    'isIn',
    'isInteger',
    'isIP',
    'isNotEmptyString',
    'isNotIn',
    'isNumber',
    'isString',
    'isURL',
    'isUUID',
    'max',
    'min',
    'maxLength',
    'minLength',
    'regex',
    'custom',
];
const loadSwaggerDocComments = (filePath) => {
    return new Promise((resolve, reject) => {
        try {
            const opts = {
                definition: {
                    openapi: '3.1.0',
                    info: { title: 'dummy', version: '0.0.0' },
                },
                apis: [filePath],
            };
            const specification = (0, swagger_jsdoc_1.default)(opts);
            resolve(specification);
        }
        catch (err) {
            reject(err);
        }
    });
};
exports.loadSwaggerDocComments = loadSwaggerDocComments;
const getUniqueTagsFromPath = (paths) => {
    const referencedTags = new Set();
    for (const path in paths) {
        const pathDefinition = paths[path];
        for (const verb in pathDefinition) {
            const verbDefinition = pathDefinition[verb];
            if (verbDefinition.tags) {
                verbDefinition.tags.forEach(tag => referencedTags.add(tag));
            }
        }
    }
    return referencedTags;
};
exports.getUniqueTagsFromPath = getUniqueTagsFromPath;
const resolveRef = (specification, obj) => {
    const path = obj.$ref;
    if (typeof (path) === 'string' && path.startsWith('#/')) {
        const pathElements = path.substring(2).split('/');
        return (0, lodash_1.get)(specification, pathElements);
    }
    return obj;
};
exports.resolveRef = resolveRef;
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
const unrollSchema = (specification, schema) => {
    const ret = (0, lodash_1.cloneDeep)((0, exports.resolveRef)(specification, schema));
    if (ret.allOf) {
        const allOf = ret.allOf;
        delete ret.allOf;
        allOf.map(s => (0, lodash_1.defaultsDeep)(ret, (0, exports.resolveRef)(specification, s)));
    }
    return ret;
};
exports.unrollSchema = unrollSchema;
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
const deriveSwaggerTypeFromExample = (example, recurseToDepth = 4) => {
    const deriveSimpleSwaggerType = (v) => {
        // undefined,boolean,number,bigint,string,symbol,function,object
        const t = typeof (v);
        if (t === 'string' || t === 'symbol') {
            return type_formatter_1.swaggerTypes.string;
        }
        else if (t === 'number') {
            return Number.isInteger(v) ? type_formatter_1.swaggerTypes.long : type_formatter_1.swaggerTypes.double;
        }
        else if (t === 'bigint') {
            return type_formatter_1.swaggerTypes.bigint;
        }
        else if (t === 'boolean') {
            return type_formatter_1.swaggerTypes.boolean;
        }
        else if (t === 'object' || t === 'function') {
            return type_formatter_1.swaggerTypes.any; // recursive evaluation of properties done outside
        }
        else {
            return type_formatter_1.swaggerTypes.any;
        }
    };
    if (Array.isArray(example)) {
        const types = [];
        example.map(v => {
            const t = recurseToDepth > 1 ? (0, exports.deriveSwaggerTypeFromExample)(v, recurseToDepth - 1) : deriveSimpleSwaggerType(v);
            const existing = types.find(_t => (0, lodash_1.isEqual)(_t, t));
            if (!existing)
                types.push(t);
        });
        if (types.length < 1) {
            types.push(type_formatter_1.swaggerTypes.any);
        }
        if (types.length === 1) {
            return {
                type: 'array',
                items: Array.from(types)[0],
            };
        }
        else {
            return {
                type: 'array',
                items: {
                    anyOf: Array.from(types),
                },
            };
        }
    }
    else {
        const t = typeof (example);
        if (t === 'object' || t === 'function') {
            if (recurseToDepth <= 1) {
                return deriveSimpleSwaggerType(example);
            }
            const properties = {};
            (0, lodash_1.map)(example, (v, k) => {
                properties[k] = {
                    example: v,
                    ...(0, exports.deriveSwaggerTypeFromExample)(v, recurseToDepth - 1),
                };
            });
            return {
                type: 'object',
                properties: properties,
            };
        }
        else {
            return deriveSimpleSwaggerType(example);
        }
    }
};
exports.deriveSwaggerTypeFromExample = deriveSwaggerTypeFromExample;
