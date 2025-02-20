const extractor = require("./extractor");
const PipelineStep = require("./model/pipe");
const processorManager = require('./processors/processorManager');
const dbRepo = require("./db/data-repo");
const transformer = require('./processors/transformer');

/**
 *
 */
class PipelineRequest {

    /**
     *
     * @param pipeline {Pipeline}
     * @param initialData Data from request
     * @param pipelineExecution
     */
    constructor(pipeline, initialData, pipelineExecution) {
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

        if (!pipelineExecution){
            throw new Error(`PipelineRequest: pipelineExecution is required`);
        }
        this.pipelineExecution = pipelineExecution;
        this.initialData = initialData || {};
    }

    toString() {
        return `[${this.pipeline.name}]:${this.pipeline.uuid}${this.initialData ? ": using: " + JSON.stringify(this.initialData) : ""}`
    }

    /**
     *
     * @param step
     * @returns {Promise<[error, data]>}
     * */
    async start(step = null) {
        const startTime = Date.now();
        const {addTrace, clearTrace} = this.pipelineExecution.trace

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
        let [err, results] = await this._startSeq(this.pipeline, this.initialData, this.pipelineExecution);
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
        [results, err] = extractor.extract(this.pipeline.contentType || 'application/json',
            results,
            this.pipeline.extract);
        if (err) {
            const now = Date.now();
            const millis = new Date(now).getTime() - new Date(startTime).getTime();
            addTrace({
                pipeline: this.pipeline.name,
                timestamp: Date.now(),
                pipelineTimeMillis: millis,
                message: "Pipeline completed with data extraction error.",
                errorMessage: err,
                state: PipelineStep.StepStates.PIPELINE_COMPLETE_WITH_ERRORS,
                extract: this.pipeline.extract,
                partialData: results
            });
            console.warn(`PipelineRequest.start(): Pipeline:${this.pipeline.name}: Error -> ${JSON.stringify(err)}\n`);
            return [err];
        }


        ///////////////////// Post process stepResults /////////////////////
        let postProcessedResults;
        try {
             postProcessedResults = transformer.postProcessPipelineResults(this.pipeline,
                this.pipeline.transformModules,
                results);
        }catch (ppErr){
            addTrace({
                pipeline: this.pipeline.name,
                timestamp: Date.now(),
                state: PipelineStep.StepStates.PIPELINE_COMPLETE_WITH_ERRORS,
                message: `Post Process Error: ${ppErr.toString()}.`,
                error: ppErr,
                data: results,
            });
            return [ppErr];
        }

        console.debug(`PipelineRequest.start: Pipeline: [${this.pipeline.name}]\n
    Results: ${JSON.stringify(postProcessedResults, null, 2)} `);
        return [null, postProcessedResults];
    }//start


    /**
     *
     * @param pipeline
     * @param step
     * @param stepData
     * @param pipelineExecution
     * @returns {Promise<[string, results]>}
     * */
    async executeStep(pipeline, step, stepData, pipelineExecution) {
        return this._startStep(pipeline, step, stepData,pipelineExecution);
    }


    /**
     *
     * @param pipeline Pipeline
     * @param initialData
     * @param pipelineExecution
     * @returns {Promise<[error, stepResults]>}
     * @private
     */
    async _startSeq(pipeline, initialData, pipelineExecution) {
        const pipelineName = pipeline.name;
        let data = initialData || {};
        let sequence = pipeline.steps;
        ///TODO run the pipeline transformModule.before function on data if exists
        let results = {};

        const {addTrace} = pipelineExecution.trace;
        try {
            ///////////////////// execute each step /////////////////////
            ///////////////////// execute each step /////////////////////
            ///////////////////// execute each step /////////////////////


            for (let step of sequence) {
                const [err, stepResults] = await this._startStep(pipeline, step, data, pipelineExecution);
                if (err) {
                    addTrace({
                        pipeline: pipelineName,
                        timestamp: Date.now(),
                        state: PipelineStep.StepStates.STEP_COMPLETE_WITH_ERRORS,
                        message: `Error in Step [${step.name}]: ${err.toString()} .`,
                        error: err,
                        payload: {...data, ...initialData}
                    });
                    return [err];

                }

                /// combine data from step with previous data
                console.debug(`pipelineRequest._startSeq(): 
                        Pipeline:${pipeline.name}: 
                        Data added from Step:${step.name} -> ${JSON.stringify(stepResults)}`);

                results = {...results, ...stepResults};
                /// combine data from step with previous data
                data = {...data, ...stepResults};

                addTrace({
                    pipeline: pipelineName,
                    timestamp: Date.now(),
                    state: PipelineStep.StepStates.STEP_COMPLETE,
                    message: `Step [${step.name}] is completed.`,
                    extracted: stepResults
                });

            }// for each step

            ///////////////////// Extract values from stepResults /////////////////////
            ///////////////////// Extract values from stepResults /////////////////////
            const [extractedData, extractErr] = extractor.extract(
                pipeline.contentType || 'application/json',
                results,
                pipeline.extract);

            ///////////////////// Report extract error if Any /////////////////////
            ///////////////////// Report extract error if Any /////////////////////
            if (extractErr) {
                addTrace({
                    pipeline: pipelineName,
                    timestamp: Date.now(),
                    state: PipelineStep.StepStates.PIPELINE_COMPLETE_WITH_ERRORS,
                    message: ` ${extractErr.toString()}.`,
                    error: extractErr,
                    data: results,
                    extract: pipeline.extract
                });
                return [extractErr];
            }

            return [null, extractedData];
        } catch (e) {
            return [e.toString()];
        }
    }

    /**
     *
     * @param pipeline
     * @param step
     * @param data
     * @param pipelineExecution
     * @returns {Promise<[string, stepResults]>}
     * @private
     */
    async _startStep(pipeline, step, data, pipelineExecution) {
        const pipelineName = pipeline.name;
        const {addTrace} = pipelineExecution.trace;

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

        ///////////////////// Select Step Processor Function /////////////////////
        const processOrAggregate = step.aggregateStep
            ? stepProcessor.aggregateStep
            : stepProcessor.processStep;

        ///////////////////// TODO Extract input values from data /////////////////////

        ///////////////////////////////////////////////////////////////////////
        ///////////////////// Run Step Processor Function /////////////////////
        ///////////////////////////////////////////////////////////////////////
        const [err, stepResults] = await processOrAggregate(
            pipeline,
            step,
            data,
            pipelineExecution);

        if (err) {
            addTrace({
                pipeline: pipelineName,
                timestamp: Date.now(),
                step: step.name,
                state: PipelineStep.StepStates.PIPELINE_COMPLETE_WITH_ERRORS,
                message: ` ${err.toString()}.`,
                error: err,
                data: data,
                extract: step.extract
            });
            return [err];
        }

        ///////////////////// Extract values from stepResults /////////////////////
        const [extractedData, extractErr] = extractor.extract(
            pipeline.contentType || 'application/json',
            stepResults,
            step.extract)

        if (extractErr) {
            addTrace({
                pipeline: pipelineName,
                timestamp: Date.now(),
                step: step.name,
                state: PipelineStep.StepStates.PIPELINE_COMPLETE_WITH_ERRORS,
                message: ` ${extractErr.toString()}.`,
                error: extractErr,
                data: stepResults,
                extract: step.extract
            });
            return [extractErr];
        }

        console.debug(`pipelineRequest._startStep(): 
            Pipeline:${pipelineName}: 
            Data extracted from Step:${step.name} -> ${JSON.stringify(extractedData)}`);
        return [null, extractedData];
    }

}

module.exports = PipelineRequest;
