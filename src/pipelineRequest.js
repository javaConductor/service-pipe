const axios = require("axios");
const misc = require('./misc');
const extractor = require("./extractor");
const Pipeline = require("./model/pipeline");
const PipelineStep = require("./model/pipe");
const jmespath = require("jmespath")
const processorManager = require('./processors/processorManager');
const StepProcessor = require('./processors/stepProcessor');
const nodesRepo = require('./nodes').default;

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
        throw new Error(`PipelineRequest: Bad Pipeline: Step: ${step.uuid}: no node.`);
      }
      return {...step, node: step.node || nodesRepo.getNode(step.nodeUUID)}
    });

    this.initialData = initialData || {};
    this.pipelineHistory = [];
    this.stepProcessor = new StepProcessor({});
  }

  toString() {
    return `[${this.pipeline.name}]:${this.pipeline.uuid}${this.initialData ? ": using: " + JSON.stringify(this.initialData) : ""}`
  }

  /**
   *
   * @returns {Promise<[*][]>}
   */
  async start() {
    const startTime = Date.now();

    console.log(`PipelineRequest.start: ${JSON.stringify(this.pipeline, null, 2)}.`);
    console.log(`PipelineRequest.start: Steps: ${this.pipeline.steps.map((step) => (step.node.uuid))}`);

    let pipelineHistory = [{
      pipeline: this.pipeline.name,
      timestamp: startTime,
      message: "Start pipeline.",
      steps: this.pipeline.steps.map((step) => (step.name))
    }];

    let [results, sequenceHistory, err] = await this._startSeq(this.pipeline, this.pipeline.steps, this.initialData);
    if (err) {
      const now = Date.now();
      const millis = new Date(now).getTime() - new Date(startTime).getTime();
      const history = [...pipelineHistory, ...sequenceHistory, {
        pipeline: this.pipeline.name,
        timestamp: now,
        pipelineTimeMillis: millis,
        message: "Pipeline completed with error.",
        errorMessage: err,
        state: PipelineStep.StepStates.PIPELINE_COMPLETE_WITH_ERRORS,
        partialData: results
      }].map((trace) => ({...trace, timestamp: new Date(trace.timestamp)}));
      //console.log(`PipelineRequest: Pipeline: [${this.pipeline.name}]\nTrace: ${JSON.stringify(history, null, 2)} `);
      return [results, history, err];
    }

    if (this.pipeline.transformModules) {

      //loop thru the transforms
      let tData = results;
      for (const tMod of this.pipeline.transformModules.after) {
        // const tMod = this.pipeline.transformModules.after[idx];
        const [newData, err] = tMod.stepFn(this.pipeline, null, tData);
        if (err) {
          pipelineHistory = [...pipelineHistory, {
            pipeline: this.pipeline.name,
            //step: step.name,
            stepTransform: tMod.name,
            state: PipelineStep.StepStates.COMPUTE_ERROR,
            timestamp: Date.now(),
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
      timestamp: now,
      pipelineTimeMillis: millis,
      message: "Pipeline complete.",
      state: PipelineStep.StepStates.PIPELINE_COMPLETE,
      extracted: finalValue
    }].map((trace) => {
      return {...trace, timestamp: new Date(trace.timestamp)}
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
    for (let step of sequence) {
      const stepProcessor = processorManager.getStepProcessor(step);
      if (!stepProcessor) {
        const msg = `No step processor for [${step.name}].`;
        pipelineHistory = [...pipelineHistory, {
          pipeline: pipelineName,
          timestamp: Date.now(),
          state: PipelineStep.StepStates.ERROR,
          message: msg,
          partialData: data
        }];
        return [data, pipelineHistory, msg];
      }

      const processOrAggregate = step.aggregateStep
        ? stepProcessor.aggregateStep
        : stepProcessor.processStep;

      const [stepData, stepTrace, err] = await processOrAggregate(pipeline, step, {...data, ...initialData});
      if (err) {
        pipelineHistory = [...pipelineHistory, ...stepTrace, {
          pipeline: pipelineName,
          timestamp: Date.now(),
          state: PipelineStep.StepStates.STEP_COMPLETE_WITH_ERRORS,
          message: `Error in Step [${step.name}]: ${err.toString()} .`,
          error: err,
          payload: {...data, ...initialData}
        }];
        return [stepData, pipelineHistory, (`${err}`)];
      }
      pipelineHistory = [...pipelineHistory, ...stepTrace, {
        pipeline: pipelineName,
        timestamp: Date.now(),
        state: PipelineStep.StepStates.STEP_COMPLETE,
        message: `Step [${step.name}] is completed.`,
        extracted: stepData
      }];

      /// combine data from step with previous data
      data = {...data, ...stepData};
    }
    return [data, pipelineHistory];
  }
}

module.exports = PipelineRequest;
