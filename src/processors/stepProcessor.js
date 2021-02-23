const PipelineStep = require('../model/pipe');

class StepProcessor {
  constructor(processorProps) {
    this.stepType = PipelineStep.StepTypes.HTTP_JSON;
  }

  canProcess(step) {
    throw new Error('This method must be overloaded:canProcess.');
  }

  async processStep(pipeline, step, data) {
    throw new Error('This method must be overloaded:processStep.');
  }

  async aggregateStep(pipeline, step, data) {
    throw new Error('This method must be overloaded:aggregateStep.');
  }
}

module.exports = StepProcessor;
