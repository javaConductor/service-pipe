const Pipeline = require("./model/pipeline");
const PipelineNode = require("./model/pipelineNode");
const PipelineStep = require("./model/pipelineStep");
const PipelineRequest = require("./pipelineRequest");

const tdgCreateUserNode = new PipelineNode({
    id: 777,
    name: "tdgCreateUserNode",
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
        "password": "${password}",
        "email": "${username}",
        "status": "Active",
        num: 23,
    },
    contentType: "application/json"
});
const tdgLoginNode = new PipelineNode({
    id: 777,
    name: "tdgLoginNode",
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
        "username": "${username}",
        "password": "${password}"
    },
    contentType: "application/json"
});

const tdgCreateUserStep = new PipelineStep({
    name: 'Tdg Create User',
    nodeName: "tdgCreateUserNode",
    params: {},
    data: {},
    extract: {
        org: "organization",
        key: "apiKey"
    }
});

const tdgLoginStep = new PipelineStep({
    name: 'Tdg Login',
    nodeName: 'tdgLoginNode',
    params: {},
    data: {},
    extract: {}
});

const pipeline = new Pipeline({
    name: "TDG Pipeline 1",
    nodes: [tdgCreateUserNode, tdgLoginNode],
    steps: [tdgCreateUserStep, tdgLoginStep]
});

const pipelineRequest = new PipelineRequest(pipeline, {
    username: `OneMo_${new Date().getTime()}@mine.sget`,
    password: "password"
});

runIt = async () => {
    const response = await pipelineRequest.start();
    console.log(`response: ${JSON.stringify(response)}`);
}

runIt();
