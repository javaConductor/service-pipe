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
                        expect(response.allOfIt).to.be.an('array');
                        //console.log(`${JSON.stringify(pipelineHistory)}`)
                        console.log(`TEST::: ${JSON.stringify(response)}`);
                        expect(pipelineHistory).to.have.lengthOf(5);
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
        it('should return list of branches from GitHub', function (doneFn) {

            const githubRepoListNode = new PipelineNode({
                    "id": 777,
                    "name": "test.githubReposJavaconductor",
                    "url": "https://api.github.com/users/javaconductor/repos",
                    "method": "GET",
                    "headers": {
                        "Accept": "application/json",
                        "Cache-Control": "no-cache",
                        "Content-Type": "application/json",
                    },
                    "authentication": {
                        "basic": {
                            "username": "javaconductor",
                            "password": "b8437c9248001df0dd9e279c96e02dcc98bd9e82"
                        }
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
            const githubBranchesNode = new PipelineNode({
                    "id": 777,
                    "name": "test.githubBranchesJavaconductor",
                    "url": "https://api.github.com/repos/javaConductor/${repoName}/branches",
                    "method": "GET",
                    "headers": {
                        "Accept": "application/json",
                        "Cache-Control": "no-cache",
                        "Content-Type": "application/json",
                    },

                    "authentication": {
                        "basic": {
                            "username": "javaconductor",
                            "password": "b8437c9248001df0dd9e279c96e02dcc98bd9e82"
                        }
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
                },
            });

            // data: {allOfIt: [{},{}] }
            /**
             *
             * @type {PipelineStep}
             */
            const repoBranchStep = new PipelineStep({
                "name": "Branch",
                "description": "Test GitHub",
                node: githubBranchesNode,
                "params": {},
                "data": {},
                "requiredProperty": {},
                "extract": {
                    "branchData": "object:"
                },
                aggregateStep: true,
                //No data property if we use the whole thing
                "dataArrayProperty": "allOfIt",
                // Key:     Key used in the data for the node call
                // Value:   jmsepath of the value inside the element or datatype ( or "") to use whole element
                "aggregateExtract": {
                    "aggKey": "repoName",
                    "dataPath": "name"
                },
                "outputArrayProperty": "branchInformation",//should be a list of branchData

            });

            const pipeline = new Pipeline({
                extract: {
                    "branchInformation": "branchInformation"
                },
                name: "Repos.Branches", "params": {},
                "data": {},
                steps: [repoListStep, repoBranchStep]
            });

            const pipelineRequest = new PipelineRequest(pipeline, {});
            try {
                return pipelineRequest.start().then(([response, pipelineHistory, err]) => {
                        should.not.exist(err);
                        expect(pipelineHistory).to.be.an('array');
                        expect(response).to.be.an('array');
                        //console.log(`${JSON.stringify(response)}`)
                        console.log(`TEST::: ${JSON.stringify(response)}`);
                        expect(pipelineHistory).to.have.lengthOf(65);
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
