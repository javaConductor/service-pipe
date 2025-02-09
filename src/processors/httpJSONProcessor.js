const StepProcessor = require('./stepProcessor');
const PipelineStep = require('../model/pipe');
const extractor = require("../extractor");
const jsonTypes = require('../model/jsonTypes');
const AggregationExtraction = require('./aggregateExtraction');
const {addTrace} = require('../trace')

class HttpJSONProcessor extends StepProcessor {

    constructor(processorProps) {
        super(processorProps);
        this.stepType = PipelineStep.StepTypes.HTTP_JSON;//TODO use stepType defined in step
        this.processStep = this.processStep.bind(this);
        this.aggregateStep = this.aggregateStep.bind(this);
    }

    canProcess(step) {
        //TODO working as default
        return !step.node.contentType || step.node.contentType === "application/json";
    }

    /**
     * Loops through some data element and executes step with each value
     * usxes aggregation property of the step
     *  "aggregation": {
     *      dataArrayProperty // (required) name of the Array value.
     *                        // Step will be executed with each element in array.
     *      outputArrayProperty // TODO explain
     *      aggregateExtract // TODO explain
     *  }
     * @param pipeline
     * @param step
     * @param data
     * @returns {Promise{[error, stepData]>}
     */
    async aggregateStep(pipeline, step, data) {
        if (step.parallelStep)
            return this.aggregateParallelStep(pipeline, step, data);

        /// add step data to request
        const realData = {...(step.data || {}), ...data};
        console.debug(`aggregateStep: ${pipeline.toString()} -> ${step.name} -> ${JSON.stringify(realData)}`);

        const pipelineName = pipeline.name;
        /// get the dataArrayProperty
        const dataArrayKey = step.aggregation.dataArrayProperty;
        const dataOutputKey = step.aggregation.outputArrayProperty;
        const aggregateExtract = step.aggregation.aggregateExtract;

        /// get the array value to iterate over
        let dataArrayElement = realData[dataArrayKey];

        /// DAtaArrayElement MUST be an array
        if (!jsonTypes.validate("array:", dataArrayElement)) {
            const msg = `Field [${dataArrayKey}] is not an array.`;
            addTrace({
                pipeline: pipelineName,
                step: step.name,
                nodeName: step.node.name,
                timestamp: Date.now(),
                state: PipelineStep.StepStates.DATA_ERROR,
                message: `Error in data.`,
                error: msg
            });
            console.debug(`aggregateStep: ${pipeline.toString()} -> ${step.name}: Error -> ${msg}`);
            return [msg, data];
        }

        let cnt = 0;
        const aggExtractor = new AggregationExtraction(step.aggregation.aggExtractionType);
        for (const idx in dataArrayElement) {
            ++cnt;
            const aggValues = aggExtractor.createAggregationData(dataArrayElement[idx], aggregateExtract);
            const [errStep, stepResults] = await this.processStep(pipeline, step, {...realData, ...aggValues});
            if (errStep) {
                addTrace({
                    pipeline: pipelineName,
                    step: step.name,
                    nodeName: step.node.name,
                    timestamp: Date.now(),
                    message: errStep,
                    state: PipelineStep.StepStates.ERROR,
                    data: {...realData, ...stepResults},
                    index: cnt
                });
                console.debug(`aggregateStep: ${pipeline.toString()} -> ${step.name}: Error -> ${errStep.toString()}`);
                return [errStep];
            }
            // Adds values extracted from step output to extractor
            aggExtractor.accumulateExtractionResults(stepResults);
        }

        /// get accumulated extraction data
        const finalAggData = aggExtractor.getExtractionResults(dataOutputKey);

        addTrace({
            pipeline: pipelineName,
            step: step.name,
            nodeName: step.node.name,
            timestamp: Date.now(),
            state: PipelineStep.StepStates.STEP_COMPLETE,
            message: `Completed aggregate step.`,
            data: finalAggData,
            count: cnt,
        });
        console.log(`aggregateStep: ${pipeline.name} -> ${step.name}: 
        Results -> ${JSON.stringify(finalAggData)}`);
        return [null, finalAggData];
    }

    /**
     *
     * @param pipeline
     * @param step
     * @param data
     * @returns {Promise<[err, stepData]>}
     */
    async aggregateParallelStep(pipeline, step, data) {
        const realData = {...step.node.nodeData, ...(step.data || {}), ...data};

        const pipelineName = pipeline.name;
        /// get the dataArrayProperty
        const dataArrayKey = step.aggregation.dataArrayProperty;
        const dataOutputKey = step.aggregation.outputArrayProperty;
        const aggregateExtract = step.aggregation.aggregateExtract;

        let stepTrace = [];
        let value = realData[dataArrayKey];

        if (!jsonTypes.validate("array:", value)) {
            addTrace({
                pipeline: pipelineName,
                step: step.name,
                nodeName: step.node.name,
                timestamp: Date.now(),
                state: PipelineStep.StepStates.DATA_ERROR,
                message: `Error in data.`,
                error: `Field [${dataArrayKey}] is not an array.`
            });
            return [`Field [${dataArrayKey}] is not an array.`, data];
        }

        let cnt = 0;
        const aggExtractor = new AggregationExtraction(step.aggregation.aggExtractionType);
        let promises = [];
        for (const idx in value) {
            ++cnt;
            /// Create promise for list element
            const p = this.processStep(pipeline, step, {...realData});
            promises = [...promises, p];
        }

        await Promise.all(promises).then((list) => {
            for (const idx in list) {
                const [results, err] = list[idx];
                if (err) {
                    addTrace({
                        pipeline: pipelineName,
                        step: step.name,
                        nodeName: step.node.name,
                        timestamp: Date.now(),
                        message: err,
                        state: PipelineStep.StepStates.ERROR,
                        data: {...realData, ...results},
                        index: idx
                    });
                    return [err, {...realData, ...results}];
                }
                aggExtractor.accumulateExtractionResults(results);
            }
        }).catch((err) => {
            stepTrace = [...stepTrace, {
                pipeline: pipelineName,
                step: step.name,
                nodeName: step.node.name,
                timestamp: Date.now(),
                message: err,
                state: PipelineStep.StepStates.ERROR
            }];
            return [err];
        })

        const finalAggData = aggExtractor.getExtractionResults(dataOutputKey);

        addTrace({
            pipeline: pipelineName,
            step: step.name,
            nodeName: step.node.name,
            timestamp: Date.now(),
            state: PipelineStep.StepStates.STEP_COMPLETE,
            message: `Completed aggregate parallel step.`,
            data: finalAggData,
            count: cnt,
        });

        return [null, finalAggData];
    }

    /**
     * Execute a step
     *      if an extract is defined for this step return the extracted data
     *      else return full step response
     *
     * @param pipeline
     * @param step
     * @param data
     * @returns {Promise<[error, stepData]>}
     */
    async processStep(pipeline, step, data) {
        const pipelineName = pipeline.name;
        try {
            /// use the data from the node in the step to make the HTTP call
            const realData = {...step.node.nodeData, ...(step.data || {}), ...data};// don't add nodeData.
            /// if step.inputExtract then extract the values needed as input into this step execution else send ALL data
            let [stepInput, err] = extractor.extract(
                pipeline.contentType || step.node.contentType, realData, step.inputExtract);
            if (err) {
                addTrace({
                    pipeline: pipelineName,
                    step: step.name,
                    nodeName: step.node.name,
                    timestamp: Date.now(),
                    message: `Error extracting input data. keys: ${JSON.stringify(Object.keys(step.inputExtract))}`,
                    data: realData,
                    state: PipelineStep.StepStates.ERROR,
                });
                console.warn(`processStep(): Pipeline:${pipeline.name} -> Step:${step.name}: 
                        Error -> ${JSON.stringify(err)}`);
                return [err];
            }

            console.debug(`processStep(): 
                Pipeline:${pipeline.name} -> Step:${step.name}
                -> payload:${JSON.stringify(stepInput)}`);

            const [errNode, nodeOutput] = await step.node.execute(step, stepInput);
            if (err) {
                addTrace({
                    pipeline: pipelineName,
                    step: step.name,
                    nodeName: step.node.name,
                    timestamp: Date.now(),
                    message: `Error extracting data: ${errNode}`,
                    data: nodeOutput,
                    state: PipelineStep.StepStates.ERROR,
                });
                console.warn(`processStep(): 
                    Pipeline:${pipeline.name} -> 
                    Step:${step.name}: 
                    Error -> ${JSON.stringify(err)}`);
                return [errNode];
            }

            console.debug(`processStep(): Pipeline:${pipeline.name} 
            -> Step:${step.name} 
            -> response:${JSON.stringify(nodeOutput)}`);
            ///////////////////// If extractions are defined extract data from step output /////////////////////
            ///////////////////// If extractions are to be done /////////////////////
            /// extract data
            const [stepResults, errExtract] = extractor.extract(
                pipeline.contentType || step.node.contentType,
                nodeOutput, step.extract);

            ///TODO Add extract error to history
            if (errExtract) {
                addTrace({
                    pipeline: pipelineName,
                    step: step.name,
                    nodeName: step.node.name,
                    timestamp: Date.now(),
                    message: `Error extracting data. keys: ${JSON.stringify(Object.keys(step.extract))}`,
                    data: nodeOutput,
                    state: PipelineStep.StepStates.ERROR,
                });
                console.warn(`processStep(): Pipeline:${pipeline.name} -> Step:${step.name}: Error -> ${JSON.stringify(errExtract)}`);
                return [errExtract];
            }
            /// Set the data to the extracted data

            /////////////// Return response data and history ///////////////
            // if (err) {
            //     console.warn(`processStep(): Pipeline:${pipeline.name} -> Step:${step.name}: Error -> ${JSON.stringify(err)}\n`);
            // } else {
            //     console.debug(`processStep(): Pipeline:${pipeline.name} -> Step:${step.name}: response -> ${JSON.stringify(nodeResults)}\n`);
            // }

            return [null, stepResults];
        } catch (e) { // outer try
            addTrace({
                pipeline: pipelineName,
                step: step.name,
                nodeName: step.node.name,
                timestamp: Date.now(),
                message: `Error contacting node [${step.node.name}]`,
                state: PipelineStep.StepStates.ERROR,
                error: `${e.message}\n${JSON.stringify(e.stack, null, 2)}`
            });
            console.warn(`processStep(): Pipeline:${pipeline.name} -> Step:${step.name}: Error -> ${JSON.stringify(e)}\n`);
            return [e];
        }
    }
}

module.exports = HttpJSONProcessor;
