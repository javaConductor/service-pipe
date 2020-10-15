import axios from "axios";
import extractor from "./extractor";

class PipelineRequest {

    constructor(pipeline, initialData) {
        this.pipeline = pipeline;
        this.initialData = initialData;
        this.stepHistory = {};// history account by step name
        this.pipelineHistory = [];
    }

    /**
     *
     * @returns {Promise<[data, err]>}
     */
    async start() {
        return this._startSeq(this.pipeline.sequence, this.initialData)
    }

    async _startSeq(sequence, initialData) {

        let data = initialData || {};
        /// loop thru each node in the sequence
        for (let step in sequence) {

            const [stepData, err] = await this.processStep(step, data)
            if (err) {
                throw new Error(`Error processing step: ${step.name}`)
            }

            return data;
        }
    }

    /**
     * Process one step of a pipeline.
     *
     * @param step
     * @param data
     * @returns {Promise<*[]|({data, statusCode}|Error)[]>}
     */
    async processStep(step, data) {

        // use the data from the node in the step to make the HTTP call
        const realData = {...step.node.nodeData, ...data};

        const template = (tpl, args) => tpl.replace(/\${(\w+)}/g, (_, v) => args[v]);

        console.log(template(step.node.url, realData));

        /// create the URL from the step
        const url = this.interpolate(step.node.url, realData)

        /// create the Header entries from the step data
        let headers = {};
        for (const headerName in step.node.headers) {
            headers[headerName] = this.interpolate(step.node.headers[headerName], realData)
        }

        const payload = this.interpolate(step.node.payload, realData);

        try {
            const response = await axios({
                method: step.node.method,
                url: url,
                data: payload,
                config: {headers: {'Content-Type': step.node.contentType, ...headers}}
            });

            /*
            *    const stepDataSample = {
        previousData: {},
        data: {},
        executionStart: Date(),
        executionLength: 1000,// millis
        statusCode: 200
    } */
            /// extract data
            const [newData, err] = extractor.extract(step.node.contentType, response.data, step.node.extract)
            if (err) {
                return [undefined, err];
            }

            /// create stepData
            const stepData = {
                data: {...data, ...newData},//just data for now
                statusCode: response.status
            }
            return [stepData, new Error("")];

        } catch (e) {
            return [undefined, e];
        }

    }

    interpolate(urlTemplate, data) {
        const tFunc = (tpl, args) => tpl.replace(/\${(\w+)}/g, (_, v) => args[v] || '');
        const url = tFunc(urlTemplate, data)
        return url;
    }


}