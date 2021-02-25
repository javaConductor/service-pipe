const chai = require('chai');
const assert = chai.assert;
const should = chai.should();
const expect = chai.expect;

const {v4: uuid} = require('uuid');
const PipelineRequest = require("../../src/pipelineRequest");
const Pipeline = require("../../src/model/pipeline");
const PipelineNode = require("../../src/model/pipelineNode");
const PipelineStep = require("../../src/model/pipe");

const AggregationExtraction = require('../../src/processors/aggregateExtraction');

describe('Aggregation Step', function () {
  describe('Aggregate Result Extraction', function () {

    it('should extract results of aggregate calls', function (doneFn) {

      const statLinksNode = new PipelineNode({
        "id": 777,
        "name": "test.statsLink",
        "uuid": "test.statsLink",
        "url": "http://localhost:3001/num_stats",
        "method": "GET",
        "uuid": "UUID_777",
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
          "uuid": "UUID_7770",
          "name": "test.stat",
          "url": "http://localhost:3001/${statName}",
          "method": "POST",
          "headers": {
            "Accept": "application/json",
            "Cache-Control": "no-cache",
            "Content-Type": "application/json",
          },
          payload: {},
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
        "uuid": "UUID_777",

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
          "uuid": "UUID_7770",
          "name": "test.stat",
          "url": "http://localhost:3001/${statName}",
          "method": "POST",
          "headers": {
            "Accept": "application/json",
            "Cache-Control": "no-cache",
            "Content-Type": "application/json",
          },
          payload: {},
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
        "uuid": "test.statsLink",
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
        "uuid": "test.stat",
        "url": "http://localhost:3001/${statName}",
        "method": "POST",
        "headers": {
          "Accept": "application/json",
          "Cache-Control": "no-cache",
          "Content-Type": "application/json",
        },
        payload: {},
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
        uuid: uuid(),
        extract: {
          stats: "stats"
        },
        name: "Num stats", "params": {},
        "data": {},
        steps: [linksStep, statStep]
      });

      console.log(`Pipeline: ${JSON.stringify(pipeline, null, 2)}`);
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

    it('should group results of aggregate calls as an object in parallel', function (doneFn) {

      const statLinksNode = new PipelineNode({
        "id": 777,
        "name": "test.statsLink",
        "uuid": "test.statsLink",
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
          "uuid": "test.stat",
          "url": "http://localhost:3001/${statName}",
          "method": "POST",
          "headers": {
            "Accept": "application/json",
            "Cache-Control": "no-cache",
            "Content-Type": "application/json",
          },
          payload: {},
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
        parallelStep: true,
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
        uuid: "Num stats",
        name: "Num stats",
        "params": {},
        "data": {},
        steps: [linksStep, statStep]
      });

      const pipelineRequest = new PipelineRequest(
        pipeline,
        {
          numbers: [5, 10, 15, 20]
        });
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

    it('should create string from transform', function (doneFn) {

      const statNode = new PipelineNode({
          "id": 7770,
          "name": "test.stat",
          "uuid": "test.stat",
          "url": "http://localhost:3001/${statName}",
          "method": "POST",
          "headers": {
            "Accept": "application/json",
            "Cache-Control": "no-cache",
            "Content-Type": "application/json",
          },
          payload: {},
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
        parallelStep: true,
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
          statString: "statString"
        },
        name: "Num stats",
        uuid: "Num stats",
        "params": {},
        "data": {},
        steps: [statStep],
        transformModules: {
          after: [{
            name: "makeStatString",
            modPath: "./makeString",
            stepFn: (pipeline, step, data) => {
              const s = `Sum: ${data.stats.sum} Avg: ${data.stats.avg} Min: ${data.stats.min} Max: ${data.stats.max}`;
              const newData = {...data, statString: s};
              return [newData,];
            },
          }],
          before: [],
        },
      });

      const pipelineRequest = new PipelineRequest(pipeline, {numbers: [5, 10, 15, 20]});
      try {
        pipelineRequest.start().then(([response, pipelineHistory, err]) => {
            should.not.exist(err);
            expect(pipelineHistory).to.be.an('array');
            expect(pipelineHistory).to.have.lengthOf(12);
            expect(response.statString).to.equal("Sum: 50 Avg: 12.5 Min: 5 Max: 20");
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
