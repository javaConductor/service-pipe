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
        let newPipelineHistory = [ {
            timeStamp: Date.now(),
            pipeline: this.pipeline.name,
            message: "Start pipeline.",
            steps: this.pipeline.steps.map((step)=>(step.name))
        }]

        const [results, pipelineHistory, err] = await this._startSeq(this.pipeline.name, this.pipeline.steps, this.initialData);
        if (err) {
            return [undefined, pipelineHistory, err];
        }
        const finalValue = (this.hasKeys( this.pipeline.extract))
            ? extractor.extract("application/json", results, this.pipeline.extract)
            : results;

        newPipelineHistory = [...newPipelineHistory,...pipelineHistory, {
            timeStamp: Date.now(),
            pipeline: this.pipeline.name,
            message: "Data received.",
            extracted: finalValue
        }].map((trace)=>{ return {...trace, timeStamp: new Date(trace.timeStamp)}});
        console.log(`PipelineRequest: Pipeline: [${this.pipeline.name}] History: ${JSON.stringify(newPipelineHistory,null,2)} `);
        return [finalValue, newPipelineHistory, null];
    }

    /**
     *
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
            const [stepData, stepTrace, err] = await this.processStep(pipelineName,sequence[step], data)
            if (err) {
                return [undefined, stepTrace, new Error(`Error processing step: [${sequence[step].name}]: ${err}`)];
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
     * @param step
     * @param data
     * @returns {Promise<*[]|({data, statusCode}|Error)[]>}
     */
    async processStep(pipelineName, step, data) {
        let stepTrace = [];
        try {
            // use the data from the node in the step to make the HTTP call
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
                timeStamp: Date.now(),
                step: step.name,
                nodeName: step.node.name,
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
                    timeStamp: Date.now(),
                    step: step.name,
                    nodeName: step.node.name,
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
                        timeStamp: Date.now(),
                        nodeName: step.node.name,
                        message: `Error extracting data. keys: ${JSON.stringify(Object.keys(step.extract))}`,
                        data: response.data,
                        statusCode: response.status
                    }];
                    return [undefined, stepTrace, err];
                }

                /// create stepData
                const stepData = {
                    data: {...data, ...newData},//just data for now
                    statusCode: response.status
                }
                stepTrace = [...stepTrace, {
                    pipeline: pipelineName,
                    timeStamp: Date.now(),
                    nodeName: step.node.name,
                    message: `Error extracting data. keys: ${JSON.stringify(Object.keys(step.extract))}`,
                    data: response.data,
                    statusCode: response.status
                }];
                return [stepData, stepTrace];

            }, (error) => {

                if (error.response) {
                    stepTrace = [...stepTrace, {
                        pipeline: pipelineName,
                        timeStamp: Date.now(),
                        nodeName: step.node.name,
                        message: `Error contacting node [${step.node.name}]: ${error.message}`,
                        statusCode: error.response.status,
                    }];
                    if (error.response.status == 404) {
                        return [undefined, stepTrace, `Node: [${step.node.name}] Not Found`]
                    }
                }
                return [undefined, stepTrace, error]
            });
        } catch (e) {
            return [undefined, stepTrace, e];
        }
    }

    interpolate(urlTemplate, data) {
        const tFunc = (tpl, args) => tpl.replace(/\${(\w+)}/g, (_, v) => args[v] || '');
        const url = tFunc(urlTemplate, data)
        return url;
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
        } else {
            return this.interpolate(value, data);
        }
    }
    hasKeys(obj){
        if (!obj)
            return false;
        return Object.keys(obj).length > 0;
    }
}

module.exports = PipelineRequest;
