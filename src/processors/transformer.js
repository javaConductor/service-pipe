const Pipeline = require("../model/pipeline");

class Transformer {

    postProcessPipelineResults(pipeline, transformModules, results) {
        if (!transformModules || !transformModules.after || !transformModules.after.stepFh) {
            return results
        }
        const data = transformModules.after.stepFn(pipeline, results);
        return data;
    }// postProcessPipelineResults


    preProcessPipelineResults(pipeline, transformModules, results) {
        if (!transformModules || !transformModules.before || !transformModules.before.stepFh) {
            return results
        }
        const data = transformModules.before.stepFn(pipeline, results);
        return data;
    }// preProcessPipelineResults


    postProcessStepResults(step, transformModules, results) {
        if (!transformModules || !transformModules.after || !transformModules.after.stepFh) {
            return results
        }
        const data = transformModules.after.stepFn(step, results);
        return data;
    }// postProcessStepResults


    preProcessStepResults(step, transformModules, results) {
        if (!transformModules || !transformModules.before || !transformModules.before.stepFh) {
            return results
        }
        const data = transformModules.before.stepFn(step, results);
        return data;
    }// preProcessStepResults
}

module.exports = new Transformer()
