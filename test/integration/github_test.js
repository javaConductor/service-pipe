const chai = require('chai');
const assert = chai.assert;
const should = chai.should();
const expect = chai.expect;

const PipelineRequest = require("../../src/pipelineRequest");
const Pipeline = require("../../src/model/pipeline");
const PipelineNode = require("../../src/model/pipelineNode");
const PipelineStep = require("../../src/model/pipelineStep");

const Loader = require("../../src/loader");

const Nodes = require("../../src/nodes");
const testNodes = new Nodes('./test/nodes');

describe('GitHubTest', function () {
    describe('start', function () {
        // noinspection DuplicatedCode
        it('should return list of repos from GitHub', function (doneFn) {

            const githubRepoListNode = new PipelineNode({
                    "id": 777,
                    "name": "test.githubReposJavaconductor",
                    "url": "https://api.github.com/users/javaconductor/repos",
                    "method": "GET",
                    "headers": {
                        "Accept": "application/json",
                        "Cache-Control": "no-cache",
                        "Content-Type": "application/json",
                        "Authorization": ""
                    },
                    "nodeData": {},
                    "payload": {},
                    "errorIndicators": {
                        "message": "message",
                        "documentation_url": "documentation_url"
                    },
                    "errorMessages": {
                        "message": "message",
                        "documentation_url": "documentation_url"
                    },
                    "contentType": "application/json"
                }
            );

            const repoListStep = new PipelineStep({
                "name": "Repos",
                "description": "Test GitHub",
                node: githubRepoListNode,
                "params": {},
                "data": {},
                "extract": {
                    "allOfIt": "array:"
                }
            });

            const pipeline = new Pipeline({
                extract: {
                    "allOfIt": "allOfIt[*].full_name"
                },
                name: "Repos", "params": {},
                "data": {},
                steps: [repoListStep]
            });

            //const pipeline = new Loader(testNodes).loadPipeline("./test/testGithubJavaconductor.ppln.json");
            const pipelineRequest = new PipelineRequest(pipeline, {});
            try {
                pipelineRequest.start().then(([response, pipelineHistory, err]) => {
                        should.not.exist(err);
                        expect(pipelineHistory).to.be.an('array');
                        expect(response).to.be.an('array');
                        //console.log(`${JSON.stringify(pipelineHistory)}`)
                        console.log(`TEST::: ${JSON.stringify(response)}`);
                        expect(pipelineHistory).to.have.lengthOf(4);
                        doneFn();
                    },
                    (reason) => {
                        assert.fail(reason);
                        doneFn(reason);
                    }
                );
            } catch (e) {
                assert.fail(e);
                doneFn(e);
            }
        });
    })
});
