const Joi = require("joi");
const AggregationExtraction = require("../processors/aggregateExtraction");
const authenticationTypes = require("../model/authenticationTypes");
const jsonTypes = require("../model/jsonTypes")
const {Constants} = require("../misc");
const misc = require("../misc");

let extractObject = Joi.object().keys({
    destinationElement: Joi.string().required(),
    sourceJmesPath: Joi.string().required(),
})


class Validator {

    constructor() {
        const Pipeline = require("../model/pipeline");

        this.pipelineSchema = Joi.object().keys({
            _id: Joi.string(),
            uuid: Joi.string().guid({version: 'uuidv4'}),
            name: Joi.string().required(),
            status: Joi.string().valid(
                Pipeline.Status.Active,
                Pipeline.Status.New),
            contentType: Joi.string(),
            //.regex(/^\d{3}-\d{3}-\d{4}$/).required(),
            inputExtract: Joi.array().items(extractObject),
            extract: Joi.array().items(extractObject),
            steps: Joi.array().items(this.stepSchema()),
            transformModules: Joi.object().keys({
                before: this.transformModule().optional(),
                after: this.transformModule().optional(),
            }),
            owner_user: Joi.string()
                .custom((value, helper) => {
                    if (!misc.validUsername(value) && value !== misc.Constants.PUBLIC_USER) {
                        return helper.message("Invalid username for owner_user");
                    }
                    return value;
                })
        });

        this.nodeSchema = Joi.object().keys({
            _id: Joi.string(),
            uuid: Joi.string().guid({version: 'uuidv4'}),
            name: Joi.string().required(),
            accessType: Joi.string().valid("HTTP").default("HTTP"),
            url: Joi.string(),
            method: Joi.string().valid(...Constants.HTTP_METHODS),
            contentType: Joi.string(),
            headers: Joi.object(),//.keys([this.httpHeaderName()]),
            authenticationType: Joi.string().valid(...(authenticationTypes.list),
                // authenticationTypes.None,
                // authenticationTypes.Basic,
                // authenticationTypes.Token,
            ),

            authentication: Joi.alternatives()
                .conditional('authenticationType', [
                    {is: authenticationTypes.None, then: Joi.forbidden()},
                    {is: authenticationTypes.Basic, then: this.basicAuthentication()},
                    {is: authenticationTypes.Token, then: this.tokenAuthentication()},
                ]),
            nodeData: Joi.object(),// required data for the node to function
            payload: Joi.object(),// data being sent to the node (perhaps from the previous step)
            extract: Joi.array().items(extractObject),// {key: extracted element, value:jmesPath where 'key' is the key to store extracted value
            transformModules: Joi.object().keys({
                before: this.transformModule().optional(),
                after: this.transformModule().optional(),
            }),
            owner_user: Joi.string()
                .custom((value, helper) => {
                    if (!misc.validUsername(value) && value !== misc.Constants.PUBLIC_USER) {
                        return helper.message("Invalid username for owner_user");
                    }
                    return value;
                }),
            // and 'value' is the JmsPath location of the data returned from the node
            //.regex(/^\d{3}-\d{3}-\d{4}$/).required(),
            errorIndicators: Joi.array().items(Joi.string()),
            errorMessages: Joi.array().items(Joi.string()),
        });
    }

    transformModule() {
        return Joi.object().keys({
            stepFnSrc: Joi.string().allow('').optional(),//.message("Must add function source")

        }).optional()
    }

    stepSchema() {
        return Joi.object().keys({
            name: Joi.string().required(),
            description: Joi.string(),
            nodeUUID: Joi.string().guid({version: 'uuidv4'}),
            node: Joi.optional(),
            data: Joi.alternatives().try(
                Joi.array(),
                Joi.object()
            ),
            extract: Joi.array().items(extractObject),// {key: extracted element, value:jmesPath where 'key' is the key to store extracted value
            inputExtract: Joi.array().items(extractObject),
            aggregateStep: Joi.boolean(),
            aggregation: Joi.alternatives()
                .conditional('aggregateStep', [
                    {is: true, then: this.aggregation(), otherwise: Joi.optional()},
                ]),

        });
    }

    aggregateExtract() {
        return Joi.object().keys({
            aggDataKey: Joi.string().required(),
            aggExtractionType: Joi.string().valid(
                AggregationExtraction.Types.AsObject,
                AggregationExtraction.Types.AsArray,
                AggregationExtraction.Types.AsNormal),
        });
    }

    aggregation() {
        return Joi.object().keys({

            aggExtractionType: Joi.string().valid(
                AggregationExtraction.Types.AsNormal,
                AggregationExtraction.Types.AsArray,
                AggregationExtraction.Types.AsObject
            ),
            dataArrayProperty: Joi.string().required(),
            outputArrayProperty: Joi.string().required(),
            aggregateExtract: Joi.object().keys({
                    "aggDataKey": Joi.string().required(),
                }
            ),
        });
    }

    basicAuthentication() {
        return Joi.object().keys({
            basic: Joi.object().keys({
                username: Joi.string().required(),
                password: Joi.string().required(),
            }),
        });
    }

    tokenAuthentication() {
        return Joi.object().keys({
            token: Joi.string().required(),
        });

    }

    httpHeaderName() {
        return Joi.string();//.regex(/([\\w-]+): (.*)/g);
    }

    /**
     *  Validates pipeline properties
     *
     * @param pipelineDoc
     * @returns {(Object)}
     */
    validatePipeline(pipelineDoc) {
        return this.pipelineSchema.validate(pipelineDoc);
    }

    /**
     * Validates node properties
     *
     * @param nodeDoc
     * @returns {(Object)}
     */
    validateNodeDoc(nodeDoc) {
        return this.nodeSchema.validate(nodeDoc);
    }


    /**
     * Validates step/pipe properties
     *
     * @param stepDoc
     * @returns {Joi.ValidationResult<any>}
     */
    validateStepDoc(stepDoc) {
        return this.stepSchema().validate(stepDoc);
    }
}

module.exports = new Validator();
