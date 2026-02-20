"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
var lodash_1 = require("lodash");
var type_formatter_1 = require("../type-formatter");
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
exports.loadSwaggerDocComments = function (filePath) {
    return new Promise(function (resolve, reject) {
        try {
            var opts = {
                definition: {
                    openapi: '3.0.0',
                    info: { title: 'dummy', version: '0.0.0' },
                },
                apis: [filePath],
            };
            var specification = swagger_jsdoc_1.default(opts);
            resolve(specification);
        }
        catch (err) {
            reject(err);
        }
    });
};
exports.getUniqueTagsFromPath = function (paths) {
    var referencedTags = new Set();
    for (var path in paths) {
        var pathDefinition = paths[path];
        for (var verb in pathDefinition) {
            var verbDefinition = pathDefinition[verb];
            if (verbDefinition.tags) {
                verbDefinition.tags.forEach(function (tag) { return referencedTags.add(tag); });
            }
        }
    }
    return referencedTags;
};
exports.resolveRef = function (specification, obj) {
    var path = obj.$ref;
    if (typeof (path) === 'string' && path.startsWith('#/')) {
        var pathElements = path.substring(2).split('/');
        return lodash_1.get(specification, pathElements);
    }
    return obj;
};
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
exports.unrollSchema = function (specification, schema) {
    var ret = lodash_1.cloneDeep(exports.resolveRef(specification, schema));
    if (ret.allOf) {
        var allOf = ret.allOf;
        delete ret.allOf;
        allOf.map(function (s) { return lodash_1.defaultsDeep(ret, exports.resolveRef(specification, s)); });
    }
    return ret;
};
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
exports.deriveSwaggerTypeFromExample = function (example, recurseToDepth) {
    if (recurseToDepth === void 0) { recurseToDepth = 4; }
    var deriveSimpleSwaggerType = function (v) {
        // undefined,boolean,number,bigint,string,symbol,function,object
        var t = typeof (v);
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
        var types_1 = [];
        example.map(function (v) {
            var t = recurseToDepth > 1 ? exports.deriveSwaggerTypeFromExample(v, recurseToDepth - 1) : deriveSimpleSwaggerType(v);
            var existing = types_1.find(function (_t) { return lodash_1.isEqual(_t, t); });
            if (!existing)
                types_1.push(t);
        });
        if (types_1.length < 1) {
            types_1.push(type_formatter_1.swaggerTypes.any);
        }
        if (types_1.length === 1) {
            return {
                type: 'array',
                items: Array.from(types_1)[0],
            };
        }
        else {
            return {
                type: 'array',
                items: {
                    anyOf: Array.from(types_1),
                },
            };
        }
    }
    else {
        var t = typeof (example);
        if (t === 'object' || t === 'function') {
            if (recurseToDepth <= 1) {
                return deriveSimpleSwaggerType(example);
            }
            var properties_1 = {};
            lodash_1.map(example, function (v, k) {
                properties_1[k] = __assign({ example: v }, exports.deriveSwaggerTypeFromExample(v, recurseToDepth - 1));
            });
            return {
                type: 'object',
                properties: properties_1,
            };
        }
        else {
            return deriveSimpleSwaggerType(example);
        }
    }
};
