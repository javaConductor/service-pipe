const HTTPJSONProcessor = require('./httpJSONProcessor');

class ProcessorManager{
    constructor(processors=[]) {
        this.processors = [new HTTPJSONProcessor({}), ...processors];
    }

    getStepProcessor(step){
        return  (this.processors.find((processor)=> processor.canProcess(step)));
    }
}

module.exports = new ProcessorManager();
