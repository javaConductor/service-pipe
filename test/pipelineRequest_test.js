const chai = require('chai');
const assert = chai.assert;
const should = chai.should();
const expect = chai.expect;
const nock = require('nock');
const Pipeline = require("../src/model/pipeline");
const PipelineStep = require("../src/model/pipelineStep");
const PipelineRequest = require("../src/pipelineRequest");
const Loader = require("../src/loader");

const Nodes = require("../src/nodes");
const testNodes = new Nodes('./test/nodes');

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
            nock('https://sum.acme.com')
                .post('/')
                .reply(200, {
                    "success": "true"
                });
        });

        it('should run manually created pipeline', function () {
            const tdgCreateUserStep = new PipelineStep({
                name: 'Tdg Create User',
                nodeName: "tdgCreateUserNode",
                node: testNodes.getNode('tdgCreateUserNode'),
                params: {},
                data: {},
                extract: {
                    org: "organization",
                    key: "apiKey"
                }
            });
            const tdgLoginStep = new PipelineStep({
                name: 'Tdg Login',
                node: testNodes.getNode('tdgLoginNode'),
                params: {},
                data: {},
                extract: {}
            });
            const pipeline = new Pipeline({
                name: "TDG Pipeline 1",
                nodes: [testNodes.getNode('tdgCreateUserNode'), testNodes.getNode('tdgLoginNode')],
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
            const pipelineRequest = new PipelineRequest(pipeline, {
                username: `BigMan@acme.com`,
                password: "password"
            });

            return pipelineRequest.start().then((response) => {
                    assert.equal('object', typeof response, 'Should be an object');
                    console.log(`Response: ${JSON.stringify( response)}`);
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

        it('should return message:string and values:object and list:array', function () {
            const pipeline = new Loader(new Nodes('./test/nodes')).loadPipeline("./test/testPipelineObjInPayload.ppln.json");
            const testValues = {age: 12, city: "Chicago"};
            const testList = ['a', 'b', 'c'];
            const pipelineRequest = new PipelineRequest(pipeline, {
                message: `This is the message`,
                values: testValues,
                list: testList
            });

            return pipelineRequest.start().then((response) => {
                    assert.equal('object', typeof response, 'Should be an object');
                    assert.equal(response["message"], "This is the message");
                    assert.deepEqual(response["values"], testValues, "'values' do not match.");
                    assert.deepEqual(response["list"], testList, "'list' does not match.");
                },
                (reason) => {
                    assert.fail(reason);
                }
            );
        });
    })
});
