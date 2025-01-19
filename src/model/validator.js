const Joi = require("joi");
const AggregationExtraction = require("../processors/aggregateExtraction");
const Pipeline = require("../model/pipeline");

class Validator {

    constructor() {

        this.pipelineSchema = Joi.object().keys({
            _id: Joi.string(),
            name: Joi.string().required(),
            uuid: Joi.string().guid({version: 'uuidv4'}),
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
            name: Joi.string().required(),
            accessType: Joi.string().valid("HTTP").default("HTTP"),
            uuid: Joi.string().guid({version: 'uuidv4'}),
            url: Joi.string().uri(),
            method: Joi.string().valid("POST", "GET", "PUT"),
            contentType: Joi.string(),
            headers: Joi.object().keys([this.httpHeaderName()]),
            authentication: this.authentication(),
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
            extract: Joi.object(),
            aggregateStep: Joi.boolean(),
            //    a: Joi.any().when('b', { is: 5, then: Joi.required(), otherwise: Joi.optional() }),
            aggregation: Joi.alternatives()
                .conditional('aggregateStep', [
                    {is: true, then: this.aggregation()},
                    {is: false, then: Joi.object()},

                ])

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
            dataArrayProperty: Joi.string().required(),
            outputArrayProperty: Joi.string().required(),
            aggregateExtract: Joi.object().keys({
                "aggDataKey": Joi.string().required(),
                }
            ),

    });
    }

    authentication() {
        return Joi.object().keys({
            basic: Joi.object().keys({
                username: Joi.string().required(),
                password: Joi.string().required(),
            }),
        });
    }

    httpHeaderName() {
        return Joi.string();//.regex(/([\\w-]+): (.*)/g);
    }

    /**
     *
     * @param pipelineDoc
     * @returns {err, pipelineDoc}
     */
    validatePipeline(pipelineDoc) {
        return this.pipelineSchema.validate(pipelineDoc);
    }

    /**
     *
     * @param nodeDoc
     * @returns {err, nodeDoc}
     */
    validateNodeDoc(nodeDoc) {
        return this.nodeSchema.validate(nodeDoc);
    }
}

module
    .exports = new Validator();