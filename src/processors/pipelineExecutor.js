const dataRepo = require("../db/data-repo");
const PipelineRequest = require("../pipelineRequest");
const dbRepo = require("../db/data-repo");
const PipelineNode = require('../model/pipelineNode')

class PipelineExecutor {

    /**
     *
     * @param uuid
     * @param initialData
     * @returns {Promise<[error, pipelineUUID, results]>}
     */
    async executePipeline(uuid, initialData) {

        async function addPipelineNodes(pipeline) {
            const pList = [];

            pipeline.steps.forEach((step) => {
                const nodeUUID = step.nodeUUID;
                const p = dbRepo.getNodeByUUID(nodeUUID)
                    .then(([err, node]) => {
                        if (err) {
                            throw err;
                        }
                        console.debug(`addPipelineNodes:Node: ${JSON.stringify(node)}`);
                        step.node = new PipelineNode(node);
                    })
                    .catch((err) => {
                        console.debug(`addPipelineNodes:err: ${JSON.stringify(err)}`);
                        throw err;
                    })
                pList.push(p);
            });
            return Promise.all(pList);
        }

        /// Get the pipeline from uuid
        const [err, pipeline] = await dataRepo.getPipelineByUUID(uuid);
        if (err)
            return [err, uuid, []];

        /// check if pipeline exists
        if (!pipeline) {
            const msg = `No such pipeline: ${uuid}`;
            console.warn(`executePipeline: ${msg}`)
            return [msg, uuid]
        }

        /// this adds the node objects to the steps
        await addPipelineNodes(pipeline)

        /// Create pipeline request
        const pr = new PipelineRequest(pipeline, initialData);
        console.debug(`PipelineExecutor.executePipeline: pipelineRequest: ${JSON.stringify(pr)}\n`);

        /// Execute pipeline
        const [pipelineErr, results] = await pr.start()
        if (pipelineErr) {
            console.warn(`pipelineExecutor:getPipelineByUUID: Error: ${JSON.stringify(pipelineErr)}`);
            // console.log(`pipelineExecutor:getPipelineByUUID: History: ${JSON.stringify(history, null, 2)}`);
            const errMsg = `[${pr.pipeline.name}]:${pr.pipeline.uuid}: ${pipelineErr.toString()}`;
            return [errMsg, uuid];
        }

        //TODO Store the execution History
        return [null, uuid, results];
    }

    async executeStep(pipeline, step, initialData) {

    }

    async executePipelineStep(pipelineUUID, stepIndex, initialData) {

    }
}

module.exports = PipelineExecutor;
