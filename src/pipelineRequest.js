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
        const [results, err] = await this._startSeq(this.pipeline.steps, this.initialData);
        if (err){
            return [undefined, err];
        }
        const finalValue = (this.pipeline.extract && Object.keys(this.pipeline.extract).length > 0)
            ? extractor.extract("application/json",results, this.pipeline.extract)
            : results;
        return [finalValue, null];
    }

    /**
     *
     * @param sequence
     * @param initialData
     * @returns {Promise<*|{}>}
     * @private
     */
    async _startSeq(sequence, initialData) {
        let data = initialData || {};
        /// loop thru each node in the sequence
        for (let step in sequence) {
            const [stepData, err] = await this.processStep(sequence[step], data)
            if (err) {
                return [undefined, new Error(`Error processing step: [${sequence[step].name}]: ${err}`)];
            }

            ///TODO Add to History or send to listeners
            const historyItem = {
                name: sequence[step].name,
                statusCode: stepData.statusCode,
            }

            /// combine data from step with previous data
            data = {...data, ...stepData.data};
        }

        return [data];
    }

    /**
     * Process one step of a pipeline.
     *
     * @param step
     * @param data
     * @returns {Promise<*[]|({data, statusCode}|Error)[]>}
     */
    async processStep(step, data) {
        try {
            // use the data from the node in the step to make the HTTP call
            const realData = {...step.node.nodeData, ...data};
            const template = (tpl, args) => tpl.replace(/\${(\w+)}/g, (_, v) => args[v]);
            //console.log(template(step.node.url, realData));

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

            ///  Make the CALL
            return axios({
                method: step.node.method,
                url: url,
                data: payload,
                config: {headers: {'Content-Type': step.node.contentType, ...headers}}
            }).then((response)=>{

                // check to status code

                /// extract data
                const [newData, err] = extractor.extract(
                    step.node.contentType, response.data, step.extract)
                if (err) {
                    return [undefined, err];
                }

                /// create stepData
                const stepData = {
                    data: {...data, ...newData},//just data for now
                    statusCode: response.status
                }
                return [stepData,];

            },(error)=>{

                if (error.response) {
                    if (error.response.status == 404){
                        return [undefined, `Node: [${step.node.name}] Not Found`]
                    }
                    console.log(error.response.data);
                    console.log(error.response.status);
                    console.log(error.response.headers);
                }
                return [undefined, error]
            });
        } catch (e) {
            return [undefined, e];
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
}

module.exports = PipelineRequest;
