const Pipeline = require("./pipeline");
const PipelineNode = require("./pipelineNode");
const PipelineStep = require("./pipelineStep");
const PipelineRequest = require(  "./pipelineRequest");

const tdgCreateUserNode = new PipelineNode({
    id: 777,
    name: "Tdg Login",
    url: 'http://localhost:8080/',
    method: "POST",
    headers: {
        Accept: 'application/json',
        "Cache-Control": 'no-cache',
        "Content-Type": 'application/json'
    },
    nodeData: {},
    payload: {
        "type": "createAccount",
        "organization": "$dev2$",
        "password": "password",
        "email": "pipeline3@yahoo.com",
        "status": "Active"
    },
    contentType: "application/json"
});
const tdgLoginNode = new PipelineNode({
    id: 777,
    name: "Tdg Login",
    url: 'http://localhost:8080/',
    method: "POST",
    headers: {
        Accept: 'application/json',
        "Cache-Control": 'no-cache',
        "Content-Type": 'application/json'
    },
    nodeData: {},
    payload: {
        "type": "authenticate",
        "username": "me@you.us",
        "password": "password"
    },
    contentType: "application/json"
});

const tdgCreateUserStep = new PipelineStep({
    name: 'Tdg Create User',
    node: tdgCreateUserNode,
    params: {},
    data: {},
    extract:{
        org: "organization",
        key: "apiKey"
    }
});

const tdgLoginStep = new PipelineStep({
    name: 'Tdg Login',
    node: tdgLoginNode,
    params: {},
    data: {},
    extract:{}
});

const pipeline = new Pipeline({
    name: "TDG Pipeline 1",
    nodes: [tdgCreateUserNode],
    steps: [tdgCreateUserStep]
});


const pipelineRequest  = new PipelineRequest(pipeline, {});

runIt = async () => {
    const response = await pipelineRequest.start();
    console.log(`response: ${JSON.stringify(response)}`);
}

runIt();