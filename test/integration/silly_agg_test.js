const chai = require('chai');
const assert = chai.assert;
const should = chai.should();
const expect = chai.expect;

const PipelineRequest = require("../../src/pipelineRequest");
const Pipeline = require("../../src/model/pipeline");
const PipelineNode = require("../../src/model/pipelineNode");
const PipelineStep = require("../../src/model/pipelineStep");

const AggregationExtraction = require('../../src/model/aggregateExtraction');
const Loader = require("../../src/loader");

const Nodes = require("../../src/nodes");
const testNodes = new Nodes('./test/nodes');

describe('Aggregation Step', function () {
    describe('Aggregate Result Extraction', function () {
        // noinspection DuplicatedCode
        it('should extract results of aggregate calls', function (doneFn) {

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
                    "name": "test.stat",
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
                    "aggDataKey": "statName",
                },
                "outputArrayProperty": "stats",//should be a list of branchData
            });

            const pipeline = new Pipeline({
                extract: {
                    "sum": "sum",
                    "min": "min",
                    "max": "max",
                    "avg": "avg"
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
                        expect(response.sum).to.equal(50);
                        expect(response.max).to.equal(20);
                        expect(response.min).to.equal(5);
                        expect(response.avg).to.equal(12.5);
                        expect(pipelineHistory).to.have.lengthOf(15);
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

        it('should group results of aggregate calls as an array', function (doneFn) {

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
                    "name": "test.stat",
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
                    "aggDataKey": "statName",
                    aggExtractionType: AggregationExtraction.Types.AsArray
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
                        console.log(`TEST::: ${JSON.stringify(pipelineHistory, null, 2)}`);
                        expect(response).to.be.an('object');
                        expect(response.stats).to.be.an('array');
                        expect(response.stats).to.have.lengthOf(4);

                        //console.log(`${JSON.stringify(pipelineHistory)}`)
                        expect(pipelineHistory).to.have.lengthOf(15);
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

        it('should group results of aggregate calls as an object', function (doneFn) {

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
                    "name": "test.stat",
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
                    "aggDataKey": "statName",
                    aggExtractionType: AggregationExtraction.Types.AsObject
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
                        expect(response.stats).to.be.an('object');
                        expect(response.stats.sum).to.equal(50);
                        expect(response.stats.max).to.equal(20);
                        expect(response.stats.min).to.equal(5);
                        expect(response.stats.avg).to.equal(12.5);
                        expect(pipelineHistory).to.have.lengthOf(15);
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
