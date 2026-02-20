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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDefaultModelTags = exports.generatePaths = exports.generateSchemas = exports.generateSchemaAsQueryParameters = exports.generateModelAssociationFKAttributeParameters = exports.generateModelAssociationFKAttributeSchemas = exports.generateAttributeSchema = void 0;
var type_formatter_1 = require("./type-formatter");
var assign_1 = __importDefault(require("lodash/assign"));
var defaults_1 = __importDefault(require("lodash/defaults"));
var mapKeys_1 = __importDefault(require("lodash/mapKeys"));
var pick_1 = __importDefault(require("lodash/pick"));
var keys_1 = __importDefault(require("lodash/keys"));
var cloneDeep_1 = __importDefault(require("lodash/cloneDeep"));
var isFunction_1 = __importDefault(require("lodash/isFunction"));
var forEach_1 = __importDefault(require("lodash/forEach"));
var set_1 = __importDefault(require("lodash/set"));
var lodash_1 = require("lodash");
var utils_1 = require("./utils");
/**
 * Generate Swagger schema content describing the specified Sails attribute.
 *
 * XXX TODO: add test to this function
 *
 * @see https://swagger.io/docs/specification/data-models/
 * @param {Record<string, any>} attribute Sails model attribute specification as per `Model.js` file
 */
var generateAttributeSchema = function (attribute, attributeName) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    var ai = attribute || {}, sts = type_formatter_1.swaggerTypes;
    var type = ai.type || 'string';
    var columnType = (_a = ai.autoMigrations) === null || _a === void 0 ? void 0 : _a.columnType;
    var autoIncrement = (_b = ai.autoMigrations) === null || _b === void 0 ? void 0 : _b.autoIncrement;
    var schema = {};
    var formatDesc = function (extra) {
        var ret = [];
        if (ai.description)
            ret.push(ai.description);
        if (extra)
            ret.push(extra);
        return ret.join(' ');
    };
    if (((_c = ai.meta) === null || _c === void 0 ? void 0 : _c.swagger) && 'type' in ai.meta.swagger) {
        // OpenAPI 3 stipulates NO type as 'any', allow this by 'type' present but null to achieve this
        if (ai.meta.swagger.type)
            schema.type = ai.meta.swagger.type;
    }
    else if (ai.model) {
        (0, assign_1.default)(schema, __assign(__assign({}, sts.integer), { description: formatDesc("ID of the associated **".concat(ai.model, "** record")) }));
    }
    else if (ai.collection) {
        (0, assign_1.default)(schema, {
            description: formatDesc("Array of **".concat(ai.collection, "**'s or array of FK's when creating / updating / not populated")),
            type: 'array',
            items: { '$ref': '#/components/schemas/' + ai.collection },
        });
    }
    else if (type == 'number') {
        var t = autoIncrement ? sts.integer : sts.double;
        if ((_d = ai.validations) === null || _d === void 0 ? void 0 : _d.isInteger) {
            t = sts.integer;
        }
        else if (columnType) {
            var ct = columnType;
            if (ct.match(/int/i))
                t = sts.integer;
            else if (ct.match(/long/i))
                t = sts.long;
            else if (ct.match(/float/i))
                t = sts.float;
            else if (ct.match(/double/i))
                t = sts.double;
            else if (ct.match(/decimal/i))
                t = sts.double;
        }
        (0, assign_1.default)(schema, t);
    }
    else if (type == 'boolean') {
        (0, assign_1.default)(schema, sts.boolean);
    }
    else if (type == 'json') {
        (0, assign_1.default)(schema, (0, utils_1.deriveSwaggerTypeFromExample)(ai.example || ai.defaultsTo));
    }
    else if (type == 'ref') {
        var t = void 0;
        if (columnType) {
            var ct = columnType;
            if (ct.match(/timestamp/i))
                t = sts.datetime;
            else if (ct.match(/datetime/i))
                t = sts.datetime;
            else if (ct.match(/date/i))
                t = sts.date;
            else if (ct.match(/decimal/i))
                t = sts.double;
            else if (ct.match(/time\b/i))
                t = sts.string; // time-of-day without date
        }
        // fallback: infer from attribute name conventions
        if (t === undefined && (attributeName || ai.columnName)) {
            var name = attributeName || ai.columnName;
            if (/At$/.test(name))
                t = sts.datetime; // e.g. createdAt, deletedAt
            else if (/Date$/.test(name) || name === 'day')
                t = sts.date; // e.g. startDate, day
            else if (/Time$/.test(name))
                t = sts.string; // e.g. startTime
        }
        if (t === undefined)
            t = (0, utils_1.deriveSwaggerTypeFromExample)(ai.example || ai.defaultsTo);
        if (t === undefined)
            t = sts.string; // safe fallback for ref
        (0, assign_1.default)(schema, t);
    }
    else { // includes =='string'
        (0, assign_1.default)(schema, sts.string);
    }
    var isIP = false;
    if (schema.type == 'string') {
        var v = ai.validations;
        if (v) {
            if (v.isEmail)
                schema.format = 'email';
            if (v.isIP) {
                isIP = true;
                schema.format = 'ipv4';
            }
            if (v.isURL)
                schema.format = 'uri';
            if (v.isUUID)
                schema.format = 'uuid';
            if (v.regex)
                schema.pattern = v.regex.toString().slice(1, -1);
        }
    }
    // process Sails --> Swagger attribute mappings as per sailAttributePropertiesMap
    (0, defaults_1.default)(schema, (0, mapKeys_1.default)((0, pick_1.default)(ai, (0, keys_1.default)(type_formatter_1.sailsAttributePropertiesMap)), function (v, k) { return type_formatter_1.sailsAttributePropertiesMap[k]; }));
    // process Sails --> Swagger attribute mappings as per validationsMap
    (0, defaults_1.default)(schema, (0, mapKeys_1.default)((0, pick_1.default)(ai.validations, (0, keys_1.default)(type_formatter_1.validationsMap)), function (v, k) { return type_formatter_1.validationsMap[k]; }));
    // OpenAPI 3.1: convert enum array to oneOf + const + title when TS enum object is provided
    var enumObj = ((_e = ai.meta) === null || _e === void 0 ? void 0 : _e.enum) || ((_g = (_f = ai.meta) === null || _f === void 0 ? void 0 : _f.swagger) === null || _g === void 0 ? void 0 : _g.enum);
    if (enumObj && schema.enum) {
        var isNumeric_1 = schema.enum.some(function (v) { return typeof v === 'number'; });
        schema.oneOf = schema.enum.map(function (value) {
            var title;
            if (isNumeric_1) {
                // numeric enum: reverse mapping gives us the name
                title = enumObj[value];
            }
            else {
                // string enum: find key by value
                title = Object.keys(enumObj).find(function (k) { return enumObj[k] === value; }) || String(value);
            }
            return { const: value, title: title };
        });
        delete schema.enum;
        delete schema.type;
        delete schema.format;
    }
    // copy default into example if present
    if (schema.default && !schema.example) {
        schema.example = schema.default;
    }
    // process final autoMigrations: unique
    if ((_h = ai.autoMigrations) === null || _h === void 0 ? void 0 : _h.unique) {
        schema.uniqueItems = true;
    }
    // represent Sails `isIP` as one of ipv4/ipv6
    if (schema.type == 'string' && isIP) {
        schema = {
            description: formatDesc('ipv4 or ipv6 address'),
            oneOf: [
                (0, cloneDeep_1.default)(schema),
                (0, assign_1.default)((0, cloneDeep_1.default)(schema), { format: 'ipv6' }),
            ]
        };
    }
    if (schema.description)
        schema.description = schema.description.trim();
    // note: required --> required[] (not here, needs to be done at model level)
    // finally, overwrite in custom swagger
    if ((_j = ai.meta) === null || _j === void 0 ? void 0 : _j.swagger) {
        // note: 'type' handled above
        (0, assign_1.default)(schema, (0, lodash_1.omit)(ai.meta.swagger, 'exclude', 'type', 'in', 'enum'));
    }
    // OpenAPI 3.1: convert nullable to type array
    if (schema.nullable) {
        if (schema.type) {
            schema.type = [schema.type, 'null'];
        }
        delete schema.nullable;
    }
    return schema;
};
exports.generateAttributeSchema = generateAttributeSchema;
/**
 * Generate the OpenAPI schemas for the foreign key values used to reference
 * ORM records for the associations of the specified Sails Model.
 *
 * Used for 'replace' REST blueprint.
 *
 * @param model
 * @param models
 */
var generateModelAssociationFKAttributeSchemas = function (model, aliasesToInclude, models) {
    if (!model.associations) {
        return [];
    }
    return model.associations.map(function (association) {
        if (!aliasesToInclude || aliasesToInclude.indexOf(association.alias) < 0)
            return;
        var targetModelIdentity = association.type === 'model' ? association.model : association.collection;
        var targetModel = models[targetModelIdentity];
        if (!targetModel) {
            return; // data structure integrity issue should not occur
        }
        var description = association.type === 'model' ?
            "**".concat(model.globalId, "** record's foreign key value to use as the replacement for this attribute")
            : "**".concat(model.globalId, "** record's foreign key values to use as the replacement for this collection");
        var targetFKAttribute = targetModel.attributes[targetModel.primaryKey];
        return (0, exports.generateAttributeSchema)(__assign(__assign({}, targetFKAttribute), { autoMigrations: __assign(__assign({}, (targetFKAttribute.autoMigrations || {})), { autoIncrement: false }), description: "".concat(description, " (**").concat(association.alias, "** association").concat(targetFKAttribute.description ? '; ' + targetFKAttribute.description : '', ")") }));
    })
        .filter(function (parameter) { return parameter; });
};
exports.generateModelAssociationFKAttributeSchemas = generateModelAssociationFKAttributeSchemas;
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
var generateModelAssociationFKAttributeParameters = function (model, aliasesToInclude, models) {
    if (!model.associations) {
        return [];
    }
    return model.associations.map(function (association) {
        if (!aliasesToInclude || aliasesToInclude.indexOf(association.alias) < 0)
            return;
        var targetModelIdentity = association.type === 'model' ? association.model : association.collection;
        var targetModel = models[targetModelIdentity];
        if (!targetModel) {
            return; // data structure integrity issue should not occur
        }
        var description = association.type === 'model' ?
            "**".concat(model.globalId, "** record's foreign key value to use as the replacement for this attribute")
            : "**".concat(model.globalId, "** record's foreign key values to use as the replacement for this collection");
        var targetFKAttribute = targetModel.attributes[targetModel.primaryKey];
        var targetFKAttributeSchema = (0, exports.generateAttributeSchema)(__assign(__assign({}, targetFKAttribute), { autoMigrations: __assign(__assign({}, (targetFKAttribute.autoMigrations || {})), { autoIncrement: false }), description: "".concat(description, " (**").concat(association.alias, "** association").concat(targetFKAttribute.description ? '; ' + targetFKAttribute.description : '', ")") }));
        return {
            in: 'query',
            name: association.alias,
            description: targetFKAttributeSchema.description,
            schema: {
                type: 'array',
                items: targetFKAttributeSchema,
            },
        };
    })
        .filter(function (parameter) { return parameter; });
};
exports.generateModelAssociationFKAttributeParameters = generateModelAssociationFKAttributeParameters;
var generateSchemaAsQueryParameters = function (schema) {
    var required = schema.required || [];
    return (0, lodash_1.map)(schema.properties || {}, function (property, name) {
        var parameter = {
            in: 'query',
            name: name,
            schema: property,
        };
        if (property.description) {
            parameter.description = property.description;
        }
        if (required.indexOf(name) >= 0) {
            parameter.required = true;
        }
        return parameter;
    });
};
exports.generateSchemaAsQueryParameters = generateSchemaAsQueryParameters;
/**
 * Generate Swagger schema content describing specified Sails models.
 *
 * @see https://swagger.io/docs/specification/data-models/
 *
 * @param models parsed Sails models as per `parsers.parseModels()`
 * @returns
 */
var generateSchemas = function (models) {
    return Object.keys(models)
        .reduce(function (schemas, identity) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        var model = models[identity];
        if (((_b = (_a = model.swagger) === null || _a === void 0 ? void 0 : _a.modelSchema) === null || _b === void 0 ? void 0 : _b.exclude) === true) {
            return schemas;
        }
        var schemaWithoutRequired = __assign({ type: 'object', description: ((_c = model.swagger.modelSchema) === null || _c === void 0 ? void 0 : _c.description) || "Aerion model **".concat(model.globalId, "**"), properties: {} }, (0, lodash_1.omit)(((_d = model.swagger) === null || _d === void 0 ? void 0 : _d.modelSchema) || {}, 'exclude', 'description', 'required', 'tags'));
        var required = [];
        var attributes = model.attributes || {};
        var excludeAttributes = __spreadArray(__spreadArray([], (model.hiddenAttributes || []), true), (((_f = (_e = model.swagger) === null || _e === void 0 ? void 0 : _e.modelSchema) === null || _f === void 0 ? void 0 : _f.excludeAttributes) || []), true);
        (0, defaults_1.default)(schemaWithoutRequired.properties, Object.keys(attributes).reduce(function (props, attributeName) {
            var _a, _b;
            var attribute = model.attributes[attributeName];
            var excluded = ((_b = (_a = attribute.meta) === null || _a === void 0 ? void 0 : _a.swagger) === null || _b === void 0 ? void 0 : _b.exclude) === true
                || excludeAttributes.indexOf(attributeName) >= 0
                || attributeName.startsWith('_')
                || !!attribute.collection;
            if (!excluded) {
                props[attributeName] = (0, exports.generateAttributeSchema)(attribute, attributeName);
                if (attribute.required)
                    required.push(attributeName);
            }
            return props;
        }, {}));
        var withoutRequiredName = "".concat(model.identity, "-without-required-constraint");
        var schema = {
            type: 'object',
            allOf: [
                { '$ref': "#/components/schemas/".concat(withoutRequiredName) },
            ],
        };
        if ((_h = (_g = model.swagger) === null || _g === void 0 ? void 0 : _g.modelSchema) === null || _h === void 0 ? void 0 : _h.required) {
            required = __spreadArray([], model.swagger.modelSchema.required, true);
        }
        if (required.length > 0) {
            schema.allOf.push({ required: required });
        }
        schemas[model.identity] = schema;
        schemas[withoutRequiredName] = schemaWithoutRequired;
        return schemas;
    }, {});
};
exports.generateSchemas = generateSchemas;
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
var generatePaths = function (routes, templates, defaultsValues, specification, models, sails) {
    var paths = {};
    var tags = specification.tags;
    var components = specification.components;
    if (!components.parameters) {
        components.parameters = {};
    }
    (0, forEach_1.default)(routes, function (route) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y;
        if (((_a = route.swagger) === null || _a === void 0 ? void 0 : _a.exclude) === true) {
            return;
        }
        /* overwrite: summary, description, externalDocs, operationId, tags, requestBody, servers, security
         * merge: parameters (by in+name), responses (by statusCode) */
        var pathEntry = __assign({ summary: undefined, description: undefined, externalDocs: undefined, operationId: undefined, tags: undefined, parameters: [], responses: {} }, (0, cloneDeep_1.default)((0, lodash_1.omit)(route.swagger || {}, 'exclude')));
        var resolveParameterRef = function (p) {
            var specWithDefaultParametersToBeMerged = {
                components: { parameters: type_formatter_1.blueprintParameterTemplates }
            };
            // resolve first with current spec, then try template params to be added later
            return ((0, utils_1.resolveRef)(specification, p) || (0, utils_1.resolveRef)(specWithDefaultParametersToBeMerged, p));
        };
        var isParam = function (inType, name) {
            return !!pathEntry.parameters
                .map(function (parameter) { return resolveParameterRef(parameter); })
                .find(function (parameter) { return parameter && 'in' in parameter && parameter.in == inType && parameter.name == name; });
        };
        var addParamIfDne = function (p) {
            var resolved = resolveParameterRef(p);
            if (resolved && 'in' in resolved) {
                if (!isParam(resolved.in, resolved.name)) {
                    pathEntry.parameters.push(p);
                }
            }
        };
        if (route.actionType === 'actions2') {
            // note: check before blueprint template as these may override template for specific action(s)
            var patternVariables_1 = route.variables || [];
            if ((_b = route.actions2Machine) === null || _b === void 0 ? void 0 : _b.inputs) {
                (0, forEach_1.default)(route.actions2Machine.inputs, function (value, key) {
                    var _a;
                    var _b, _c, _d, _e;
                    if (((_c = (_b = value.meta) === null || _b === void 0 ? void 0 : _b.swagger) === null || _c === void 0 ? void 0 : _c.exclude) === true) {
                        return;
                    }
                    var _in = (_e = (_d = value.meta) === null || _d === void 0 ? void 0 : _d.swagger) === null || _e === void 0 ? void 0 : _e.in;
                    if (!_in) {
                        _in = patternVariables_1.indexOf(key) >= 0 ? 'path' : 'query';
                    }
                    // compose attribute definition
                    var description = value.description, _attribute = __rest(value, ["description"]);
                    var attribute = __assign(__assign({}, (0, lodash_1.omit)(_attribute, utils_1.attributeValidations)), { validations: (0, pick_1.default)(_attribute, utils_1.attributeValidations) });
                    if (!attribute.type && 'example' in attribute) { // derive type if not specified (optional for actions2)
                        (0, defaults_1.default)(attribute, (0, utils_1.deriveSwaggerTypeFromExample)(attribute.example || attribute.defaultsTo));
                    }
                    if (_in === 'body') {
                        if (!['put', 'post', 'patch'].includes(route.verb)) {
                            sails.log.warn("WARNING: sails-hook-swagger-generator: Route '".concat(route.verb, " ").concat(route.path, "' cannot contain 'requestBody'; ignoring input '").concat(key, " for generated Swagger"));
                            return;
                        }
                        // add to request body if we can do so cleanly
                        if (!pathEntry.requestBody) {
                            pathEntry.requestBody = { content: {} };
                        }
                        if (!('content' in pathEntry.requestBody)) {
                            return; // could be reference --> in which case do not override
                        }
                        var rbc = pathEntry.requestBody.content;
                        if (!rbc['application/json']) {
                            rbc['application/json'] = {};
                        }
                        if (!rbc['application/json'].schema) {
                            rbc['application/json'].schema = { type: 'object', properties: {} };
                        }
                        if ('type' in rbc['application/json'].schema
                            && rbc['application/json'].schema.type === 'object'
                            && rbc['application/json'].schema.properties) {
                            // if not reference and of type 'object' --> consider adding new property (but don't overwrite)
                            (0, defaults_1.default)(rbc['application/json'].schema.properties, (_a = {}, _a[key] = (0, exports.generateAttributeSchema)(attribute), _a));
                        }
                    }
                    else {
                        // otherwise, handle path|query|cookie|header parameters
                        if (isParam(_in, key)) {
                            return;
                        }
                        pathEntry.parameters.push({
                            in: _in,
                            name: key,
                            required: value.required || false,
                            schema: (0, exports.generateAttributeSchema)(attribute),
                            description: description
                        });
                    }
                });
            }
            if ((_c = route.actions2Machine) === null || _c === void 0 ? void 0 : _c.exits) {
                var exitResponses_1 = {};
                // status to determine whether 'content' can be removed in simple cases
                var defaultOnly_1 = {};
                // actions2 may specify more than one 'exit' per 'statusCode' --> use oneOf (and attempt to merge)
                (0, forEach_1.default)(route.actions2Machine.exits, function (exit, exitName) {
                    var _a, _b;
                    if (((_b = (_a = exit.meta) === null || _a === void 0 ? void 0 : _a.swagger) === null || _b === void 0 ? void 0 : _b.exclude) === true) {
                        return;
                    }
                    var _c = type_formatter_1.actions2Responses[exitName] || type_formatter_1.actions2Responses.success, statusCode = _c.statusCode, description = _c.description;
                    var defaultDescription = description;
                    statusCode = exit.statusCode || statusCode;
                    description = exit.description || description;
                    var schema = __assign(__assign({ example: exit.outputExample }, (0, utils_1.deriveSwaggerTypeFromExample)(exit.outputExample || '')), { description: description });
                    // XXX TODO review support for responseType, viewTemplatePath
                    var addToContentJsonSchemaOneOfIfDne = function () {
                        var _a, _b, _c;
                        var r = exitResponses_1[statusCode];
                        // add to response if can do so cleanly
                        if (!r.content)
                            r.content = {};
                        if (!r.content['application/json'])
                            r.content['application/json'] = {};
                        if (!r.content['application/json'].schema)
                            r.content['application/json'].schema = { oneOf: [] };
                        // if schema with 'oneOf' exists, add new schema content
                        var existingSchema = (_b = (_a = r.content) === null || _a === void 0 ? void 0 : _a['application/json']) === null || _b === void 0 ? void 0 : _b.schema;
                        if (existingSchema && 'oneOf' in existingSchema) {
                            (_c = existingSchema.oneOf) === null || _c === void 0 ? void 0 : _c.push(schema);
                        }
                        else {
                            // skip --> custom schema overrides auto-generated
                        }
                    };
                    if (exitResponses_1[statusCode]) {
                        // this statusCode already exists --> add as alternative if 'oneOf' present (or can be cleanly added)
                        addToContentJsonSchemaOneOfIfDne();
                        defaultOnly_1[statusCode] = false;
                    }
                    else if (pathEntry.responses[statusCode]) {
                        // if not exists, check for response defined in source swagger and merge/massage to suit 'application/json' oneOf
                        exitResponses_1[statusCode] = (0, cloneDeep_1.default)(pathEntry.responses[statusCode]);
                        addToContentJsonSchemaOneOfIfDne();
                        defaultOnly_1[statusCode] = false;
                    }
                    else {
                        // dne, so add
                        exitResponses_1[statusCode] = {
                            description: defaultDescription,
                            content: { 'application/json': { schema: { oneOf: [schema] } }, }
                        };
                        defaultOnly_1[statusCode] = exit.outputExample === undefined;
                    }
                });
                // remove oneOf for single entries and move description back to top-level
                (0, forEach_1.default)(exitResponses_1, function (resp, statusCode) {
                    var _a, _b;
                    if ((_b = (_a = resp.content) === null || _a === void 0 ? void 0 : _a['application/json'].schema) === null || _b === void 0 ? void 0 : _b.oneOf) {
                        var arr = resp.content['application/json'].schema.oneOf;
                        if (arr.length === 1) {
                            resp.content['application/json'].schema = arr[0];
                            if ('description' in arr[0])
                                resp.description = arr[0].description;
                            if (defaultOnly_1[statusCode])
                                delete resp.content;
                        }
                    }
                });
                pathEntry.responses = __assign(__assign({}, pathEntry.responses), exitResponses_1);
                (0, forEach_1.default)(pathEntry.responses, function (resp, statusCode) {
                    var _a;
                    if (!resp.description)
                        resp.description = ((_a = exitResponses_1[statusCode]) === null || _a === void 0 ? void 0 : _a.description) || '-';
                });
            }
            // merge actions2 summary and description
            (0, defaults_1.default)(pathEntry, {
                summary: ((_d = route.actions2Machine) === null || _d === void 0 ? void 0 : _d.friendlyName) || undefined,
                description: ((_e = route.actions2Machine) === null || _e === void 0 ? void 0 : _e.description) || undefined,
            });
        } // of if(actions2)
        // handle blueprint actions and related documentation (from model and blueprint template)
        if (route.model && route.blueprintAction) {
            if (((_g = (_f = route.model.swagger) === null || _f === void 0 ? void 0 : _f.modelSchema) === null || _g === void 0 ? void 0 : _g.exclude) === true
                || ((_j = (_h = route.model.swagger.actions) === null || _h === void 0 ? void 0 : _h[route.blueprintAction]) === null || _j === void 0 ? void 0 : _j.exclude) === true) {
                return;
            }
            var template_1 = templates[route.blueprintAction] || {};
            var subst_1 = function (str) { return str ? str.replace('{globalId}', route.model.globalId) : undefined; };
            /* overwrite: summary, description, externalDocs, operationId, tags, requestBody, servers, security
             * merge: parameters (by in+name), responses (by statusCode) */
            if (utils_1.blueprintActions.includes(route.blueprintAction)) {
                pathEntry['x-blueprint'] = true;
            }
            (0, defaults_1.default)(pathEntry, __assign({ summary: subst_1(template_1.summary), description: subst_1(template_1.description), externalDocs: template_1.externalDocs || undefined, tags: ((_k = route.model.swagger.modelSchema) === null || _k === void 0 ? void 0 : _k.tags) || ((_m = (_l = route.model.swagger.actions) === null || _l === void 0 ? void 0 : _l.allactions) === null || _m === void 0 ? void 0 : _m.tags) || [route.model.globalId] }, (0, cloneDeep_1.default)((0, lodash_1.omit)(__assign(__assign({}, ((_o = route.model.swagger.actions) === null || _o === void 0 ? void 0 : _o.allactions) || {}), ((_p = route.model.swagger.actions) === null || _p === void 0 ? void 0 : _p[route.blueprintAction]) || {}), 'exclude'))));
            // merge parameters from model actions and template (in that order)
            (((_r = (_q = route.model.swagger.actions) === null || _q === void 0 ? void 0 : _q[route.blueprintAction]) === null || _r === void 0 ? void 0 : _r.parameters) || []).map(function (p) { return addParamIfDne(p); });
            (((_t = (_s = route.model.swagger.actions) === null || _s === void 0 ? void 0 : _s.allactions) === null || _t === void 0 ? void 0 : _t.parameters) || []).map(function (p) { return addParamIfDne(p); });
            (template_1.parameters || []).map(function (parameter) {
                // handle special case of PK parameter
                if (parameter === 'primaryKeyPathParameter') {
                    var primaryKey = route.model.primaryKey;
                    var attributeInfo = route.model.attributes[primaryKey];
                    var pname = 'ModelPKParam-' + route.model.identity;
                    if (components.parameters && !components.parameters[pname]) {
                        components.parameters[pname] = {
                            in: 'path',
                            name: '_' + primaryKey, // note '_' as per transformSailsPathsToSwaggerPaths()
                            required: true,
                            schema: (0, exports.generateAttributeSchema)(attributeInfo),
                            description: subst_1('The desired **{globalId}** record\'s primary key value'),
                        };
                    }
                    parameter = { $ref: '#/components/parameters/' + pname };
                }
                addParamIfDne(parameter);
            });
            // merge responses from model actions
            (0, defaults_1.default)(pathEntry.responses, (((_v = (_u = route.model.swagger.actions) === null || _u === void 0 ? void 0 : _u[route.blueprintAction]) === null || _v === void 0 ? void 0 : _v.responses) || {}), (((_x = (_w = route.model.swagger.actions) === null || _w === void 0 ? void 0 : _w.allactions) === null || _x === void 0 ? void 0 : _x.responses) || {}));
            var modifiers_1 = {
                addPopulateQueryParam: function () {
                    var _a;
                    var assoc = ((_a = route.model) === null || _a === void 0 ? void 0 : _a.associations) || [];
                    if (isParam('query', 'populate') || assoc.length == 0)
                        return;
                    pathEntry.parameters.push({
                        in: 'query',
                        name: 'populate',
                        required: false,
                        schema: {
                            type: 'string',
                            example: __spreadArray(['false'], (assoc.map(function (row) { return row.alias; }) || []), true).join(','),
                        },
                        description: 'If specified, overide the default automatic population process.'
                            + ' Accepts a comma-separated list of attribute names for which to populate record values,'
                            + ' or specify `false` to have no attributes populated.',
                    });
                },
                addSelectQueryParam: function () {
                    if (isParam('query', 'select'))
                        return;
                    var attributes = route.model.attributes || {};
                    var csv = (0, lodash_1.reduce)(attributes, function (acc, a, n) { var _a, _b; return ((((_b = (_a = a.meta) === null || _a === void 0 ? void 0 : _a.swagger) === null || _b === void 0 ? void 0 : _b.exclude) === true) ? acc : __spreadArray(__spreadArray([], acc, true), [n], false)); }, []);
                    pathEntry.parameters.push({
                        in: 'query',
                        name: 'select',
                        required: false,
                        schema: {
                            type: 'string',
                            example: csv.join(','),
                        },
                        description: 'The attributes to include in the result, specified as a comma-delimited list.'
                            + ' By default, all attributes are selected.'
                            + ' Not valid for plural (“collection”) association attributes.',
                    });
                },
                addOmitQueryParam: function () {
                    if (isParam('query', 'omit'))
                        return;
                    var attributes = route.model.attributes || {};
                    var csv = (0, lodash_1.reduce)(attributes, function (acc, a, n) { var _a, _b; return ((((_b = (_a = a.meta) === null || _a === void 0 ? void 0 : _a.swagger) === null || _b === void 0 ? void 0 : _b.exclude) === true) ? acc : __spreadArray(__spreadArray([], acc, true), [n], false)); }, []);
                    pathEntry.parameters.push({
                        in: 'query',
                        name: 'omit',
                        required: false,
                        schema: {
                            type: 'string',
                            example: csv.join(','),
                        },
                        description: 'The attributes to exclude from the result, specified as a comma-delimited list.'
                            + ' Cannot be used in conjuction with `select`.'
                            + ' Not valid for plural (“collection”) association attributes.',
                    });
                },
                addModelBodyParam: function () {
                    var _a;
                    if (route.isShortcutBlueprintRoute) {
                        var schema = (_a = specification.components.schemas) === null || _a === void 0 ? void 0 : _a[route.model.identity];
                        if (schema) {
                            var resolvedSchema = (0, utils_1.unrollSchema)(specification, schema);
                            if (resolvedSchema) {
                                (0, exports.generateSchemaAsQueryParameters)(resolvedSchema).map(function (p) {
                                    if (isParam('query', p.name))
                                        return;
                                    pathEntry.parameters.push(p);
                                });
                            }
                        }
                    }
                    else {
                        if (pathEntry.requestBody)
                            return;
                        pathEntry.requestBody = {
                            description: subst_1('JSON dictionary representing the {globalId} instance to create.'), // XXX TODO Incorporate model description?
                            required: true,
                            content: {
                                'application/json': {
                                    schema: { '$ref': "#/components/schemas/".concat(route.model.identity) }
                                },
                            },
                        };
                    }
                },
                addModelBodyParamUpdate: function () {
                    var _a;
                    if (route.isShortcutBlueprintRoute) {
                        var schema = (_a = specification.components.schemas) === null || _a === void 0 ? void 0 : _a[route.model.identity + '-without-required-constraint'];
                        if (schema) {
                            var resolvedSchema = (0, utils_1.resolveRef)(specification, schema);
                            if (resolvedSchema) {
                                (0, exports.generateSchemaAsQueryParameters)(resolvedSchema).map(function (p) {
                                    if (isParam('query', p.name))
                                        return;
                                    pathEntry.parameters.push(p);
                                });
                            }
                        }
                    }
                    else {
                        if (pathEntry.requestBody)
                            return;
                        pathEntry.requestBody = {
                            description: subst_1('JSON dictionary representing the {globalId} instance to update.'), // XXX TODO Incorporate model description?
                            required: true,
                            content: {
                                'application/json': {
                                    schema: { '$ref': "#/components/schemas/".concat(route.model.identity, "-without-required-constraint") }
                                },
                            },
                        };
                    }
                },
                addResultOfArrayOfModels: function () {
                    var _a;
                    var pluralIdentity = route.model.identityPlural;
                    (0, defaults_1.default)(pathEntry.responses, {
                        '200': {
                            description: subst_1(template_1.resultDescription || '**{globalId}** records with pagination metadata'),
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: (_a = {},
                                            _a[pluralIdentity] = {
                                                type: 'array',
                                                items: { '$ref': '#/components/schemas/' + route.model.identity },
                                            },
                                            _a.meta = {
                                                type: 'object',
                                                properties: {
                                                    total: { type: 'integer', description: 'Total number of matching records' },
                                                    limit: { type: 'integer', description: 'Maximum number of records returned' },
                                                    skip: { type: 'integer', description: 'Number of records skipped' },
                                                },
                                            },
                                            _a),
                                    },
                                },
                            },
                        }
                    });
                },
                addAssociationPathParam: function () {
                    if (isParam('path', 'association'))
                        return;
                    pathEntry.parameters.splice(1, 0, {
                        in: 'path',
                        name: 'association',
                        required: true,
                        schema: {
                            type: 'string',
                            enum: route.associationAliases,
                        },
                        description: 'The name of the association',
                    });
                },
                addAssociationFKPathParam: function () {
                    if (isParam('path', 'childid'))
                        return; // pre-defined/pre-configured --> skip
                    pathEntry.parameters.push({
                        in: 'path',
                        name: 'childid',
                        required: true,
                        schema: {
                            oneOf: (0, exports.generateModelAssociationFKAttributeSchemas)(route.model, route.associationAliases, models),
                        },
                        description: 'The desired target association record\'s foreign key value'
                    });
                },
                addAssociationResultOfArray: function () {
                    var _a;
                    var associations = ((_a = route.model) === null || _a === void 0 ? void 0 : _a.associations) || [];
                    var models = (route.associationAliases || []).map(function (a) {
                        var assoc = associations.find(function (_assoc) { return _assoc.alias == a; });
                        return assoc ? (assoc.collection || assoc.model) : a;
                    });
                    (0, defaults_1.default)(pathEntry.responses, {
                        '200': {
                            description: subst_1(template_1.resultDescription),
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        // items: { type: 'any' },
                                        items: {
                                            oneOf: (0, lodash_1.uniq)(models).map(function (model) {
                                                return { '$ref': '#/components/schemas/' + model };
                                            }),
                                        },
                                    },
                                },
                            },
                        }
                    });
                },
                addResultOfModel: function () {
                    (0, defaults_1.default)(pathEntry.responses, {
                        '200': {
                            description: subst_1(template_1.resultDescription || '**{globalId}** record'),
                            content: {
                                'application/json': {
                                    schema: { '$ref': '#/components/schemas/' + route.model.identity },
                                },
                            },
                        }
                    });
                },
                addResultNotFound: function () {
                    (0, defaults_1.default)(pathEntry.responses, {
                        '404': { description: subst_1(template_1.notFoundDescription || 'Not found'), }
                    });
                },
                addResultValidationError: function () {
                    (0, defaults_1.default)(pathEntry.responses, {
                        '400': { description: subst_1('Validation errors; details in JSON response'), }
                    });
                },
                addFksBodyParam: function () {
                    if (route.isShortcutBlueprintRoute) {
                        (0, exports.generateModelAssociationFKAttributeParameters)(route.model, route.associationAliases, models).map(function (p) {
                            if (!route.associationAliases || route.associationAliases.indexOf(p.name) < 0)
                                return;
                            if (isParam('query', p.name))
                                return;
                            pathEntry.parameters.push(p);
                        });
                    }
                    else {
                        if (pathEntry.requestBody)
                            return;
                        pathEntry.requestBody = {
                            description: 'The primary key values (usually IDs) of the child records to use as the new members of this collection',
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: {
                                            oneOf: (0, exports.generateModelAssociationFKAttributeSchemas)(route.model, route.associationAliases, models),
                                        }
                                    },
                                },
                            },
                        };
                    }
                },
                addCriteriaWhitelistParams: function () {
                    var _a;
                    var _b;
                    var criteriaWhitelist = (_b = route.model) === null || _b === void 0 ? void 0 : _b.criteriaWhitelist;
                    if (!criteriaWhitelist)
                        return;
                    var hookConfig = sails.config['swagger-generator'] || {};
                    var blueprintConfig = sails.config.blueprints || {};
                    var criteriaDescriptions = hookConfig.criteriaDescriptions || {};
                    // autoCriteriaWhitelist (if attribute exists on model) + model's criteriaWhitelist
                    var autoKeys = [];
                    var autoCriteria = blueprintConfig.autoCriteriaWhitelist || [];
                    autoCriteria.forEach(function (attr) {
                        var _a;
                        if ((_a = route.model.attributes) === null || _a === void 0 ? void 0 : _a[attr])
                            autoKeys.push(attr);
                    });
                    var allCriteria = __spreadArray(__spreadArray([], criteriaWhitelist, true), autoKeys, true);
                    var attributes = route.model.attributes || {};
                    // Build criteria params and prepend them before pagination/common params
                    var criteriaParams = [];
                    allCriteria.forEach(function (name) {
                        if (isParam('query', name))
                            return;
                        var attr = attributes[name];
                        var schema = attr
                            ? (0, cloneDeep_1.default)((0, exports.generateAttributeSchema)(attr, name))
                            : { type: 'string' };
                        // Append date format hint based on attribute type before stripping
                        var formatHints = {
                            'date-time': ' (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss.sssZ`)',
                            'date': ' (`YYYY-MM-DD`)',
                        };
                        var formatHint = schema.format && formatHints[schema.format] || '';
                        // Build description: prefer global criteriaDescriptions, then attribute description, then generic
                        var baseDescription = criteriaDescriptions[name] || schema.description || "Filter by `".concat(name, "`");
                        var description = baseDescription + formatHint;
                        // Clean up schema for use as a query parameter
                        delete schema.description;
                        delete schema.format;
                        // Strip nullability from query params (3.1 type arrays)
                        if (Array.isArray(schema.type)) {
                            schema.type = schema.type.filter(function (t) { return t !== 'null'; });
                            if (schema.type.length === 1)
                                schema.type = schema.type[0];
                        }
                        criteriaParams.push({
                            in: 'query',
                            name: name,
                            required: false,
                            schema: schema,
                            description: description,
                        });
                    });
                    // Prepend criteria params so they appear before pagination/common params
                    (_a = pathEntry.parameters).unshift.apply(_a, criteriaParams);
                    // Inline the WhereQueryParam with model-specific criteria list
                    var whereIdx = pathEntry.parameters.findIndex(function (p) {
                        var resolved = resolveParameterRef(p);
                        return resolved && 'in' in resolved && resolved.in === 'query' && resolved.name === 'where';
                    });
                    if (whereIdx >= 0) {
                        var criteriaList = allCriteria.map(function (c) { return "`".concat(c, "`"); }).join(', ');
                        pathEntry.parameters[whereIdx] = {
                            in: 'query',
                            name: 'where',
                            required: false,
                            schema: { type: 'string' },
                            description: 'A JSON-encoded [Waterline criteria](https://sailsjs.com/documentation/concepts/models-and-orm/query-language)'
                                + " for advanced filtering. Only whitelisted criteria are supported: ".concat(criteriaList, ".")
                                + ' This allows you to take advantage of `contains`, `startsWith`, and'
                                + ' other sub-attribute criteria modifiers for more powerful `find()` queries.'
                                + '\n\ne.g. `?where={"status":1}`',
                        };
                    }
                    // Inline the LimitQueryParam with model-specific defaults
                    var defaultLimit = route.model.standardLimit || blueprintConfig.standardLimit || 30;
                    var maxLimit = route.model.maximumLimit || blueprintConfig.maximumLimit || defaultLimit;
                    var limitIdx = pathEntry.parameters.findIndex(function (p) {
                        var resolved = resolveParameterRef(p);
                        return resolved && 'in' in resolved && resolved.in === 'query' && resolved.name === 'limit';
                    });
                    if (limitIdx >= 0) {
                        pathEntry.parameters[limitIdx] = {
                            in: 'query',
                            name: 'limit',
                            required: false,
                            schema: { type: 'integer', default: defaultLimit, maximum: maxLimit },
                            description: "The maximum number of records to return. Defaults to ".concat(defaultLimit, ", capped at ").concat(maxLimit, "."),
                        };
                    }
                },
                addShortCutBlueprintRouteNote: function () {
                    if (!route.isShortcutBlueprintRoute) {
                        return;
                    }
                    pathEntry.summary += ' *';
                    if (route.blueprintAction === 'replace') {
                        pathEntry.description += "\n\nOnly one of the query parameters, that matches the **association** path parameter, should be specified.";
                    }
                    pathEntry.description += "\n\n(\\*) Note that this is a"
                        + " [Sails blueprint shortcut route](https://sailsjs.com/documentation/concepts/blueprints/blueprint-routes#?shortcut-blueprint-routes)"
                        + " (recommended for **development-mode only**)";
                },
            };
            // apply changes for blueprint action
            (template_1.modifiers || []).map(function (modifier) {
                if ((0, isFunction_1.default)(modifier))
                    modifier(template_1, route, pathEntry, tags, components); // custom modifier
                else
                    modifiers_1[modifier](); // standard modifier
            });
        } // of if (route.model && route.blueprintAction)
        // final populate noting others above
        (0, defaults_1.default)(pathEntry, {
            summary: route.path || '',
            tags: [((_y = route.actions2Machine) === null || _y === void 0 ? void 0 : _y.friendlyName) || route.defaultTagName],
        });
        (0, defaults_1.default)(pathEntry.responses, defaultsValues.responses, { '500': { description: 'Internal server error' } });
        // catch the case where defaultTagName not defined
        if ((0, lodash_1.isEqual)(pathEntry.tags, [undefined]))
            pathEntry.tags = [];
        if (route.variables) {
            // now add patternVariables that don't already exist
            route.variables.map(function (v) {
                var existing = isParam('path', v);
                if (existing)
                    return;
                pathEntry.parameters.push({
                    in: 'path',
                    name: v,
                    required: true,
                    schema: { type: 'string' },
                    description: "Route pattern variable `".concat(v, "`"),
                });
            });
        }
        if (pathEntry.tags) {
            pathEntry.tags.sort();
        }
        (0, set_1.default)(paths, [route.path, route.verb], pathEntry);
    });
    return paths;
};
exports.generatePaths = generatePaths;
var generateDefaultModelTags = function (models) {
    return (0, lodash_1.map)(models, function (model) {
        var _a, _b, _c, _d;
        if (((_b = (_a = model.swagger) === null || _a === void 0 ? void 0 : _a.modelSchema) === null || _b === void 0 ? void 0 : _b.exclude) === true)
            return null;
        var defaultDescription = "CRUD actions for **".concat(model.globalId, "**");
        var tagDef = {
            name: model.globalId,
            description: ((_c = model.swagger.modelSchema) === null || _c === void 0 ? void 0 : _c.description) || defaultDescription,
        };
        if ((_d = model.swagger.modelSchema) === null || _d === void 0 ? void 0 : _d.externalDocs) {
            tagDef.externalDocs = __assign({}, model.swagger.modelSchema.externalDocs);
        }
        return tagDef;
    }).filter(Boolean);
};
exports.generateDefaultModelTags = generateDefaultModelTags;
