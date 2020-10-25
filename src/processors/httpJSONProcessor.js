const StepProcessor = require('./stepProcessor');
const PipelineStep = require('../model/pipelineStep');
const axios = require("axios");
const extractor = require("../extractor");
const misc = require('../misc');
const jsonTypes = require('../model/jsonTypes');
const jmespath = require("jmespath");

class HttpJSONProcessor extends StepProcessor {

    constructor(processorProps) {
        super(processorProps);
        this.stepType = PipelineStep.StepTypes.HTTP_JSON;
        this.processStep = this.processStep.bind(this);
        this.aggregateStep = this.aggregateStep.bind(this);
        this.basicAuthHeader = this.basicAuthHeader.bind(this);
    }

    canProcess(step) {
        return step.node.contentType === "application/json";
    }

    async aggregateStep(pipeline, step, data){
        const pipelineName = pipeline.name;
        /// get the dataArrayProperty
        const dataArrayKey = step.dataArrayProperty;
        const dataOutputKey = step.outputArrayProperty;
        const aggregateExtract = step.aggregateExtract;

        let stepTrace = [];
        let value = data[dataArrayKey];

        if (!jsonTypes.validate("array:", value)){
            stepTrace = [...stepTrace, {
                pipeline: pipelineName,
                step: step.name,
                nodeName: step.node.name,
                timeStamp: Date.now(),
                state: "error",
                message: `Error in data.`,
                error: `Field [${dataArrayKey}] is not an array.`
            }];
            return [data, stepTrace, `Field [${dataArrayKey}] is not an array.`];
        }

        let aggResults = [];
        let cnt = 0;
        for (const idx in value){
            ++cnt;
            let aggValue;
            if ( aggregateExtract ){
                aggValue = jmespath.search(value[idx], aggregateExtract.dataPath);
            }else
                aggValue = data[dataArrayKey];

            const aggData = {...data, [dataArrayKey]:undefined, [aggregateExtract.aggKey]: aggValue }

            console.log(`Passing element ${JSON.stringify( aggData, null, 2 )}`);

            const [results, sequenceHistory, err] = await this.processStep(pipeline, step, aggData);
            if (err) {
                stepTrace = [...stepTrace, ...sequenceHistory, {
                    pipeline: pipelineName,
                    step: step.name,
                    nodeName: step.node.name,
                    timeStamp: Date.now(),
                    message: err,
                    data: {...data, ...results},
                    index: cnt
                }];
                return [{...data, ...results}, stepTrace, err];
            }
            aggResults = [...aggResults, aggData];
            stepTrace = [...stepTrace, ...sequenceHistory];
        }

        stepTrace = [...stepTrace, {
            pipeline: pipelineName,
            step: step.name,
            nodeName: step.node.name,
            timeStamp: Date.now(),
            message: `Error in response`,
            data: {...data, [dataOutputKey]:aggResults},
            count:cnt,
        }];
        const stepData = {
            data:  {...data, [dataOutputKey]:aggResults}
        }
        return [stepData, stepTrace];
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

            let authHeaders = {};
            /// Add auth headers if any
            if (step.node.authentication && step.node.authentication.basic){
                authHeaders = {Authorization: this.basicAuthHeader(step.node.authentication.basic.username,step.node.authentication.basic.password)};
            }

            ///  Make the CALL
            return axios({
                method: step.node.method,
                url: url,
                data: payload,
                config: {headers: {'Content-Type': step.node.contentType, ...headers, ...authHeaders}}
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
                    /// if the first and only value is a datatype designation(string:,object:,array:)
                    // alone then
                    // validate the type and assignn it the data as [key]
                    if (Object.keys(step.extract).length === 1) {
                        const name = Object.keys(step.extract)[0];
                        const value = step.extract[name];
                        if (jsonTypes.isType(value)) {

                            /// create stepData
                            const stepData = {
                                //TODO remove ...data
                                data:  responseData,//just data for now
                                statusCode: response.status
                            }

                            if (!jsonTypes.validate(value, responseData) && responseData) {
                                const errMsg = `Type [${typeof responseData}] does not match extract designation [${value}]`;
                                stepTrace = [...stepTrace, {
                                    pipeline: pipelineName,
                                    step: step.name,
                                    nodeName: step.node.name,
                                    timeStamp: Date.now(),
                                    message: `Extract datatype mismatch`,
                                    error: errMsg
                                }];
                                return [stepData, stepTrace, errMsg]
                            } else {
                                stepData.data = {[name]: responseData}
                                return [stepData, stepTrace];
                            }
                        }
                    }

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
                            error: `${error.message}\n${JSON.stringify(error.stack,null,2)}`,
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
                            error: `${error.message}\n${JSON.stringify(error.stack,null,2)}`,
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
                        error: `${error.message}\n${JSON.stringify(error.stack,null,2)}`,
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
                error: `${e.message}\n${JSON.stringify(e.stack,null,2)}`
            }];
            return [{...data}, stepTrace, e];
        }
    }

    basicAuthHeader(user, password)
    {
        const token = user + ":" + password;
        let buff = new Buffer(token);
        let hash = buff.toString('base64');

        return "Basic " + hash;
    }

}

module.exports = HttpJSONProcessor;