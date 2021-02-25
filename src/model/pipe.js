const AggregateExtraction = require('../processors/aggregateExtraction');
const {v4: uuid} = require('uuid');

class Pipe {
  constructor(props) {

    if (!props.uuid || props.uuid.trim().length === 0) {
      this.uuid = uuid();
      //throw new Error("Pipe uuid is required ");
    }
    this.uuid = props.uuid;


    if (!props.name || props.name.trim().length === 0) {
      throw new Error("Pipe name is required ")
    }
    this.name = props.name;

    if (props.transformModules &&
      (props.transformModules.before || props.transformModules.after)) {
      this.transformModules = this.setTransformModules(props.transformModules);
    }

    if (!props.node && !props.nodeName && !props.nodeUUID) {
      throw new Error(`Pipe: node or nodeUUID is required.`);
    }
    this.node = props.node;
    this.nodeUUID = props.nodeUUID;
    this.nodeName = props.nodeName;

    this.aggregateStep = props.aggregateStep;
    if (this.aggregateStep) {
      this.aggregation = {};

      this.aggregation.parallelStep = props.parallelStep;

      if (!props.dataArrayProperty) {
        throw new Error(`Pipe: dataArrayProperty is required.`);
      }
      this.aggregation.dataArrayProperty = props.dataArrayProperty;

      if (!props.outputArrayProperty) {
        throw new Error(`Pipe: outputArrayProperty is required.`);
      }
      this.aggregation.outputArrayProperty = props.outputArrayProperty;

      if (!props.aggregateExtract) {
        throw new Error(`Pipe: aggregateExtract is required.`);
      }
      this.aggregation.aggregateExtract = props.aggregateExtract;

      this.aggregation.aggExtractionType = props.aggregateExtract.aggExtractionType || AggregateExtraction.Types.AsNormal;
    }

    this.params = props.params;
    this.data = props.data;
    this.extract = props.extract || {};
    this.stepType = props.stepType || Pipe.StepTypes.HTTP_JSON;
  }

  setTransformModules(transformModules) {
    if (transformModules &&
      (transformModules.before || transformModules.after)) {
      this.transformModules = transformModules;
      let before = [], after = [];
      if (transformModules.before)
        for (const tMod of transformModules.before) {
          //const tMod = this.transformModules.before[idx];
          let {name, stepFn, modPath} = tMod;
          if (!name) {
            throw new Error(`Pipe: [${this.name}]: Before Module [${idx}]: name missing.`);
          }
          if (!stepFn) {
            if (!modPath) {
              throw new Error(`Pipe: [${this.name}] Before Module: [${tMod.name}]: path is required`);
            }
            try {
              stepFn = require(modPath);
            } catch (e) {
              throw new Error(`Pipe: [${this.name}] Before Module: [${tMod.name}]: Could not load module: [${e.message}`);
            }
          }
          const mod = {name, stepFn, modPath}
          before = [...before, mod];
        }
      if (transformModules.after)
        for (const tMod of transformModules.after) {
          //const tMod = this.transformModules.after[idx];
          let {name, stepFn, modPath} = tMod;
          if (!name) {
            throw new Error(`Pipe: [${this.name}]: After Module [${idx}]: name missing.`);
          }
          if (!stepFn) {
            if (!modPath) {
              throw new Error(`Pipe: [${this.name}] After Module: [${name}]: path is required`);
            }
            try {
              stepFn = require(modPath);
            } catch (e) {
              throw new Error(`Pipe: [${this.name}] After Module: [${tMod.name}]: Could not load module: [${e.message}`);
            }
          }
          const mod = {name, stepFn, modPath}
          after = [...after, mod];
        }
      this.transformModules.before = before;
      this.transformModules.after = after;
      return this.transformModules;
    }

  }
}

Pipe.StepTypes = {
  HTTP_JSON: 'http.json',
  HTTP_TEXT: 'http.text',
  STEP_FOREACH: 'step.forEach'
};

Pipe.StepStates = {
  INITIALIZATION: 'init',

  ERROR: 'error',
  COMMUNICATION_ERROR: 'error.communication',
  DATA_ERROR: 'error.data',
  COMPUTE_ERROR: 'error.compute',

  IN_PROGRESS: 'in.progress',

  STEP_COMPLETE: 'complete.step',
  STEP_COMPLETE_WITH_ERRORS: 'complete.step.w.errors',
  PIPELINE_COMPLETE: 'complete.pipeline',
  PIPELINE_COMPLETE_WITH_ERRORS: 'complete.pipeline.w.errors',
};

module.exports = Pipe;
