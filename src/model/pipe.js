const AggregateExtraction = require('../processors/aggregateExtraction');
const {v4: uuid} = require('uuid');
const validator = require('../model/validator');
// also called a step
class Pipe {
    constructor(props) {

        if (!props.nodeUUID || props.nodeUUID.trim().length === 0) {
            this.nodeUUID = uuid();
            //throw new Error("Pipe uuid is required ");
        }

        const {error, value} = validator.validateStepDoc(props)
        if (error) {
            throw new Error(`Invalid pipeline step: ${error}`);
        }
        Object.assign(this, value);
    }

    setTransformModules(transformModules) {
        if (transformModules &&
            (transformModules.before || transformModules.after)) {
            this.transformModules = transformModules;
            let before = [], after = [];
            if (transformModules.before)
                for (const idx in transformModules.before) {
                    const tMod = this.transformModules.before[idx];
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
                for (const idx in transformModules.after) {
                    const tMod = this.transformModules.after[idx];
                    let {name, stepFn, modPath} = tMod;
                    if (!name) {
                        throw new Error(`Pipe: [${this.name}]: After Module [${idx}]: name missing.`);
                    }
                    if (!stepFn) {
                        throw new Error(`Pipe: [${this.name}] After Module: [${name}]: path is required`);
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
    NODE_ACCESS: 'node.access',
    NODE_COMPLETE: 'node.complete',
    STEP_COMPLETE: 'complete.step',
    STEP_COMPLETE_WITH_ERRORS: 'complete.step.w.errors',
    PIPELINE_COMPLETE: 'complete.pipeline',
    PIPELINE_COMPLETE_WITH_ERRORS: 'complete.pipeline.w.errors',
};

module.exports = Pipe;
