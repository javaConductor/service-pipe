const request = require('supertest');
const assert = require('assert');
const {app} = require('../../server');

describe('POST /register', () => {
    it('should create a new user', (doneFn) => {

        const registration = {
            username: 'javaconductor.'+Date.now()+'',
            password: '9555589'
        }

        request(app)
            .post('/register')
            .send(registration)
            .expect(201)
            .expect('Content-Type', /json/)
            .then(response => {
                assert.equal(response.body.username, registration.username, 'Username should be '+registration.username);
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
            username: 'javaconductor'+Date.now(),
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
                assert.equal(response.body.username, registration.username, 'Username should be '+registration.username);
                console.log(`Registered username: ${response.body.username}`);
                doneFn()
            }).catch((err) => {
            doneFn(err)
        });

        request(app)
            .post('/login')
            .send(registration)
            .expect(200)
            .expect('Content-Type', /json/)
            .then(response => {
                assert.notEqual(response.body.token, '', 'No token returned');
                console.log(`Login: ${ registration.username} -> ${response.body.token}`);
                doneFn()
            });



    });
});