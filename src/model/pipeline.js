const {v4: uuid} = require('uuid');

class Pipeline {

  toString() {
    return `[${this.name}](${this.steps.length}):${this.uuid}`;
  }

  constructor(props) {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error("Pipeline name is required ")
    }
    if (!(typeof props.steps) instanceof Array) {
      throw new Error("Pipeline steps must be a non-empty array. ");
    }
    if (props.steps.length === 0) {
      throw new Error("Pipeline steps are required ");
    }
    if (props.transformModules &&
      (props.transformModules.before || props.transformModules.after)) {
      this.transformModules = this.setTransformModules(props.transformModules);
    }

    this.uuid = props.uuid || uuid();
    this.status = props.status || Pipeline.Status.New;
    this.extract = props.extract || {};
    this.name = props.name;
    this.steps = props.steps;
    this.contentType = props.contentType || 'application/json'
  }

  setTransformModules(transformModules) {
    if (transformModules &&
      (transformModules.before || transformModules.after)) {
      this.transformModules = transformModules;
      let before = [], after = [];
      if (transformModules.before)
        for (const idx in transformModules.before) {
          const tMod = props.transformModules.before[idx];
          let {name, stepFn, modPath} = tMod;
          if (!name) {
            throw new Error(`PipelineStep: [${this.name}]: Before Module [${idx}]: name missing.`);
          }
          if (!stepFn) {
            if (!modPath) {
              throw new Error(`PipelineStep: [${this.name}] Before Module: [${tMod.name}]: path is required`);
            }
            try {
              stepFn = require(modPath);
            } catch (e) {
              throw new Error(`PipelineStep: [${this.name}] Before Module: [${tMod.name}]: Could not load module: [${e.message}`);
            }
          }
          const mod = {name, stepFn, modPath}
          before = [...before, mod];
        }

      if (transformModules.after)
        for (const idx in transformModules.after) {
          const tMod = transformModules.after[idx];
          let {name, stepFn, modPath} = tMod;
          if (!name) {
            throw new Error(`Pipeline: [${this.name}]: After Module [${idx}]: name missing.`);
          }
          if (!stepFn) {
            if (!modPath) {
              throw new Error(`Pipeline: [${this.name}] After Module: [${name}]: path is required`);
            }
            try {
              stepFn = require(modPath);
            } catch (e) {
              throw new Error(`PipelineStep: [${this.name}] After Module: [${tMod.name}]: Could not load module: [${e.message}`);
            }
          }
          const mod = {name, stepFn, modPath}
          after = [...after, mod];
        }
      this.transformModules.before = before;
      this.transformModules.after = after;
      return this.transformModules;
    }
    return null;
  }
}

Pipeline.Status = {New: 'New', Active: 'Active'}

module.exports = Pipeline;
