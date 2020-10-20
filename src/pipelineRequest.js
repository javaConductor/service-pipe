const axios = require("axios");
const extractor = require("./extractor");
const Pipeline = require("./model/pipeline");
const jmespath = require("jmespath")

/**
 *
 */
class PipelineRequest {

    /**
     *
     * @param pipeline {Pipeline}
     * @param initialData Data from request
     */
    constructor(pipeline, initialData) {
        this.pipeline = pipeline;
        this.initialData = initialData;
        this.pipelineHistory = [];
    }

    /**
     *
     * @returns {Promise<[*][]>}
     */
    async start() {
        const startTime = Date.now();
        let pipelineHistory = [{
            pipeline: this.pipeline.name,
            timeStamp: startTime,
            message: "Start pipeline.",
            steps: this.pipeline.steps.map((step) => (step.name))
        }]

        const [results, sequenceHistory, err] = await this._startSeq(this.pipeline.name, this.pipeline.steps, this.initialData);
        if (err) {
            const now = Date.now();
            const millis = new Date(now).getTime() - new Date(startTime).getTime();
            //TODO Maybe return the data extracted so far
            const history = [...pipelineHistory, ...sequenceHistory, {
                pipeline: this.pipeline.name,
                timeStamp: now,
                executionTimeMillis: millis,
                message: "Pipeline completed with error.",
                errorMessage: err,
                partialData: results
            }].map((trace) => ({...trace, timeStamp: new Date(trace.timeStamp)}));

            console.log(`PipelineRequest: Pipeline: [${this.pipeline.name}]\nTrace: ${JSON.stringify(history, null, 2)} `);
            return [undefined, history, err];
        }
        const finalValue = (this.hasKeys(this.pipeline.extract))
            //TODO need to get this contentType
            ? extractor.extract("application/json", results, this.pipeline.extract)
            : results;

        const now = Date.now();
        const millis = new Date(now).getTime() - new Date(startTime).getTime();
        pipelineHistory = [...pipelineHistory, ...sequenceHistory, {
            pipeline: this.pipeline.name,
            timeStamp: now,
            executionTimeMillis: millis,
            message: "Pipeline complete.",
            extracted: finalValue
        }].map((trace) => {
            return {...trace, timeStamp: new Date(trace.timeStamp)}
        });
        console.log(`PipelineRequest: Pipeline: [${this.pipeline.name}]\nTrace: ${JSON.stringify(pipelineHistory, null, 2)} `);
        return [finalValue, pipelineHistory, null];
    }

    /**
     *
     * @param pipelineName
     * @param sequence
     * @param initialData
     * @returns {Promise<*|{}>}
     * @private
     */
    async _startSeq(pipelineName, sequence, initialData) {

        let pipelineHistory = [];
        let data = initialData || {};
        /// loop thru each node in the sequence
        for (let step in sequence) {
            const [stepData, stepTrace, err] = await this.processStep(pipelineName, sequence[step], data)
            if (err) {
                return [stepData, stepTrace, (`${err}`)];
            }

            ///TODO Add to History or send to listeners
            pipelineHistory = [...pipelineHistory, ...stepTrace];
            /// combine data from step with previous data
            data = {...data, ...stepData.data};
        }

        return [data, pipelineHistory];
    }

    /**
     * Process one step of a pipeline.
     *
     * @param pipelineName
     * @param step
     * @param data
     * @returns {Promise<*[]|({data, statusCode}|Error)[]>}
     */
    async processStep(pipelineName, step, data) {
        let stepTrace = [];
        try {
            /// use the data from the node in the step to make the HTTP call
            const realData = {...step.node.nodeData, ...data};

            /// create the URL from the step
            const url = this.interpolate(step.node.url, realData)

            /// create the Header entries from the step data
            let headers = {};
            for (const headerName in step.node.headers) {
                headers[headerName] = this.interpolate(step.node.headers[headerName], realData)
            }
            ///TODO do something different for strings and objects
            const payload = (typeof step.node.payload === "string")
                ? this.interpolate(step.node.payload, realData)
                : this.interpolateObject(step.node.payload, realData);

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
                /// extract data
                const [newData, err] = extractor.extract(
                    step.node.contentType, response.data, step.extract)
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

                /// Check for error conditions
                if (this.hasKeys(step.node.errorIndicators)) {
                    for (const ind in step.node.errorIndicators) {
                        if (response.data[ind]) {
                            /// loop thru the errorMessages
                            let messages = [];
                            if (this.hasKeys(step.node.errorMessages)) {
                                for (const key in step.node.errorMessages) {
                                    const msg = response.data[key];
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

                /// create stepData
                const stepData = {
                    data: {...data, ...newData},//just data for now
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

    interpolate(urlTemplate, data) {
        const tFunc = (tpl, args) => tpl.replace(/\${(\w+)}/g, (_, v) => args[v] || '');
        return tFunc(urlTemplate, data);
    }

    interpolateObject(obj, realData) {
        return Object.keys(obj).reduce((result, key) => {
            const value = (typeof obj[key] === "string")
                ? this.interpolateValue(obj[key], realData)
                : obj[key];
            return {...result, [key]: value}
        }, {});
    }

    interpolateValue(value, data) {
        if (value.startsWith('object:')) {
            const valueName = value.substr(7);
            return jmespath.search(data, valueName);
        } else if (value.startsWith('array:')) {
            const valueName = value.substr(6);
            return jmespath.search(data, valueName);
        } else if (value.startsWith('string:')) {
            const valueName = value.substr(7);
            return jmespath.search(data, valueName);
        } else {
            return this.interpolate(value, data);
        }
    }

    hasKeys(obj) {
        if (!obj)
            return false;
        return Object.keys(obj).length > 0;
    }
}

module.exports = PipelineRequest;
