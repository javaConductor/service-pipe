const AggregateExtraction = require('../processors/aggregateExtraction');

class PipelineStep {
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
                    const tMod = props.transformModules.after[idx];
                    let {name, stepFn, modPath} = tMod;
                    if (!name) {
                        throw new Error(`PipelineStep: [${this.name}]: After Module [${idx}]: name missing.`);
                    }
                    if (!stepFn) {
                        if (!modPath) {
                            throw new Error(`PipelineStep: [${this.name}] After Module: [${name}]: path is required`);
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

    }

    constructor(props) {
        if (!props.name || props.name.trim().length === 0) {
            throw new Error("PipelineStep name is required ")
        }
        this.name = props.name;

        if (props.transformModules &&
            (props.transformModules.before || props.transformModules.after)) {
            this.transformModules = this.setTransformModules(props.transformModules);
        }

        if (!props.node && !props.nodeName) {
            throw new Error(`PipelineStep: node or nodeName is required.`);
        }
        this.node = props.node;
        this.nodeName = props.nodeName;

        this.aggregateStep = props.aggregateStep;
        if (this.aggregateStep) {
            this.aggregation = {};

            this.aggregation.parallelStep = props.parallelStep;

            if (!props.dataArrayProperty) {
                throw new Error(`PipelineStep: dataArrayProperty is required.`);
            }
            this.aggregation.dataArrayProperty = props.dataArrayProperty;

            if (!props.outputArrayProperty) {
                throw new Error(`PipelineStep: outputArrayProperty is required.`);
            }
            this.aggregation.outputArrayProperty = props.outputArrayProperty;

            if (!props.aggregateExtract) {
                throw new Error(`PipelineStep: aggregateExtract is required.`);
            }
            this.aggregation.aggregateExtract = props.aggregateExtract;

            this.aggregation.aggExtractionType = props.aggregateExtract.aggExtractionType || AggregateExtraction.Types.AsNormal;
        }

        this.params = props.params;
        this.data = props.data;
        this.extract = props.extract || {};
        this.stepType = props.stepType || PipelineStep.StepTypes.HTTP_JSON;
    }
}

PipelineStep.StepTypes = {
    HTTP_JSON: 'http.json',
    HTTP_TEXT: 'http.text',
    STEP_FOREACH: 'step.forEach'
};

PipelineStep.StepStates = {
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

module.exports = PipelineStep;
