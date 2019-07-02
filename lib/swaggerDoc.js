'use strict';
var _ = require('lodash');
var generators = require('./generators');
var fs = require('fs');

module.exports = function (sails, context) {
    if (sails.config[context.configKey].disabled === true) {
        return;
    }

    var specifications = sails.config[context.configKey].swagger;
    specifications.tags = generators.tags(sails.models);
    specifications.definitions = generators.definitions(sails.models);
    specifications.parameters = generators.parameters(sails.config, context);

    var generatedRoutes = generators.routes(sails.controllers, sails.config, specifications.tags);
    specifications.paths = generators.paths(
        generatedRoutes,
        specifications.tags,
        specifications.parameters,
        specifications.definitions,
        sails.config[context.configKey],
    );

    // Remove identity param
    specifications.tags = _.map(specifications.tags, function (tag) {
        delete tag.identity;
        return tag;
    });

    // Make unique
    specifications.tags = [...new Set(specifications.tags.map(item => item.name))];

    // Sort by name
    specifications.tags.sort();

    fs.writeFile(sails.config[context.configKey].swaggerJsonPath, JSON.stringify(specifications), function (err) {
        if (err) {
            return console.log(err);
        }

        console.log("Swagger generated successfully");
    });

    return specifications;

};