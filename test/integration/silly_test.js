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

describe('PipelineRequest', function () {
    describe('start', function () {
        // noinspection DuplicatedCode
        it('should return the stats on ann array of numbers', function (doneFn) {

            const statLinksNode = new PipelineNode({
                    "id": 777,
                    "name": "test.statsLink",
                    "url": "http://localhost:3001/num_stats",
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
                        "message": "error",
                        "documentation_url": "documentation_url"
                    },
                    "errorMessages": {
                        "message": "message",
                        "documentation_url": "documentation_url"
                    },
                    "contentType": "application/json"
                }
            );

            const statNode = new PipelineNode({
                    "id": 7770,
                    "name": "test.sum",
                    "url": "http://localhost:3001/${statName}",
                    "method": "POST",
                    "headers": {
                        "Accept": "application/json",
                        "Cache-Control": "no-cache",
                        "Content-Type": "application/json",
                    },
                    payload: {
                        "numbers": "array:"
                    },
                    "errorIndicators": {
                        "message": "error",
                        "documentation_url": "documentation_url"
                    },
                    "errorMessages": {
                        "message": "message",
                        "documentation_url": "documentation_url"
                    },
                    "contentType": "application/json"
                }
            );

            const linksStep = new PipelineStep({
                "name": "Stat links",
                "description": "Get the list of stat urls for a list of numbers",
                node: statLinksNode,
                "params": {},
                "data": {},
                "extract": {
                    "links": "array:"
                }
            });

            const statStep = new PipelineStep({
                "name": "Stat Step",
                "description": "Calculate a statistic of a list of numbers",
                node: statNode,
                "params": {},
                "data": {
                    stats: ["sum", "avg", "min", "max"]
                },
                "extract": {
                    "sum": "sum",
                    "min": "min",
                    "max": "max",
                    "avg": "avg"
                },
                aggregateStep: true,
                "dataArrayProperty": "stats",
                // Key:     Key used in the data for the node call
                // Value:   jmsepath of the value inside the element or datatype ( or "") to use whole element
                "aggregateExtract": {
                    "aggKey": "statName",
                },
                "outputArrayProperty": "stats",//should be a list of branchData
            });

            const pipeline = new Pipeline({
                extract: {
                    stats: "stats"
                },
                name: "Num stats", "params": {},
                "data": {},
                steps: [linksStep, statStep]
            });

            const pipelineRequest = new PipelineRequest(pipeline, {numbers: [5, 10, 15, 20]});
            try {
                pipelineRequest.start().then(([response, pipelineHistory, err]) => {
                        should.not.exist(err);
                        expect(pipelineHistory).to.be.an('array');
                        expect(response).to.be.an('object');
                        expect(response.stats).to.be.an('array');
                        expect(response.stats).to.have.lengthOf(4);

                        //console.log(`${JSON.stringify(pipelineHistory)}`)
                        console.log(`TEST::: ${JSON.stringify(pipelineHistory, null, 2)}`);
                        expect(pipelineHistory).to.have.lengthOf(13);
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
