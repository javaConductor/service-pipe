const dataRepo = require("../db/data-repo");
const PipelineRequest = require("../pipelineRequest");
const dbRepo = require("../db/data-repo");
const PipelineNode = require('../model/pipelineNode')

class PipelineExecutor {

    /**
     *
     * @param step
     * @returns {Promise<step>}
     */
    async prepareStep(step) {

        const nodeUUID = step.nodeUUID;
        const [err, node] = await dbRepo.getNodeByUUID(nodeUUID);
        if (err) {
            const msg = `prepareStep: error reading node: ${nodeUUID} : ${JSON.stringify(err)}`;
            console.debug(msg);
            throw msg
        }

        // Create Node obj
        console.debug(`addPipelineNodes:Node: ${JSON.stringify(node)}`);
        step.node = new PipelineNode(node);

        /// Compile transform functions if any
        if (step.transformModules) {
            try {
                if (step.transformModules.before
                    && step.transformModules.before.stepFnSrc
                ) {
                    step.transformModules.before.stepFn = eval(step.transformModules.before.stepFnSrc)
                }
            } catch (err) {
                const msg = `Error compiling before transform function. Step: [${step.name}] -> ${err.toString()}`;
                console.warn(msg)
                throw msg;
            }

            try {
                if (step.transformModules.after
                    && step.transformModules.after.stepFnSrc
                ) {
                    step.transformModules.after.stepFn = eval(step.transformModules.after.stepFnSrc)
                }
            } catch (err) {
                const msg = `Error compiling after transform function. Step: [${step.name}] -> ${err.toString()}`;
                console.warn(msg)
                throw msg;
            }
        }
        return step
    }

    async preparePipeline(pipeline) {
        const pSteps = pipeline.steps.map((step) => {
            const ps = this.prepareStep(step);
            console.log(`Preparing step: [${step.name}]`)
            return ps;
        });

        console.log(`Waiting for steps to be Prepared.`)
        pipeline.steps = await Promise.all(pSteps)
        return pipeline
    }

    /**
     *
     * @param uuid
     * @param initialData
     * @returns {Promise<[error, pipelineUUID, results]>}
     */
    async executePipeline(uuid, initialData) {


        /// Get the pipeline from uuid
        let [err, pipeline] = await dataRepo.getPipelineByUUID(uuid);
        if (err)
            return [err, uuid, []];

        /// check if pipeline exists
        if (!pipeline) {
            const msg = `No such pipeline: ${uuid}`;
            console.warn(`executePipeline: ${msg}`)
            return [msg, uuid]
        }

        console.log(`Got pipeline ${pipeline.uuid}`)
        /// this adds the node objects to the steps
        pipeline = await this.preparePipeline(pipeline)

        console.log(`Prepared pipeline ${pipeline.uuid}`)

        /// Create pipeline request
        const pr = new PipelineRequest(pipeline, initialData);
        console.debug(`PipelineExecutor.executePipeline: pipelineRequest: ${JSON.stringify(pr)}\n`);

        /// Execute pipeline
        const [pipelineErr, results] = await pr.start()
        if (pipelineErr) {
            console.warn(`pipelineExecutor:getPipelineByUUID: Error: ${JSON.stringify(pipelineErr)}`);
            // console.log(`pipelineExecutor:getPipelineByUUID: History: ${JSON.stringify(history, null, 2)}`);
            const errMsg = `[${pr.pipeline.name}]:${pr.pipeline.uuid}: ${JSON.stringify(pipelineErr)}`;
            return [errMsg, uuid];
        }

        //TODO Store the execution History
        return [null, uuid, results];
    }

    /**
     *
     * @param pipelineUUID
     * @param stepIndex
     * @param initialData
     * @returns {Promise<[string, results]>}
     */
    async executePipelineStep(pipelineUUID, stepIndex, initialData) {
        /// Get the pipeline from uuid
        let [err, pipeline] = await dataRepo.getPipelineByUUID(pipelineUUID);
        if (err)
            return [err];

        /// check if pipeline exists
        if (!pipeline) {
            const msg = `No such pipeline: ${pipelineUUID}`;
            console.warn(`executePipeline: ${msg}`)
            return [msg]
        }


        /// check if stepIndex in bounds
        if (stepIndex < 0 || stepIndex >= pipeline.steps.length) {
            const msg = `No such step at index ${stepIndex} for step: ${pipelineUUID}`;
            console.warn(`executePipelineStep: ${msg}`)
            return [msg]
        }

        //// prepare the step
        try {
            const step = await this.prepareStep(pipeline.steps[stepIndex]);

            /// Create pipeline request
            const pr = new PipelineRequest(pipeline, initialData);
            console.debug(`PipelineExecutor.executePipelineStep: pipelineRequest: ${JSON.stringify(pr)}\n`);
            /// execute the step
            return pr.executeStep(pipeline, step, initialData)
        } catch (e) {
            return [e.toString()];
        }

      
    }
}

module.exports = PipelineExecutor;
