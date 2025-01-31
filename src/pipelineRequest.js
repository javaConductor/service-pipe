const misc = require('./misc');
const extractor = require("./extractor");
// const Pipeline = require("./model/pipeline");
const PipelineStep = require("./model/pipe");
// const jmespath = require("jmespath");
const processorManager = require('./processors/processorManager');
const dbRepo = require("./db/data-repo");
const {addTrace, clearTrace} = require('./trace')

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
        if (!pipeline.uuid)
            throw new Error(`PipelineRequest: Bad Pipeline: no uuid`);
        if (!pipeline.steps || pipeline.steps.length === 0)
            throw new Error(`PipelineRequest: Bad Pipeline: no uuid`);
        this.pipeline = pipeline;

        this.pipeline.steps = this.pipeline.steps.map((step) => {
            if (!step.nodeUUID && !step.node) {
                throw new Error(`PipelineRequest: Bad Pipeline: Step: ${step.name}: no node.`);
            }
            return {...step, node: step.node || dbRepo.getNodeByUUID(step.nodeUUID)}
        });

        this.initialData = initialData || {};
    }

    toString() {
        return `[${this.pipeline.name}]:${this.pipeline.uuid}${this.initialData ? ": using: " + JSON.stringify(this.initialData) : ""}`
    }

    /**
     *
     * @returns {Promise<[error, data]>}
     */
    async start() {
        const startTime = Date.now();
        ///////////////////// Create History /////////////////////
        clearTrace()
        addTrace({
            pipeline: this.pipeline.name,
            timestamp: Date.now(),
            message: "Start pipeline.",
            steps: this.pipeline.steps.map((step) => (step.name))
        });

        ///////////////////// Run Pipeline Steps /////////////////////
        ///////////////////// Run Pipeline Steps /////////////////////
        ///////////////////// Run Pipeline Steps /////////////////////
        let [err, results] = await this._startSeq(this.pipeline, this.initialData);
        if (err) {
            const now = Date.now();
            const millis = new Date(now).getTime() - new Date(startTime).getTime();
            addTrace({
                pipeline: this.pipeline.name,
                timestamp: Date.now(),
                pipelineTimeMillis: millis,
                message: "Pipeline completed with error.",
                errorMessage: err,
                state: PipelineStep.StepStates.PIPELINE_COMPLETE_WITH_ERRORS,
                partialData: results
            });
            console.warn(`PipelineRequest.start(): Pipeline:${this.pipeline.name}: Error -> ${JSON.stringify(err)}\n`);
            return [err];
        }

        ///////////////////// Successfully return pipeline output /////////////////////
        //TODO extract values
        if (this.pipeline.extract && misc.hasKeys(this.pipeline.extract)) {
            results = extractor.extract(this.pipeline.contentType || 'application/json', results, this.pipeline.extract);
        }

        console.debug(`PipelineRequest.start: Pipeline: [${this.pipeline.name}]\n
    Results: ${JSON.stringify(results, null, 2)} `);
        return [null, results];
    }//start

    /**
     *
     * @param pipeline Pipeline
     * @param initialData
     * @returns {Promise<[error, stepResults]>}
     * @private
     */
    async _startSeq(pipeline, initialData) {
        const pipelineName = pipeline.name;
        let data = initialData || {};
        let sequence = pipeline.steps;
        ///TODO run the pipeline transformModule.before function on data if exists

        let results = {};
        /// execute each step
        for (let step of sequence) {
            ///////////////////// Get Step Processor /////////////////////
            const stepProcessor = processorManager.getStepProcessor(step);
            if (!stepProcessor) {
                const msg = `No step processor for [${step.name}].`;
                addTrace({
                    pipeline: pipelineName,
                    timestamp: Date.now(),
                    state: PipelineStep.StepStates.ERROR,
                    message: msg,
                    partialData: data
                });
                return [(msg)];
            }
            ``
            ///////////////////// Select Step Processor Function /////////////////////
            const processOrAggregate = step.aggregateStep
                ? stepProcessor.aggregateStep
                : stepProcessor.processStep;

            ///////////////////// Run Step Processor Function /////////////////////
            const [err, stepResults] = await processOrAggregate(
                pipeline,
                step,
                {...data, ...initialData});
            if (err) {
                addTrace({
                    pipeline: pipelineName,
                    timestamp: Date.now(),
                    state: PipelineStep.StepStates.STEP_COMPLETE_WITH_ERRORS,
                    message: `Error in Step [${step.name}]: ${err.toString()} .`,
                    error: err,
                    payload: {...data, ...initialData}
                });
                console.debug(`pipelineRequest._startSeq(): Pipeline:${pipeline.name}: Error in Step:${step.name} -> ${JSON.stringify(err)}`);
                return [err, stepResults];
            }
            addTrace({
                pipeline: pipelineName,
                timestamp: Date.now(),
                state: PipelineStep.StepStates.STEP_COMPLETE,
                message: `Step [${step.name}] is completed.`,
                extracted: stepResults
            });

            /// combine data from step with previous data
            console.debug(`pipelineRequest._startSeq(): Pipeline:${pipeline.name}: Data added from Step:${step.name} -> ${JSON.stringify(stepResults)}`);
            results = {...results, ...stepResults};
            data = {...data, ...stepResults};
        }

        ///TODO run the pipeline transformModule.after function on data if exists
        console.debug(`pipelineRequest._startSeq(): Pipeline:${pipeline.name}: Data added from ${pipeline.steps.length} Step(s): -> ${JSON.stringify(data)}`);
        return [null, results];
    }// _startSeq
}

module.exports = PipelineRequest;
