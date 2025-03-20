const request = require('supertest');
const assert = require('assert');
const {app} = require('../../server');
const dataRepo = require('../../src/db/data-repo');
const {whileLoggedIn} = require("../testHelper");

describe('GET /pipeline', () => {

    let server = null;
    before(() => {
        server = app.listen(3000);
    })
    after(() => {
        server.close();
    })

    it('should fetch all pipelines with no user using helper', async () => {
        return new Promise(async (resolve, reject) => {
            return whileLoggedIn(server, async (app, username, token) => {
                const authHeader = `Bearer ${token}`;


                const pResponse = request(app)
                    .get('/pipeline')
                    .set('Authorization', authHeader)
                    .expect(200)
                    .expect('Content-Type', /json/)

                // console.log(`Get all pipelines w/ no owner: ${JSON.stringify(getPipelinesResponse.body)}`);

                pResponse.then(getPipelinesResponse => {
                    console.log(` getPipelinesResponse : ${JSON.stringify((getPipelinesResponse._body))}`)

                    assert.ok(getPipelinesResponse.body.length > 0); // OK

                    for (const pipeline of getPipelinesResponse.body) {
                        assert.ok(!pipeline.username, `pipeline should have no user but has ${pipeline.username}`);
                    }

                    resolve(getPipelinesResponse.body)
                    return getPipelinesResponse
                })
                pResponse.catch(err => {
                    console.error(`error: ${err}`)
                    assert.fail(err)
                    reject(err)
                });
                return pResponse;
            })
        })

    })

})
