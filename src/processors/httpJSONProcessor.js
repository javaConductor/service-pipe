const StepProcessor = require('./stepProcessor');
const axios = require("axios");
const extractor = require("../extractor");
const Pipeline = require("../model/pipeline");
const misc = require('../misc');

class HttpJSONProcessor extends StepProcessor {

    constructor(processorProps) {
        super(processorProps);
    }

    canProcess(step) {
        return step.node.contentType === "application/json";
    }

    async processStep(pipeline, step, data) {
        const pipelineName = pipeline.name;
        let stepTrace = [];
        try {
            /// use the data from the node in the step to make the HTTP call
            const realData = {...step.node.nodeData, ...data};

            /// create the URL from the step
            const url = misc.interpolate(step.node.url, realData)

            /// create the Header entries from the step data
            let headers = {};
            for (const headerName in step.node.headers) {
                headers[headerName] = misc.interpolate(step.node.headers[headerName], realData)
            }
            ///TODO do something different for strings and objects
            const payload = (typeof step.node.payload === "string")
                ? misc.interpolate(step.node.payload, realData)
                : misc.interpolateObject(step.node.payload, realData);

            stepTrace = [...stepTrace, {
                pipeline: pipelineName,
                step: step.name,
                nodeName: step.node.name,
                nodeURL: url,
                nodeHeaders: headers,
                timeStamp: Date.now(),
                message: "Initiate request.",
                data: payload
            }];

            ///  Make the CALL
            return axios({
                method: step.node.method,
                url: url,
                data: payload,
                config: {headers: {'Content-Type': step.node.contentType, ...headers}}
            }).then((response) => {
                stepTrace = [...stepTrace, {
                    pipeline: pipelineName,
                    step: step.name,
                    nodeName: step.node.name,
                    timeStamp: Date.now(),
                    message: "Request complete.",
                    data: response.data,
                    statusCode: response.status
                }];
                let responseData = response.data;
                /// If extractions are to be done
                if (misc.hasKeys(step.extract)) {
                    /// extract data
                    const [newData, err] = extractor.extract(
                        step.node.contentType, response.data, step.extract);
                    if (err) {
                        stepTrace = [...stepTrace, {
                            pipeline: pipelineName,
                            step: step.name,
                            nodeName: step.node.name,
                            timeStamp: Date.now(),
                            message: `Error extracting data. keys: ${JSON.stringify(Object.keys(step.extract))}`,
                            data: response.data,
                            statusCode: response.status
                        }];

                        return [{...data, ...response.data}, stepTrace, err];
                    }
                    responseData = newData;

                    /// Check for error conditions
                    if (misc.hasKeys(step.node.errorIndicators)) {
                        for (const ind in step.node.errorIndicators) {
                            if (response.data[ind]) {
                                /// loop thru the errorMessages
                                let messages = [];
                                if (misc.hasKeys(step.node.errorMessages)) {
                                    for (const key in step.node.errorMessages) {
                                        const msg = responseData[key];
                                        if (msg && msg.length > 0) {
                                            messages = [...messages, msg];
                                        }
                                    }
                                }

                                stepTrace = [...stepTrace, {
                                    pipeline: pipelineName,
                                    step: step.name,
                                    nodeName: step.node.name,
                                    timeStamp: Date.now(),
                                    message: `Error in response`,
                                    data: response.data,
                                    statusCode: response.status,
                                    responseErrors: messages
                                }];
                                return [{...data, ...response.data}, stepTrace, messages.join(', ')];
                            }
                        }
                    }
                }
                /// create stepData
                const stepData = {
                    //TODO remove ...data
                    data: {...data, ...responseData},//just data for now
                    statusCode: response.status
                }
                return [stepData, stepTrace];

            }, (error) => {
                if (error.response) {
                    if (error.response.status === 404) {
                        stepTrace = [...stepTrace, {
                            pipeline: pipelineName,
                            step: step.name,
                            nodeName: step.node.name,
                            timeStamp: Date.now(),
                            message: `Resource not found.`,
                            error: `${error.message}`,
                            statusCode: error.response.status,
                        }];
                        return [{...data}, stepTrace, `Node: [${step.node.name}] Not Found`];
                    }

                    if (error.response.status === 500) {
                        stepTrace = [...stepTrace, {
                            pipeline: pipelineName,
                            step: step.name,
                            nodeName: step.node.name,
                            timeStamp: Date.now(),
                            message: `Error in resource.`,
                            error: `${error.message}`,
                            statusCode: error.response.status,
                        }];
                        return [{...data}, stepTrace, `Node: [${step.node.name}]: ${error.message}`];
                    }

                    stepTrace = [...stepTrace, {
                        pipeline: pipelineName,
                        step: step.name,
                        nodeName: step.node.name,
                        timeStamp: Date.now(),
                        message: `Error contacting node [${step.node.name}]`,
                        error: `${error.message}`,
                        statusCode: error.response.status,
                    }];
                    return [{...data}, stepTrace, `${error.message}`];
                }
                return [{...data}, stepTrace, error]
            });
        } catch (e) {
            stepTrace = [...stepTrace, {
                pipeline: pipelineName,
                step: step.name,
                nodeName: step.node.name,
                timeStamp: Date.now(),
                message: `Error contacting node [${step.node.name}]`,
                error: `${e.message}`
            }];
            return [{...data}, stepTrace, e];
        }
    }
}

module.exports = HttpJSONProcessor;