const mongo = require('./mongo');
const {Pipeline} = require("../../index");

const getAllNodes = () => {
    return mongo.getDatabase()
        .then((db) => {
            const coll = db.db().collection("nodes");
            return coll.find().toArray().then((rows) => {
                // log the rows
                rows.forEach(row => {
                    console.log(`getAllNodes() -> + ${(row.length)} rows.`);
                });
                return [null, rows];
            });
        })
        .catch((err) => {
            console.log(err);
            return [err];
        });
};


const getAllPipelines = () => {
    return mongo.getDatabase()
        .then((db) => {
            const coll = db.db().collection("pipelines");
            return coll.find().toArray().then((rows) => {
                // log the rows
                rows.forEach(row => {
                    console.log(`getAllPipelines() -> + ${(row.length)} rows.`);
                });
                return [null, rows];
            });
        })
        .catch((err) => {
            console.log(err);
            return [err];
        });
}

const getNodeByUUID = (nodeUUID) => {
    console.log("getNodeByUUID uuid: " + nodeUUID);

    return mongo.getDatabase()
        .then((db) => {

            const coll = db.db().collection("nodes");
            return coll.findOne({"uuid": nodeUUID}).then((row) => {
                // log the rows
                console.debug(`getNodeByUUID(${nodeUUID})-> ${JSON.stringify(row)}`);
                return [null, row];
            });
        })
        .catch((err) => {
            console.log(err);
            return [err];
        });
};

const getPipelineByUUID = (pipelineUUID) => {
    console.log("getPipelineByUUID uuid: " + pipelineUUID);

    return mongo.getDatabase()
        .then((db) => {

            const coll = db.db().collection("pipelines");
            return coll.findOne({"uuid": pipelineUUID})
                .then((row) => {
                    // log the row
                    console.debug(`getPipelineByUUID(${pipelineUUID})-> ${JSON.stringify(row)}`);
                    return [null, row];
                })
                .catch((err) => {
                    console.log(err);
                    return [err];
                });
        })
        .catch((err) => {
            console.log(err);
            return [err];
        });
};

const savePipeline = (pipelineDoc) => {
    return mongo.getDatabase()
        .then((db) => {
            const coll = db.db().collection("pipelines");
            new Pipeline(pipelineDoc);// validate
            return coll.insertOne(pipelineDoc)
                .then((result) => {
                    pipelineDoc._id = result.insertedId;
                    console.log("savePipeline: result: " + JSON.stringify(result));
                    return [null, pipelineDoc];
                })
                .catch((err) => {
                    console.log(err);
                    return [err];
                });
        })
        .catch((err) => {
            throw [err];
        })
};

const saveNode = (nodeDoc) => {
    return mongo.getDatabase()
        .then((db) => {

            const coll = db.db().collection("nodes");
            return coll.insertOne(nodeDoc)
                .then((result) => {
                    console.log("saveNode result: " + JSON.stringify(result));
                    return [null, result];
                })
                .catch((err) => {
                    console.log(err);
                    return [err];
                });
        })
        .catch((err) => {
            return [err];
        })
};


module.exports = {
    "getAllNodes": getAllNodes,
    "getAllPipelines": getAllPipelines,
    "getNodeByUUID": getNodeByUUID,
    "getPipelineByUUID": getPipelineByUUID,
    "savePipeline": savePipeline,
    "saveNode": saveNode,
};
