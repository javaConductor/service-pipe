const chai = require('chai');
const assert = chai.assert;
const should = chai.should();
const expect = chai.expect;
const nock = require('nock');
const Pipeline = require("../src/model/pipeline");
const PipelineStep = require("../src/model/pipe");
const PipelineRequest = require("../src/pipelineRequest");
const Loader = require("../src/loader");

const testNodeFolder = './test/nodes';
const testPipelineFolder = './test';

const loader = new Loader(testPipelineFolder, testNodeFolder);

describe('PipelineRequest', function () {
  describe('start', function () {

    it('should run manually created pipeline', function () {
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

      const tdgCreateUserStep = new PipelineStep({
        name: 'Tdg Create User',
        nodeName: "tdgCreateUserNode",
        nodeUUID: "UUID-tdgCreateUserNode.node.json",

        node: loader.nodeRepo.getNode('UUID-tdgCreateUserNode.node.json'),
        params: {},
        data: {},
        extract: {
          org: "organization",
          key: "apiKey"
        }
      });
      const tdgLoginStep = new PipelineStep({
        name: 'Tdg Login',
        node: loader.nodeRepo.getNodeByName('tdgLoginNode'),
        params: {},
        data: {},
        extract: {}
      });
      const pipeline = new Pipeline({
        name: "TDG Pipeline 1",
        uuid: "xxyyzzz",
        nodes: [loader.nodeRepo.getNodeByName('tdgCreateUserNode'),
          loader.nodeRepo.getNodeByName('tdgLoginNode')],
        steps: [tdgCreateUserStep, tdgLoginStep]
      });

      //console.log(JSON.stringify(pipeline, null, 2));
      const pipelineRequest = new PipelineRequest(pipeline, {
        username: `BigMan@acme.com`,
        password: "password"
      });

      return pipelineRequest.start().then(([response, pipelineHistory, err]) => {
          should.not.exist(err);
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
          "expires": "2021-01-18T02:16:59.676-05:00"
        });
      const username = 'BigMan@acme.com';
      const password = 'password';
      const pipeline = loader.pipelineRepo.loadPipelineFile("./test/testPipeline1.ppln.json");
      const pipelineRequest = new PipelineRequest(pipeline, {username, password});

      return pipelineRequest.start().then(([response, pipelineHistory, err]) => {
          should.not.exist(err);
          assert.equal('object', typeof response, 'Should be an object');
          assert(response["username"], username);
          assert(response["password"], password);
          assert(response["key"], "a00541bf-15db-4d61-8077-604a07aa6b22");
          assert(response["token"], "d4c78800-5490-4de2-b50e-ffb96960d964");
          assert(response["expires"], "2021-01-18T02:16:59.676-05:00");
        },
        (reason) => {
          assert.fail(reason);
        }
      );
    });

    it('should return message:string and values:object and list:array', function () {
      nock('https://sum.acme.com')
        .post('/')
        .reply(200, {
          "success": true
        });
      const pipeline = loader.pipelineRepo.loadPipelineFile("./test/testPipelineObjInPayload.ppln.json");
      const testValues = {age: 12, city: "Chicago"};
      const testList = ['a', 'b', 'c'];
      const pipelineRequest = new PipelineRequest(pipeline, {
        message: `This is the message`,
        values: testValues,
        list: testList
      });

      return pipelineRequest.start().then(([response, pipelineHistory, err]) => {
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

    it('should report 404 error in single step', function () {
      nock('https://simplesingle.acme.com')
        .post('/')
        .reply(404, {});
      const pipeline = loader.pipelineRepo.loadPipelineFile("./test/testSimpleSingleStep.ppln.json");
      const pipelineRequest = new PipelineRequest(pipeline, {});
      return pipelineRequest.start().then(([response, pipelineHistory, err]) => {
          //console.log(`Error: ${JSON.stringify(err)}`);
          should.exist(err);
          assert.equal(err, 'Node: [test.simpleSingle] Not Found', 'Message Should match');
        },
        (reason) => {
          assert.fail(reason);
        }
      );
    });

    // noinspection DuplicatedCode
    it('should report error in response from single step', function () {
      const message = "There was an error.";
      nock('https://simplerror.acme.com')
        .post('/')
        .reply(200, {
          error: "Error in response",
          message
        });
      const pipeline = loader.pipelineRepo.loadPipeline("testSimpleError");
      const pipelineRequest = new PipelineRequest(pipeline, {});
      return pipelineRequest.start().then(([response, pipelineHistory, err]) => {
          should.exist(err);
          assert.equal(err, `${message}`);
          expect(pipelineHistory).to.be.an('array');
          expect(pipelineHistory).to.have.lengthOf(5); // Recommended
          assert.equal(pipelineHistory[4].errorMessage, `${message}`);
        },
        (reason) => {
          assert.fail(reason);
        }
      );
    });
    // noinspection DuplicatedCode
    it('should report error in response from step 1 of 2', function () {
      const message = "There was an error.";
      nock('https://simplerror.acme.com')
        .post('/')
        .reply(200, {
          error: "Error in response",
          message
        });
      nock('https://simplesingle.acme.com')
        .post('/')
        .reply(404, {});

      const pipeline = loader.pipelineRepo.loadPipelineFile("./test/testSimpleError.ppln.json");
      const pipelineRequest = new PipelineRequest(pipeline, {});
      return pipelineRequest.start().then(([response, pipelineHistory, err]) => {
          should.exist(err);
          assert.equal(err, `${message}`);
          expect(pipelineHistory).to.be.an('array');
          expect(pipelineHistory).to.have.lengthOf(5); // Recommended
          assert.equal(pipelineHistory[4].errorMessage, `${message}`);
        },
        (reason) => {
          assert.fail(reason);
        }
      );
    });
  })
});
