const chai = require('chai');
const assert = chai.assert;
const should = chai.should();
const nock = require('nock');
const Pipeline = require("../src/pipeline");
const PipelineNode = require("../src/pipelineNode");
const PipelineStep = require("../src/pipelineStep");
const PipelineRequest = require("../src/pipelineRequest");
const Loader = require("../src/loader");
const defaultNodes = require("../src/nodes").default;

describe('PipelineRequest', function () {
    describe('start', function () {
        beforeEach(() => {
            nock('https://createuser.acme.com')
                .post('/')
                .reply(200, {
                    "type": "NewAccountResponse",
                    "organization": "$dev2$",
                    "apiKey": "a00541bf-15db-4d61-8077-604a07aa6b22"
                });
            nock('https://login.acme.com')
                .post('/')
                .reply(200, {
                    "type": "AuthResponse",
                    "token": "d4c78800-5490-4de2-b50e-ffb96960d964",
                    "expires": "2021-10-18T02:16:59.676-05:00"
                });
        });

        it('should run manually created pipeline', function () {
            const tdgCreateUserStep = new PipelineStep({
                name: 'Tdg Create User',
                nodeName: "tdgCreateUserNode",
                node: defaultNodes.getNode('tdgCreateUserNode'),
                params: {},
                data: {},
                extract: {
                    org: "organization",
                    key: "apiKey"
                }
            });
            const tdgLoginStep = new PipelineStep({
                name: 'Tdg Login',
                node: defaultNodes.getNode('tdgLoginNode'),
                params: {},
                data: {},
                extract: {}
            });
            const pipeline = new Pipeline({
                name: "TDG Pipeline 1",
                nodes: [defaultNodes.getNode('tdgCreateUserNode'), defaultNodes.getNode('tdgLoginNode')],
                steps: [tdgCreateUserStep, tdgLoginStep]
            });

            //console.log(JSON.stringify(pipeline, null, 2));
            const pipelineRequest = new PipelineRequest(pipeline, {
                username: `BigMan@acme.com`,
                password: "password"
            });

            return pipelineRequest.start().then((response) => {
                    assert.equal('object', typeof response, 'Should be an object');
                    assert(response.username, "BigMan@acme.com");
                    assert(response.password, "password");
                    assert(response.key, "a00541bf-15db-4d61-8077-604a07aa6b22");
                    assert(response.token, "d4c78800-5490-4de2-b50e-ffb96960d964");
                    assert(response.expires, "2021-10-18T02:16:59.676-05:00");
                },
                (reason) => {
                    assert.fail(reason);
                }
            );
        });

        it('should run pipeline from file', function () {

            const pipeline = new Loader().loadPipeline("./test/testPipeline1.ppln.json");
//            console.log(JSON.stringify(pipeline, null, 2));

            const pipelineRequest = new PipelineRequest(pipeline, {
                username: `BigMan@acme.com`,
                password: "password"
            });

            return pipelineRequest.start().then((response) => {
                    assert.equal('object', typeof response, 'Should be an object');
                    assert(response["username"], "BigMan@acme.com");
                    assert(response["password"], "password");
                    assert(response["key"], "a00541bf-15db-4d61-8077-604a07aa6b22");
                    assert(response["token"], "d4c78800-5490-4de2-b50e-ffb96960d964");
                    assert(response["expires"], "2021-10-18T02:16:59.676-05:00");
                },
                (reason) => {
                    assert.fail(reason);
                }
            );
        });
    })
})

