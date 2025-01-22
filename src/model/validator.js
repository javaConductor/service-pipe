const Joi = require("joi");
const AggregationExtraction = require("../processors/aggregateExtraction");
const authenticationTypes = require("../model/authenticationTypes");
const jsonTypes = require("../model/jsonTypes")
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
            steps: Joi.array().items(this.stepSchema()),
            transformModules: Joi.object().keys({
                before: Joi.object().keys({
                    name: Joi.string().required(),
                    stepFn: Joi.alternatives().try(
                        Joi.function(),
                        Joi.string(),
                    ).required(),
                }),
                after: Joi.object().keys({
                    name: Joi.string().required(),
                    stepFn: Joi.alternatives().try(
                        Joi.function(),
                        Joi.string(),
                    ).required(),

                }),
            }),
        });

        this.nodeSchema = Joi.object().keys({
            _id: Joi.string(),
            uuid: Joi.string().guid({version: 'uuidv4'}),
            name: Joi.string().required(),
            accessType: Joi.string().valid("HTTP").default("HTTP"),
            url: Joi.string().uri(),
            method: Joi.string().valid("POST", "GET", "PUT"),
            contentType: Joi.string(),
            headers: Joi.object(),//.keys([this.httpHeaderName()]),
            authenticationType: Joi.string().valid(
                authenticationTypes.None,
                authenticationTypes.Basic,
                authenticationTypes.Token,
            ),

            authentication: Joi.alternatives()
                .conditional('authenticationType', [
                    {is: authenticationTypes.None, then: Joi.forbidden()},
                    {is: authenticationTypes.Basic, then: this.basicAuthentication()},
                    {is: authenticationTypes.Token, then: this.tokenAuthentication()},
                ]),
            nodeData: Joi.object(),// required data for the node to function
            payload: Joi.object(),// data being sent to the node (perhaps from the previous step)
            extract: Joi.object(),// {key: value} where 'key' is the key to store extracted value
            // and 'value' is the JmsPath location of the data returned from the node
            //.regex(/^\d{3}-\d{3}-\d{4}$/).required(),
            errorIndicators: Joi.array().items(Joi.string()),
            errorMessages: Joi.array().items(Joi.string()),
        });

    }

    stepSchema() {
        return Joi.object().keys({
            name: Joi.string().required(),
            description: Joi.string(),
            nodeUUID: Joi.string().guid({version: 'uuidv4'}),
            data: Joi.alternatives().try(
                Joi.array(),
                Joi.object()
            ),
            singleValueExtract: Joi.boolean(),
            aggregateSingle: Joi.alternatives()
                .conditional('singleValueExtract', [
                    {is: true, then: Joi.object().keys({
                                extractSingleKey: Joi.string(),
                                extractSingleType: Joi.string().valid(
                                    jsonTypes.typeMap.Date,
                                    jsonTypes.typeMap.Object,
                                    jsonTypes.typeMap.Array,
                                    jsonTypes.typeMap.Number,
                                    jsonTypes.typeMap.String,
                                )
                            })},
                    {is: false, then: Joi.optional()}
                ]),
            extract: Joi.object(),
            aggregateStep: Joi.boolean(),
            aggregation: Joi.alternatives()
                .conditional('aggregateStep', [
                    {is: true, then: this.aggregation()},
                    {is: false, then: Joi.object().optional()},
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
}

module
    .exports = new Validator();