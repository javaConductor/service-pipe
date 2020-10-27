const axios = require("axios");
const misc = require('./misc');
const extractor = require("./extractor");
const Pipeline = require("./model/pipeline");
const PipelineStep = require("./model/pipelineStep");
const jmespath = require("jmespath")
const processorManager = require('./processors/processorManager');
const StepProcessor = require('./processors/stepProcessor');

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
        this.stepProcessor = new StepProcessor({});
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
        }];

        let [results, sequenceHistory, err] = await this._startSeq(this.pipeline, this.pipeline.steps, this.initialData);
        if (err) {
            const now = Date.now();
            const millis = new Date(now).getTime() - new Date(startTime).getTime();
            const history = [...pipelineHistory, ...sequenceHistory, {
                pipeline: this.pipeline.name,
                timeStamp: now,
                pipelineTimeMillis: millis,
                message: "Pipeline completed with error.",
                errorMessage: err,
                state: PipelineStep.StepStates.PIPELINE_COMPLETE_WITH_ERRORS,
                partialData: results
            }].map((trace) => ({...trace, timeStamp: new Date(trace.timeStamp)}));
            console.log(`PipelineRequest: Pipeline: [${this.pipeline.name}]\nTrace: ${JSON.stringify(history, null, 2)} `);
            return [results, history, err];
        }

        if (this.pipeline.transformModules) {

            //loop thru the transforms
            let tData = results;
            for (const idx in this.pipeline.transformModules.after) {
                const tMod = this.pipeline.transformModules.after[idx];
                const [newData, err] = tMod.stepFn(this.pipeline, null, tData);
                if (err) {
                    pipelineHistory = [...pipelineHistory, {
                        pipeline: this.pipeline.name,
                        //step: step.name,
                        stepTransform: tMod.name,
                        state: PipelineStep.StepStates.COMPUTE_ERROR,
                        timeStamp: Date.now(),
                        message: `${err}`,
                        error: err
                    }];
                    return [tData, pipelineHistory, err]
                }
                tData = {...tData, ...newData};
            }
            results = tData;
        }


        let [finalValue, e] = (misc.hasKeys(this.pipeline.extract))
            // Default to JSON
            ? extractor.extract(this.pipeline.contentType || "application/json", results, this.pipeline.extract)
            : [results];

        if (e) {
            /// add error to history
        }
        const now = Date.now();
        const millis = new Date(now).getTime() - new Date(startTime).getTime();
        pipelineHistory = [...pipelineHistory, ...sequenceHistory, {
            pipeline: this.pipeline.name,
            timeStamp: now,
            pipelineTimeMillis: millis,
            message: "Pipeline complete.",
            state: PipelineStep.StepStates.PIPELINE_COMPLETE,
            extracted: finalValue
        }].map((trace) => {
            return {...trace, timeStamp: new Date(trace.timeStamp)}
        });


        console.log(`PipelineRequest: Pipeline: [${this.pipeline.name}]\nTrace: ${JSON.stringify(pipelineHistory, null, 2)} `);
        return [finalValue, pipelineHistory, null];
    }

    /**
     *
     * @param pipeline Pipeline
     * @param sequence
     * @param initialData
     * @returns {Promise<*|{}>}
     * @private
     */
    async _startSeq(pipeline, sequence, initialData) {
        const pipelineName = pipeline.name;
        let pipelineHistory = [];
        let data = initialData || {};

        /// loop thru each node in the sequence
        for (let step in sequence) {
            const stepProcessor = processorManager.getStepProcessor(sequence[step]);
            if (!stepProcessor) {
                pipelineHistory = [...pipelineHistory, {
                    pipeline: pipelineName,
                    timeStamp: Date.now(),
                    state: PipelineStep.StepStates.ERROR,
                    message: `No step processor for [${step.name}].`,
                    partialData: data
                }];
                return [data, pipelineHistory, `No step processor for [${step.name}].`];
            }

            const processOrAggregate = sequence[step].aggregateStep
                ? stepProcessor.aggregateStep
                : stepProcessor.processStep;

            const [stepData, stepTrace, err] = await processOrAggregate(pipeline, sequence[step], data)
            if (err) {
                return [stepData, stepTrace, (`${err}`)];
            }
            pipelineHistory = [...pipelineHistory, {
                pipeline: pipelineName,
                timeStamp: Date.now(),
                state: PipelineStep.StepStates.STEP_COMPLETE,
                message: `Step [${sequence[step].name}] is completed.`,
                extracted: stepData
            }];

            ///TODO Add to History or send to listeners
            pipelineHistory = [...pipelineHistory, ...stepTrace];
            /// combine data from step with previous data
            data = {...data, ...stepData};
        }

        return [data, pipelineHistory];
    }
}

module.exports = PipelineRequest;
