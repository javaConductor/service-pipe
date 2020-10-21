const chai = require('chai');
const assert = chai.assert;
const should = chai.should();
const expect = chai.expect;

const PipelineRequest = require("../../src/pipelineRequest");
const Loader = require("../../src/loader");

const Nodes = require("../../src/nodes");
const testNodes = new Nodes('./test/nodes');

describe('GitHubTest', function () {
    describe('start', function () {
        // noinspection DuplicatedCode
        it('should return list of repos from GitHub', function ( doneFn) {
            const message = "There was an error.";
            console.log(`${process.cwd()
            }`);

            const pipeline = new Loader(testNodes).loadPipeline("./test/testGithubJavaconductor.ppln.json");
            const pipelineRequest = new PipelineRequest(pipeline, {});
            pipelineRequest.start().then(([response, pipelineHistory, err]) => {
                    should.not.exist(err);
                    expect(pipelineHistory).to.be.an('array');
                    expect(response).to.be.an('object');
                    console.log(`TEST::: ${Object.keys(response)}`);
                    doneFn();
                    //expect(pipelineHistory).to.have.lengthOf(5); // Recommended
                    //assert.equal(pipelineHistory[4].errorMessage, `${message}`);
                },
                (reason) => {
                    assert.fail(reason);
                    doneFn(reason);
                }
            )
        });
    })
});
