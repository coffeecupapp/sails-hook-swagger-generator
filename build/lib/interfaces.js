"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MiddlewareType = exports.Modifiers = void 0;
var Modifiers;
(function (Modifiers) {
    Modifiers["ADD_POPULATE_QUERY_PARAM"] = "addPopulateQueryParam";
    Modifiers["ADD_SELECT_QUERY_PARAM"] = "addSelectQueryParam";
    Modifiers["ADD_OMIT_QUERY_PARAM"] = "addOmitQueryParam";
    Modifiers["ADD_MODEL_BODY_PARAM"] = "addModelBodyParam";
    Modifiers["ADD_MODEL_BODY_PARAM_UPDATE"] = "addModelBodyParamUpdate";
    Modifiers["ADD_RESULT_OF_ARRAY_OF_MODELS"] = "addResultOfArrayOfModels";
    Modifiers["ADD_ASSOCIATION_PATH_PARAM"] = "addAssociationPathParam";
    Modifiers["ADD_ASSOCIATION_FK_PATH_PARAM"] = "addAssociationFKPathParam";
    Modifiers["ADD_ASSOCIATION_RESULT_OF_ARRAY"] = "addAssociationResultOfArray";
    Modifiers["ADD_RESULT_OF_MODEL"] = "addResultOfModel";
    Modifiers["ADD_RESULT_NOT_FOUND"] = "addResultNotFound";
    Modifiers["ADD_RESULT_VALIDATION_ERROR"] = "addResultValidationError";
    Modifiers["ADD_FKS_BODY_PARAM"] = "addFksBodyParam";
    Modifiers["ADD_SHORTCUT_BLUEPRINT_ROUTE_NOTE"] = "addShortCutBlueprintRouteNote";
    Modifiers["ADD_CRITERIA_WHITELIST_PARAMS"] = "addCriteriaWhitelistParams";
})(Modifiers || (exports.Modifiers = Modifiers = {}));
var MiddlewareType;
(function (MiddlewareType) {
    MiddlewareType["BLUEPRINT"] = "BLUEPRINT";
    MiddlewareType["ACTION"] = "ACTION";
})(MiddlewareType || (exports.MiddlewareType = MiddlewareType = {}));
