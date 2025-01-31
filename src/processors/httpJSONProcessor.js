const StepProcessor = require('./stepProcessor');
const PipelineStep = require('../model/pipe');
const extractor = require("../extractor");
const misc = require('../misc');
const jsonTypes = require('../model/jsonTypes');
const AggregationExtraction = require('./aggregateExtraction');
const authenticationTypes = require('../model/authenticationTypes');
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
     * @returns {Promise<[error, stepData]>}
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
            const [err, results] = await this.processStep(pipeline, step, {...realData, ...aggValues});
            if (err) {
                addTrace({
                    pipeline: pipelineName,
                    step: step.name,
                    nodeName: step.node.name,
                    timestamp: Date.now(),
                    message: err,
                    state: PipelineStep.StepStates.ERROR,
                    data: {...realData, ...results},
                    index: cnt
                });
                console.debug(`aggregateStep: ${pipeline.toString()} -> ${step.name}: Error -> ${err.toString()}`);
                return [err, {...realData, ...results}];
            }
            // Adds values extracted from step output to extractor
            aggExtractor.accumulateExtractionResults(results);
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
        console.log(`aggregateStep: ${pipeline.name} -> ${step.name}: Results -> ${JSON.stringify(finalAggData)}`);
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
            let stepInput;
            /// if step.inputExtract then extract the values needed as input into this step execution else send ALL data
            if (misc.hasKeys(step.inputExtract)) {
                const [inputData, err] = extractor.extract(
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

                /// Set the data to the extracted data
                stepInput = inputData;
            } else {
                stepInput = realData;
            }

            console.debug(`processStep(): Pipeline:${pipeline.name} -> Step:${step.name} -> payload:${JSON.stringify(stepInput)}`);
            return step.node.execute(step, stepInput).then(([err, responseData]) => {
                if (err) {
                    addTrace({
                        pipeline: pipelineName,
                        step: step.name,
                        nodeName: step.node.name,
                        timestamp: Date.now(),
                        message: `Error extracting data. keys: ${JSON.stringify(Object.keys(step.extract))}`,
                        data: responseData,
                        state: PipelineStep.StepStates.ERROR,
                    });
                    console.warn(`processStep(): Pipeline:${pipeline.name} -> Step:${step.name}: Error -> ${JSON.stringify(err)}`);
                    return [err, {...data, ...responseData}];
                }

                ///////////////////// Process Node Response /////////////////////
                ///////////////////// Process Node Response /////////////////////
                console.debug(`processStep(): Pipeline:${pipeline.name} -> Step:${step.name} -> response:${JSON.stringify(responseData)}`);
                ///////////////////// If extractions are defined extract data from step output /////////////////////
                ///////////////////// If extractions are to be done /////////////////////
                // if singleValueExtract is true
                //  then the entire output will be extracted into a single value
                //  with key 'extractSingleKey' as type 'extractSingleType'
                if (step.singleValueExtract) {
                    // if (Object.keys(step.extract).length === 1) {
                    const name = step.aggregateSingle.extractSingleKey;
                    const value = step.aggregateSingle.extractSingleType;
                    if (jsonTypes.isType(value)) {
                        // if (!jsonTypes.validate(value, responseData) && responseData) {
                        //      const errMsg = `Type [${typeof responseData}] does not match extract designation [${value}]`;
                        //      stepTrace = [...stepTrace, {
                        //          pipeline: pipelineName,
                        //          step: step.name,
                        //          nodeName: step.node.name,
                        //          nodeUrl: url,
                        //          timestamp: Date.now(),
                        //          message: `Extract datatype mismatch`,
                        //          error: errMsg
                        //      }];
                        // return [responseData, stepTrace, errMsg]
                        // } else {
                        const results = {[name]: responseData};
                        console.debug(`processStep(): Pipeline:${pipeline.name} -> Step:${step.name} -> extract:${JSON.stringify(results)}`);
                        return [null, results];
                    }
                }

                if (misc.hasKeys(step.extract)) {
                    /// extract data
                    /// if singleValueExtract is false
                    ///     then the extract data using each key/value pairs
                    /// {extractKey: 'jmsePath of data in step output'}
                    const [newData, err] = extractor.extract(
                        pipeline.contentType || step.node.contentType, responseData, step.extract);

                    ///TODO Add extract error to history
                    if (err) {
                        addTrace({
                            pipeline: pipelineName,
                            step: step.name,
                            nodeName: step.node.name,
                            timestamp: Date.now(),
                            message: `Error extracting data. keys: ${JSON.stringify(Object.keys(step.extract))}`,
                            data: responseData,
                            state: PipelineStep.StepStates.ERROR,
                        });
                        console.warn(`processStep(): Pipeline:${pipeline.name} -> Step:${step.name}: Error -> ${JSON.stringify(err)}`);
                        return [err];
                    }
                    /// Set the data to the extracted data
                    responseData = newData;
                }

                [err, responseData] = this.postProcessStepResults(step, responseData)

                /////////////// Return response data and history ///////////////
                if (err) {
                    console.warn(`processStep(): Pipeline:${pipeline.name} -> Step:${step.name}: Error -> ${JSON.stringify(err)}\n`);
                } else {
                    console.debug(`processStep(): Pipeline:${pipeline.name} -> Step:${step.name}: response -> ${JSON.stringify(responseData)}\n`);
                }
                return [err, responseData];
            });
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

    postProcessStepResults(step, stepResults) {

        /// Check for error conditions
        if (false) { // not doing this right now
            if (misc.hasKeys(step.node.errorIndicators)) {
                for (const errorIndicatorsKey in step.node.errorIndicators) {
                    if (stepResults[errorIndicatorsKey]) {
                        /// loop thru the errorMessages
                        let messages = [];
                        if (misc.hasKeys(step.node.errorMessages)) {
                            for (const errorMessagesKey in step.node.errorMessages) {
                                const msg = stepResults[errorMessagesKey];
                                if (msg && msg.length > 0) {
                                    messages = [...messages, msg];
                                }
                            }
                        }

                        addTrace({
                            step: step.name,
                            nodeName: step.node.name,
                            timestamp: Date.now(),
                            message: `Error in response`,
                            responseErrors: messages
                        });
                        return [messages];
                    }
                }// for
            }
        }

        if (step.transformModules && false) { //Not doing this yet
            //loop thru the transforms
            let tData = stepResults;
            for (const idx in step.transformModules.after) {
                const tMod = step.transformModules.after[idx];

                const [newData, err] = tMod.stepFn(pipeline, step, tData);//TODO test this thoroughly!!!
                if (err) {
                    addTrace({
                        pipeline: pipelineName,
                        step: step.name,
                        stepTransform: tMod.name,
                        nodeName: step.node.name,
                        nodeUrl: url,
                        state: PipelineStep.StepStates.COMPUTE_ERROR,
                        timestamp: Date.now(),
                        message: `${err}`,
                        error: err
                    });
                    return [err]
                }
                tData = {...tData, ...newData};
            }
            stepResults = tData;
        }

        return [null, stepResults];
    }

}

module.exports = HttpJSONProcessor;
