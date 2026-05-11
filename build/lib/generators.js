"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDefaultModelTags = exports.generatePaths = exports.generateSchemas = exports.generateSchemaAsQueryParameters = exports.generateModelAssociationFKAttributeParameters = exports.generateModelAssociationFKAttributeSchemas = exports.generateAttributeSchema = void 0;
const type_formatter_1 = require("./type-formatter");
const assign_1 = __importDefault(require("lodash/assign"));
const defaults_1 = __importDefault(require("lodash/defaults"));
const mapKeys_1 = __importDefault(require("lodash/mapKeys"));
const pick_1 = __importDefault(require("lodash/pick"));
const keys_1 = __importDefault(require("lodash/keys"));
const cloneDeep_1 = __importDefault(require("lodash/cloneDeep"));
const isFunction_1 = __importDefault(require("lodash/isFunction"));
const forEach_1 = __importDefault(require("lodash/forEach"));
const set_1 = __importDefault(require("lodash/set"));
const lodash_1 = require("lodash");
const utils_1 = require("./utils");
/**
 * Generate Swagger schema content describing the specified Sails attribute.
 *
 * XXX TODO: add test to this function
 *
 * @see https://swagger.io/docs/specification/data-models/
 * @param {Record<string, any>} attribute Sails model attribute specification as per `Model.js` file
 */
const generateAttributeSchema = (attribute, attributeName, resolveGlobalId, jsonSchema) => {
    const ai = attribute || {}, sts = type_formatter_1.swaggerTypes;
    const type = ai.type || 'string';
    const columnType = ai.autoMigrations?.columnType || ai.columnType;
    const autoIncrement = ai.autoMigrations?.autoIncrement;
    let schema = {};
    const formatDesc = (extra) => {
        const ret = [];
        if (extra)
            ret.push(extra);
        if (ai.description)
            ret.push(ai.description);
        return ret.join('. ');
    };
    if (jsonSchema) {
        (0, assign_1.default)(schema, jsonSchema);
    }
    else if (ai.meta?.swagger && 'type' in ai.meta.swagger) {
        // OpenAPI 3 stipulates NO type as 'any', allow this by 'type' present but null to achieve this
        if (ai.meta.swagger.type)
            schema.type = ai.meta.swagger.type;
    }
    else if (ai.model) {
        const displayName = resolveGlobalId ? resolveGlobalId(ai.model) : ai.model;
        (0, assign_1.default)(schema, {
            ...sts.integer,
            description: formatDesc(`ID of the associated **${displayName}** record`),
        });
    }
    else if (ai.collection) {
        const displayName = resolveGlobalId ? resolveGlobalId(ai.collection) : ai.collection;
        (0, assign_1.default)(schema, {
            description: formatDesc(`Array of **${displayName}**'s or array of FK's when creating / updating / not populated`),
            type: 'array',
            items: { '$ref': '#/components/schemas/' + ai.collection },
        });
    }
    else if (type == 'number') {
        let t = autoIncrement ? sts.integer : sts.double;
        // Infer integer from isIn values (e.g. status: { isIn: [0, 1] })
        const isInValues = ai.validations?.isIn || ai.isIn;
        const allIntegers = Array.isArray(isInValues) && isInValues.length > 0
            && isInValues.every((v) => typeof v === 'number' && Number.isInteger(v));
        if (ai.validations?.isInteger || allIntegers) {
            t = sts.integer;
        }
        else if (columnType) {
            const ct = columnType;
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
        let t;
        if (columnType) {
            const ct = columnType;
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
            const name = attributeName || ai.columnName;
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
    let isIP = false;
    if (schema.type == 'string') {
        const v = ai.validations;
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
    (0, defaults_1.default)(schema, (0, mapKeys_1.default)((0, pick_1.default)(ai, (0, keys_1.default)(type_formatter_1.sailsAttributePropertiesMap)), (v, k) => type_formatter_1.sailsAttributePropertiesMap[k]));
    // process Sails --> Swagger attribute mappings as per validationsMap
    (0, defaults_1.default)(schema, (0, mapKeys_1.default)((0, pick_1.default)(ai.validations, (0, keys_1.default)(type_formatter_1.validationsMap)), (v, k) => type_formatter_1.validationsMap[k]));
    // OpenAPI 3.1: convert enum array to oneOf + const + title when TS enum object is provided
    const enumObj = ai.meta?.enum || ai.meta?.swagger?.enum;
    if (enumObj && schema.enum) {
        const isNumeric = schema.enum.some((v) => typeof v === 'number');
        schema.oneOf = schema.enum.map(value => {
            let title;
            if (isNumeric) {
                // numeric enum: reverse mapping gives us the name
                title = enumObj[value];
            }
            else {
                // string enum: find key by value
                title = Object.keys(enumObj).find(k => enumObj[k] === value) || String(value);
            }
            return { const: value, title };
        });
        delete schema.enum;
        delete schema.type;
        delete schema.format;
    }
    // skip copying default into example; swagger-ui displays default separately
    // and duplicating it as example causes redundant display for truthy defaults
    // process final autoMigrations: unique
    if (ai.autoMigrations?.unique) {
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
    // Pick up attribute description if not already set by type-specific logic
    if (ai.description && !schema.description)
        schema.description = ai.description;
    if (schema.description)
        schema.description = schema.description.trim();
    // note: required --> required[] (not here, needs to be done at model level)
    // finally, overwrite in custom swagger
    if (ai.meta?.swagger) {
        // note: 'type' handled above
        (0, assign_1.default)(schema, (0, lodash_1.omit)(ai.meta.swagger, 'exclude', 'type', 'in', 'enum'));
    }
    // OpenAPI 3.1: convert nullable to type array
    if (schema.nullable === true && schema.type) {
        schema.type = [schema.type, 'null'];
    }
    delete schema.nullable;
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
const generateModelAssociationFKAttributeSchemas = (model, aliasesToInclude, models) => {
    if (!model.associations) {
        return [];
    }
    return model.associations.map(association => {
        if (!aliasesToInclude || aliasesToInclude.indexOf(association.alias) < 0)
            return;
        const targetModelIdentity = association.type === 'model' ? association.model : association.collection;
        const targetModel = models[targetModelIdentity];
        if (!targetModel) {
            return; // data structure integrity issue should not occur
        }
        const description = association.type === 'model' ?
            `**${model.globalId}** record's foreign key value to use as the replacement for this attribute`
            : `**${model.globalId}** record's foreign key values to use as the replacement for this collection`;
        const targetFKAttribute = targetModel.attributes[targetModel.primaryKey];
        return (0, exports.generateAttributeSchema)({
            ...targetFKAttribute,
            autoMigrations: {
                ...(targetFKAttribute.autoMigrations || {}),
                autoIncrement: false, // autoIncrement not relevant for FK parameter
            },
            description: `${description} (**${association.alias}** association${targetFKAttribute.description ? '; ' + targetFKAttribute.description : ''})`
        });
    })
        .filter(parameter => parameter);
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
const generateModelAssociationFKAttributeParameters = (model, aliasesToInclude, models) => {
    if (!model.associations) {
        return [];
    }
    return model.associations.map(association => {
        if (!aliasesToInclude || aliasesToInclude.indexOf(association.alias) < 0)
            return;
        const targetModelIdentity = association.type === 'model' ? association.model : association.collection;
        const targetModel = models[targetModelIdentity];
        if (!targetModel) {
            return; // data structure integrity issue should not occur
        }
        const description = association.type === 'model' ?
            `**${model.globalId}** record's foreign key value to use as the replacement for this attribute`
            : `**${model.globalId}** record's foreign key values to use as the replacement for this collection`;
        const targetFKAttribute = targetModel.attributes[targetModel.primaryKey];
        const targetFKAttributeSchema = (0, exports.generateAttributeSchema)({
            ...targetFKAttribute,
            autoMigrations: {
                ...(targetFKAttribute.autoMigrations || {}),
                autoIncrement: false, // autoIncrement not relevant for FK parameter
            },
            description: `${description} (**${association.alias}** association${targetFKAttribute.description ? '; ' + targetFKAttribute.description : ''})`
        });
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
        .filter(parameter => parameter);
};
exports.generateModelAssociationFKAttributeParameters = generateModelAssociationFKAttributeParameters;
const generateSchemaAsQueryParameters = (schema) => {
    const required = schema.required || [];
    return (0, lodash_1.map)(schema.properties || {}, (property, name) => {
        const parameter = {
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
const generateSchemas = (models) => {
    const resolveGlobalId = (identity) => models[identity]?.globalId || identity;
    return Object.keys(models)
        .reduce((schemas, identity) => {
        const model = models[identity];
        if (model.swagger?.modelSchema?.exclude === true) {
            return schemas;
        }
        const schemaWithoutRequired = {
            type: 'object',
            description: model.swagger.modelSchema?.description || `Aerion model **${model.globalId}**`,
            properties: {},
            ...(0, lodash_1.omit)(model.swagger?.modelSchema || {}, 'exclude', 'description', 'required', 'tags'),
        };
        let required = [];
        const attributes = model.attributes || {};
        const excludeAttributes = [
            ...(model.hiddenAttributes || []),
            ...(model.swagger?.modelSchema?.excludeAttributes || []),
        ];
        (0, defaults_1.default)(schemaWithoutRequired.properties, Object.keys(attributes).reduce((props, attributeName) => {
            const attribute = model.attributes[attributeName];
            const excluded = attribute.meta?.swagger?.exclude === true
                || excludeAttributes.indexOf(attributeName) >= 0
                || attributeName.startsWith('_')
                || !!attribute.collection;
            if (!excluded) {
                const jsonSchema = model.jsonSchemas?.[attributeName];
                const attrSchema = (0, exports.generateAttributeSchema)(attribute, attributeName, resolveGlobalId, jsonSchema);
                // Mark Waterline-managed attributes as read-only so consumers (incl. LLMs) don't try
                // to write them on create/update. The framework sets these regardless of input.
                // Also mark anything the model declares in `readOnlyAttributes` — fields that are
                // settable on create but rejected on update.
                if (attributeName === model.primaryKey
                    || attribute.autoCreatedAt === true
                    || attribute.autoUpdatedAt === true
                    || (model.readOnlyAttributes || []).indexOf(attributeName) >= 0) {
                    attrSchema.readOnly = true;
                }
                props[attributeName] = attrSchema;
                if (attribute.required)
                    required.push(attributeName);
            }
            return props;
        }, {}));
        const withoutRequiredName = `${model.identity}-without-required-constraint`;
        const schema = {
            type: 'object',
            allOf: [
                { '$ref': `#/components/schemas/${withoutRequiredName}` },
            ],
        };
        if (model.swagger?.modelSchema?.required) {
            required = [...model.swagger.modelSchema.required];
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
const generatePaths = (routes, templates, defaultsValues, specification, models, sails) => {
    const resolveGlobalId = (identity) => models[identity]?.globalId || identity;
    const paths = {};
    const tags = specification.tags;
    const components = specification.components;
    if (!components.parameters) {
        components.parameters = {};
    }
    (0, forEach_1.default)(routes, route => {
        if (route.swagger?.exclude === true) {
            return;
        }
        /* overwrite: summary, description, externalDocs, operationId, tags, requestBody, servers, security
         * merge: parameters (by in+name), responses (by statusCode) */
        const pathEntry = {
            summary: undefined,
            description: undefined,
            externalDocs: undefined,
            operationId: undefined,
            tags: undefined,
            parameters: [],
            responses: {},
            ...(0, cloneDeep_1.default)((0, lodash_1.omit)(route.swagger || {}, 'exclude')),
        };
        const resolveParameterRef = (p) => {
            const specWithDefaultParametersToBeMerged = {
                components: { parameters: type_formatter_1.blueprintParameterTemplates }
            };
            // resolve first with current spec, then try template params to be added later
            return ((0, utils_1.resolveRef)(specification, p) || (0, utils_1.resolveRef)(specWithDefaultParametersToBeMerged, p));
        };
        const isParam = (inType, name) => {
            return !!pathEntry.parameters
                .map(parameter => resolveParameterRef(parameter))
                .find(parameter => parameter && 'in' in parameter && parameter.in == inType && parameter.name == name);
        };
        const addParamIfDne = (p) => {
            const resolved = resolveParameterRef(p);
            if (resolved && 'in' in resolved) {
                if (!isParam(resolved.in, resolved.name)) {
                    pathEntry.parameters.push(p);
                }
            }
        };
        if (route.actionType === 'actions2') {
            // note: check before blueprint template as these may override template for specific action(s)
            const patternVariables = route.variables || [];
            if (route.actions2Machine?.inputs) {
                (0, forEach_1.default)(route.actions2Machine.inputs, (value, key) => {
                    if (value.meta?.swagger?.exclude === true) {
                        return;
                    }
                    let _in = value.meta?.swagger?.in;
                    if (!_in) {
                        _in = patternVariables.indexOf(key) >= 0 ? 'path' : 'query';
                    }
                    // compose attribute definition
                    const { description, ..._attribute } = value;
                    const attribute = {
                        ...(0, lodash_1.omit)(_attribute, utils_1.attributeValidations),
                        validations: (0, pick_1.default)(_attribute, utils_1.attributeValidations),
                    };
                    if (!attribute.type && 'example' in attribute) { // derive type if not specified (optional for actions2)
                        (0, defaults_1.default)(attribute, (0, utils_1.deriveSwaggerTypeFromExample)(attribute.example || attribute.defaultsTo));
                    }
                    if (_in === 'body') {
                        if (!['put', 'post', 'patch'].includes(route.verb)) {
                            sails.log.warn(`WARNING: sails-hook-swagger-generator: Route '${route.verb} ${route.path}' cannot contain 'requestBody'; ignoring input '${key} for generated Swagger`);
                            return;
                        }
                        // add to request body if we can do so cleanly
                        if (!pathEntry.requestBody) {
                            pathEntry.requestBody = { content: {} };
                        }
                        if (!('content' in pathEntry.requestBody)) {
                            return; // could be reference --> in which case do not override
                        }
                        const rbc = pathEntry.requestBody.content;
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
                            (0, defaults_1.default)(rbc['application/json'].schema.properties, { [key]: (0, exports.generateAttributeSchema)(attribute) });
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
                            description
                        });
                    }
                });
            }
            if (route.actions2Machine?.exits) {
                const exitResponses = {};
                // status to determine whether 'content' can be removed in simple cases
                const defaultOnly = {};
                // actions2 may specify more than one 'exit' per 'statusCode' --> use oneOf (and attempt to merge)
                (0, forEach_1.default)(route.actions2Machine.exits, (exit, exitName) => {
                    if (exit.meta?.swagger?.exclude === true) {
                        return;
                    }
                    let { statusCode, description } = type_formatter_1.actions2Responses[exitName] || type_formatter_1.actions2Responses.success;
                    const defaultDescription = description;
                    statusCode = exit.statusCode || statusCode;
                    description = exit.description || description;
                    const schema = {
                        example: exit.outputExample,
                        ...(0, utils_1.deriveSwaggerTypeFromExample)(exit.outputExample || ''),
                        description: description,
                    };
                    // XXX TODO review support for responseType, viewTemplatePath
                    const addToContentJsonSchemaOneOfIfDne = () => {
                        const r = exitResponses[statusCode];
                        // add to response if can do so cleanly
                        if (!r.content)
                            r.content = {};
                        if (!r.content['application/json'])
                            r.content['application/json'] = {};
                        if (!r.content['application/json'].schema)
                            r.content['application/json'].schema = { oneOf: [] };
                        // if schema with 'oneOf' exists, add new schema content
                        const existingSchema = r.content?.['application/json']?.schema;
                        if (existingSchema && 'oneOf' in existingSchema) {
                            existingSchema.oneOf?.push(schema);
                        }
                        else {
                            // skip --> custom schema overrides auto-generated
                        }
                    };
                    if (exitResponses[statusCode]) {
                        // this statusCode already exists --> add as alternative if 'oneOf' present (or can be cleanly added)
                        addToContentJsonSchemaOneOfIfDne();
                        defaultOnly[statusCode] = false;
                    }
                    else if (pathEntry.responses[statusCode]) {
                        // if not exists, check for response defined in source swagger and merge/massage to suit 'application/json' oneOf
                        exitResponses[statusCode] = (0, cloneDeep_1.default)(pathEntry.responses[statusCode]);
                        addToContentJsonSchemaOneOfIfDne();
                        defaultOnly[statusCode] = false;
                    }
                    else {
                        // dne, so add
                        exitResponses[statusCode] = {
                            description: defaultDescription,
                            content: { 'application/json': { schema: { oneOf: [schema] } }, }
                        };
                        defaultOnly[statusCode] = exit.outputExample === undefined;
                    }
                });
                // remove oneOf for single entries and move description back to top-level
                (0, forEach_1.default)(exitResponses, (resp, statusCode) => {
                    if (resp.content?.['application/json'].schema?.oneOf) {
                        const arr = resp.content['application/json'].schema.oneOf;
                        if (arr.length === 1) {
                            resp.content['application/json'].schema = arr[0];
                            if ('description' in arr[0])
                                resp.description = arr[0].description;
                            if (defaultOnly[statusCode])
                                delete resp.content;
                        }
                    }
                });
                pathEntry.responses = {
                    ...pathEntry.responses,
                    ...exitResponses,
                };
                (0, forEach_1.default)(pathEntry.responses, (resp, statusCode) => {
                    if (!resp.description)
                        resp.description = exitResponses[statusCode]?.description || '-';
                });
            }
            // merge actions2 summary and description
            (0, defaults_1.default)(pathEntry, {
                summary: route.actions2Machine?.friendlyName || undefined,
                description: route.actions2Machine?.description || undefined,
            });
        } // of if(actions2)
        // handle blueprint actions and related documentation (from model and blueprint template)
        if (route.model && route.blueprintAction) {
            const isBlueprint = utils_1.blueprintActions.includes(route.blueprintAction);
            if ((route.model.swagger?.modelSchema?.exclude === true && isBlueprint)
                || route.model.swagger.actions?.[route.blueprintAction]?.exclude === true) {
                return;
            }
            const template = templates[route.blueprintAction] || {};
            const subst = (str) => str ? str.replace('{globalId}', route.model.globalId) : undefined;
            /* overwrite: summary, description, externalDocs, operationId, tags, requestBody, servers, security
             * merge: parameters (by in+name), responses (by statusCode) */
            // Mark actual blueprint CRUD operations with x-blueprint for downstream classification
            // (used by swagger-doc.ts to generate tag descriptions based on operation types)
            if (isBlueprint) {
                pathEntry['x-blueprint'] = true;
            }
            const allactionsOverride = route.model.swagger.actions?.allactions || {};
            const actionOverride = route.model.swagger.actions?.[route.blueprintAction] || {};
            const mergedOverride = (0, cloneDeep_1.default)((0, lodash_1.omit)({
                ...allactionsOverride,
                ...actionOverride,
            }, 'exclude', 'descriptionAppendix'));
            // Append per-action descriptionAppendix to either user-supplied description or template default.
            const descriptionAppendix = actionOverride.descriptionAppendix ?? allactionsOverride.descriptionAppendix;
            if (descriptionAppendix) {
                const baseDescription = mergedOverride.description ?? subst(template.description);
                mergedOverride.description = baseDescription
                    ? `${baseDescription}\n\n${descriptionAppendix}`
                    : descriptionAppendix;
            }
            (0, defaults_1.default)(pathEntry, {
                summary: subst(template.summary),
                description: subst(template.description),
                externalDocs: template.externalDocs || undefined,
                tags: route.model.swagger.modelSchema?.tags || route.model.swagger.actions?.allactions?.tags || [route.model.globalId],
                ...mergedOverride,
            });
            // merge parameters from model actions and template (in that order)
            (route.model.swagger.actions?.[route.blueprintAction]?.parameters || []).map(p => addParamIfDne(p));
            (route.model.swagger.actions?.allactions?.parameters || []).map(p => addParamIfDne(p));
            (template.parameters || []).map(parameter => {
                // handle special case of PK parameter
                if (parameter === 'primaryKeyPathParameter') {
                    const primaryKey = route.model.primaryKey;
                    const attributeInfo = route.model.attributes[primaryKey];
                    const pname = 'ModelPKParam-' + route.model.identity;
                    if (components.parameters && !components.parameters[pname]) {
                        components.parameters[pname] = {
                            in: 'path',
                            name: primaryKey,
                            required: true,
                            schema: (0, exports.generateAttributeSchema)(attributeInfo),
                            description: subst('The desired **{globalId}** record\'s primary key value'),
                        };
                    }
                    parameter = { $ref: '#/components/parameters/' + pname };
                }
                addParamIfDne(parameter);
            });
            // merge responses from model actions
            (0, defaults_1.default)(pathEntry.responses, (route.model.swagger.actions?.[route.blueprintAction]?.responses || {}), (route.model.swagger.actions?.allactions?.responses || {}));
            const modifiers = {
                addPopulateQueryParam: () => {
                    // Aerion uses a custom, opt-in populate mechanism: each model declares an explicit
                    // `populateable: [...]` whitelist, and the find blueprint accepts exactly one of those
                    // names at a time. Records are side-loaded at the top level of the response under the
                    // related model's plural identity (JSON:API compound-document style), not nested into
                    // each row. Models without `populateable` don't support the param at all.
                    const populateable = route.model?.populateable ?? [];
                    if (isParam('query', 'populate') || populateable.length === 0)
                        return;
                    pathEntry.parameters.push({
                        in: 'query',
                        name: 'populate',
                        required: false,
                        schema: {
                            type: 'string',
                            enum: populateable,
                        },
                        description: 'Populate a related record by association name. Single association only —'
                            + ' pass exactly one of the listed values, not a comma-separated list. Populated'
                            + ' records are side-loaded at the top level of the response under the related'
                            + ' model\'s plural identity, not nested into each row.',
                    });
                },
                addSelectQueryParam: () => {
                    if (isParam('query', 'select'))
                        return;
                    const attributes = route.model.attributes || {};
                    const csv = (0, lodash_1.reduce)(attributes, (acc, a, n) => ((a.meta?.swagger?.exclude === true) ? acc : [...acc, n]), []);
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
                addOmitQueryParam: () => {
                    if (isParam('query', 'omit'))
                        return;
                    const attributes = route.model.attributes || {};
                    const csv = (0, lodash_1.reduce)(attributes, (acc, a, n) => ((a.meta?.swagger?.exclude === true) ? acc : [...acc, n]), []);
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
                addModelBodyParam: () => {
                    if (route.isShortcutBlueprintRoute) {
                        const schema = specification.components.schemas?.[route.model.identity];
                        if (schema) {
                            const resolvedSchema = (0, utils_1.unrollSchema)(specification, schema);
                            if (resolvedSchema) {
                                (0, exports.generateSchemaAsQueryParameters)(resolvedSchema).map(p => {
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
                        const identity = route.model.identity;
                        const wrapperKey = route.model._identity || identity;
                        pathEntry.requestBody = {
                            description: subst('JSON dictionary representing the {globalId} instance to create.\n\n**Important:** The request body must be wrapped in a `' + wrapperKey + '` key — e.g. `{"' + wrapperKey + '": {…}}`.'),
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: [wrapperKey],
                                        properties: {
                                            [wrapperKey]: { '$ref': `#/components/schemas/${identity}` }
                                        },
                                    },
                                },
                            },
                        };
                    }
                },
                addModelBodyParamUpdate: () => {
                    if (route.isShortcutBlueprintRoute) {
                        const schema = specification.components.schemas?.[route.model.identity + '-without-required-constraint'];
                        if (schema) {
                            const resolvedSchema = (0, utils_1.resolveRef)(specification, schema);
                            if (resolvedSchema) {
                                (0, exports.generateSchemaAsQueryParameters)(resolvedSchema).map(p => {
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
                        const identity = route.model.identity;
                        const wrapperKey = route.model._identity || identity;
                        pathEntry.requestBody = {
                            description: subst('JSON dictionary representing the {globalId} fields to update.\n\n**Important:** The request body must be wrapped in a `' + wrapperKey + '` key — e.g. `{"' + wrapperKey + '": {…}}`. All fields are optional — only included fields will be modified.'),
                            required: true,
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        required: [wrapperKey],
                                        properties: {
                                            [wrapperKey]: { '$ref': `#/components/schemas/${identity}` }
                                        },
                                    },
                                },
                            },
                        };
                    }
                },
                addResultOfArrayOfModels: () => {
                    const pluralIdentity = route.model.identityPlural;
                    (0, defaults_1.default)(pathEntry.responses, {
                        '200': {
                            description: subst(template.resultDescription || '**{globalId}** records with pagination metadata'),
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            [pluralIdentity]: {
                                                type: 'array',
                                                items: { '$ref': '#/components/schemas/' + route.model.identity },
                                            },
                                            meta: {
                                                type: 'object',
                                                properties: {
                                                    total: { type: 'integer', description: 'Total number of matching records' },
                                                    limit: { type: 'integer', description: 'Maximum number of records returned' },
                                                    skip: { type: 'integer', description: 'Number of records skipped' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        }
                    });
                },
                addAssociationPathParam: () => {
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
                addAssociationFKPathParam: () => {
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
                addAssociationResultOfArray: () => {
                    const associations = route.model?.associations || [];
                    const models = (route.associationAliases || []).map(a => {
                        const assoc = associations.find(_assoc => _assoc.alias == a);
                        return assoc ? (assoc.collection || assoc.model) : a;
                    });
                    (0, defaults_1.default)(pathEntry.responses, {
                        '200': {
                            description: subst(template.resultDescription),
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        // items: { type: 'any' },
                                        items: {
                                            oneOf: (0, lodash_1.uniq)(models).map(model => {
                                                return { '$ref': '#/components/schemas/' + model };
                                            }),
                                        },
                                    },
                                },
                            },
                        }
                    });
                },
                addResultOfModel: () => {
                    const identity = route.model.identity;
                    const wrapperKey = route.model._identity || identity;
                    (0, defaults_1.default)(pathEntry.responses, {
                        '200': {
                            description: subst(template.resultDescription || '**{globalId}** record'),
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            [wrapperKey]: { '$ref': '#/components/schemas/' + identity },
                                        },
                                    },
                                },
                            },
                        }
                    });
                },
                addResultNotFound: () => {
                    (0, defaults_1.default)(pathEntry.responses, {
                        '404': { description: subst(template.notFoundDescription || 'Not found'), }
                    });
                },
                addResultValidationError: () => {
                    (0, defaults_1.default)(pathEntry.responses, {
                        '400': { description: subst('Validation errors; details in JSON response'), }
                    });
                },
                addFksBodyParam: () => {
                    if (route.isShortcutBlueprintRoute) {
                        (0, exports.generateModelAssociationFKAttributeParameters)(route.model, route.associationAliases, models).map(p => {
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
                addCriteriaWhitelistParams: () => {
                    const criteriaWhitelist = route.model?.criteriaWhitelist;
                    if (!criteriaWhitelist)
                        return;
                    const hookConfig = sails.config['swagger-generator'] || {};
                    const blueprintConfig = sails.config.blueprints || {};
                    const criteriaDescriptions = hookConfig.criteriaDescriptions || {};
                    // autoCriteriaWhitelist (if attribute exists on model) + model's criteriaWhitelist
                    const autoKeys = [];
                    const autoCriteria = blueprintConfig.autoCriteriaWhitelist || [];
                    autoCriteria.forEach(attr => {
                        if (route.model.attributes?.[attr])
                            autoKeys.push(attr);
                    });
                    const allCriteria = [...new Set([...criteriaWhitelist, ...autoKeys])];
                    const attributes = route.model.attributes || {};
                    // Build criteria params and prepend them before pagination/common params
                    const criteriaParams = [];
                    allCriteria.forEach(name => {
                        if (isParam('query', name))
                            return;
                        const attr = attributes[name];
                        const schema = attr
                            ? (0, cloneDeep_1.default)((0, exports.generateAttributeSchema)(attr, name, resolveGlobalId))
                            : { type: 'string' };
                        // Append date format hint based on attribute type before stripping
                        const formatHints = {
                            'date-time': ' (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss.sssZ`)',
                            'date': ' (`YYYY-MM-DD`)',
                        };
                        const formatHint = schema.format && formatHints[schema.format] || '';
                        const isDateField = schema.format === 'date' || schema.format === 'date-time';
                        const dateNote = isDateField ? '. This is an **exact match** filter; for range queries (greater than, less than), use the `where` parameter instead' : '';
                        // Build description: prefer global criteriaDescriptions, then attribute description, then generic
                        const baseDescription = criteriaDescriptions[name] || schema.description || `Filter by \`${name}\``;
                        const description = baseDescription + formatHint + dateNote;
                        // Clean up schema for use as a query parameter
                        delete schema.description;
                        delete schema.format;
                        // Strip nullability from query params (3.1 type arrays)
                        if (Array.isArray(schema.type)) {
                            schema.type = schema.type.filter(t => t !== 'null');
                            if (schema.type.length === 1)
                                schema.type = schema.type[0];
                        }
                        criteriaParams.push({
                            in: 'query',
                            name,
                            required: false,
                            schema,
                            description,
                        });
                    });
                    // Prepend criteria params so they appear before pagination/common params
                    pathEntry.parameters.unshift(...criteriaParams);
                    // Inline the WhereQueryParam with model-specific criteria list
                    const whereIdx = pathEntry.parameters.findIndex(p => {
                        const resolved = resolveParameterRef(p);
                        return resolved && 'in' in resolved && resolved.in === 'query' && resolved.name === 'where';
                    });
                    if (whereIdx >= 0) {
                        const criteriaList = allCriteria.map(c => `\`${c}\``).join(', ');
                        const containsColumns = [
                            ...(route.model.fulltextColumns || []),
                            ...(route.model.likeColumns || []),
                        ];
                        const containsLine = containsColumns.length
                            ? `The \`contains\` modifier is only supported on: ${containsColumns.map(c => `\`${c}\``).join(', ')}.`
                            : 'The `contains` modifier is not supported on this model.';
                        pathEntry.parameters[whereIdx] = {
                            in: 'query',
                            name: 'where',
                            required: false,
                            schema: { type: 'string' },
                            description: 'A JSON-encoded [Waterline criteria](https://sailsjs.com/documentation/concepts/models-and-orm/query-language)'
                                + ` for advanced filtering. Only whitelisted criteria are supported: ${criteriaList}.`
                                + ' Sub-attribute modifiers such as `startsWith`, `>=`, `<=`, `>`, `<`, and `!=` are supported on any whitelisted criterion.'
                                + ` ${containsLine}`
                                + (() => {
                                    const now = new Date();
                                    const y = now.getFullYear();
                                    const m = String(now.getMonth() + 1).padStart(2, '0');
                                    const m2 = String(now.getMonth() + 2).padStart(2, '0');
                                    return `\n\ne.g. \`?where={"startDate":{">=":"${y}-${m}-01","<":"${y}-${m2}-01"}}\``;
                                })(),
                        };
                    }
                    // Inline the LimitQueryParam with model-specific defaults
                    const defaultLimit = route.model.standardLimit || blueprintConfig.standardLimit || 30;
                    const maxLimit = route.model.maximumLimit || blueprintConfig.maximumLimit || defaultLimit;
                    const limitIdx = pathEntry.parameters.findIndex(p => {
                        const resolved = resolveParameterRef(p);
                        return resolved && 'in' in resolved && resolved.in === 'query' && resolved.name === 'limit';
                    });
                    if (limitIdx >= 0) {
                        pathEntry.parameters[limitIdx] = {
                            in: 'query',
                            name: 'limit',
                            required: false,
                            schema: { type: 'integer', default: defaultLimit, maximum: maxLimit },
                            description: `The maximum number of records to return. Defaults to ${defaultLimit}, capped at ${maxLimit}.`,
                        };
                    }
                },
                addShortCutBlueprintRouteNote: () => {
                    if (!route.isShortcutBlueprintRoute) {
                        return;
                    }
                    pathEntry.summary += ' *';
                    if (route.blueprintAction === 'replace') {
                        pathEntry.description += `\n\nOnly one of the query parameters, that matches the **association** path parameter, should be specified.`;
                    }
                    pathEntry.description += `\n\n(\\*) Note that this is a`
                        + ` [Sails blueprint shortcut route](https://sailsjs.com/documentation/concepts/blueprints/blueprint-routes#?shortcut-blueprint-routes)`
                        + ` (recommended for **development-mode only**)`;
                },
            };
            // apply changes for blueprint action
            (template.modifiers || []).map(modifier => {
                if ((0, isFunction_1.default)(modifier))
                    modifier(template, route, pathEntry, tags, components); // custom modifier
                else
                    modifiers[modifier](); // standard modifier
            });
        } // of if (route.model && route.blueprintAction)
        // final populate noting others above
        (0, defaults_1.default)(pathEntry, {
            summary: route.path || '',
            tags: [route.actions2Machine?.friendlyName || route.defaultTagName],
        });
        (0, defaults_1.default)(pathEntry.responses, defaultsValues.responses, { '500': { description: 'Internal server error' } });
        // catch the case where defaultTagName not defined
        if ((0, lodash_1.isEqual)(pathEntry.tags, [undefined]))
            pathEntry.tags = [];
        if (route.variables) {
            // now add patternVariables that don't already exist
            route.variables.map(v => {
                const existing = isParam('path', v);
                if (existing)
                    return;
                pathEntry.parameters.push({
                    in: 'path',
                    name: v,
                    required: true,
                    schema: { type: 'string' },
                    description: `Route pattern variable \`${v}\``,
                });
            });
            // Drop path parameters that don't appear in this route's URL template.
            // Path parameters declared on the controller may belong to a sibling
            // route bound to the same action — they're invalid OpenAPI on this URL.
            pathEntry.parameters = pathEntry.parameters.filter(p => {
                const resolved = resolveParameterRef(p);
                if (!resolved || !('in' in resolved) || resolved.in !== 'path')
                    return true;
                return route.variables.indexOf(resolved.name) >= 0;
            });
        }
        if (pathEntry.tags) {
            pathEntry.tags.sort();
        }
        // Synthesize operationId if not set. Blueprints use <identity>_<action>;
        // custom routes use <verb>_<normalized-path> to disambiguate sibling bindings.
        if (!pathEntry.operationId) {
            if (route.model && route.blueprintAction) {
                pathEntry.operationId = `${route.model.identity}_${route.blueprintAction}`;
            }
            else {
                const cleanPath = route.path
                    .replace(/^\//, '')
                    .replace(/\{([^}]+)\}/g, 'by_$1')
                    .replace(/[/_-]+/g, '_');
                pathEntry.operationId = `${route.verb}_${cleanPath}`;
            }
        }
        (0, set_1.default)(paths, [route.path, route.verb], pathEntry);
    });
    return paths;
};
exports.generatePaths = generatePaths;
const generateDefaultModelTags = (models) => {
    return (0, lodash_1.map)(models, model => {
        if (model.swagger?.modelSchema?.exclude === true)
            return null;
        const defaultDescription = `CRUD actions for **${model.globalId}**`;
        const tagDef = {
            name: model.globalId,
            description: model.swagger.modelSchema?.description || defaultDescription,
        };
        if (model.swagger.modelSchema?.externalDocs) {
            tagDef.externalDocs = { ...model.swagger.modelSchema.externalDocs };
        }
        return tagDef;
    }).filter(Boolean);
};
exports.generateDefaultModelTags = generateDefaultModelTags;
