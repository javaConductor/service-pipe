const request = require('supertest');
const assert = require('assert');
const {app} = require('../../server');
const dataRepo = require("../../src/db/data-repo");

describe('POST /register', () => {
    it('should create a new user', (doneFn) => {

        const registration = {
            username: 'javaconductor.' + Date.now() + '',
            password: '9555589'
        }

        request(app)
            .post('/register')
            .send(registration)
            .expect(201)
            .expect('Content-Type', /json/)
            .then(response => {
                assert.equal(response.body.username, registration.username, 'Username should be ' + registration.username);
                console.log(`Registered username: ${response.body.username}`);
                doneFn()
            }).catch((err) => {
            doneFn(err)
        });
    });
});


describe('POST /login', () => {
    it('should login the new user', (doneFn) => {

        const registration = {
            username: 'javaconductor.' + Date.now(),
            password: '9555589'
        }
        const theLogin = {
            username: registration.username,
            password: '9555589'
        }

        request(app)
            .post('/register')
            .send(registration)
            .expect(201)
            .expect('Content-Type', /json/)
            .then(response => {
                assert.equal(response.body.username, registration.username, 'Username should be ' + registration.username);
                console.log(`Registered username: ${response.body.username}`);

                request(app)
                    .post('/login')
                    .send(theLogin)
                    .expect(200)
                    .expect('Content-Type', /json/)
                    .then(response => {
                        assert.ok(response.body.token, 'No token returned');
                        console.log(`Login: ${registration.username}`);

                        /// check the cookie for the refreshToken
                        // Access the 'set-cookie' header
                        const setCookieHeader = response.headers['set-cookie'];
                        assert.ok(setCookieHeader, 'set-cookie header is present');

                        // Parse the cookie string
                        const cookieString = setCookieHeader[0]; // Assuming only one cookie is set
                        const [cookiePart, ...attributes] = cookieString.split(';');
                        const [name, value] = cookiePart.split('=');

                        // Assert cookie name and value
                        assert.strictEqual(name, 'refreshToken', 'Cookie name is correct');

                        // console.log(name, value)
                        doneFn()
                    });

                //doneFn()
            }).catch((err) => {
            doneFn(err)
        });

    });
});
