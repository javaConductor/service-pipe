const chai = require('chai');
const assert = chai.assert;
const should = chai.should();

const {extract} = require('../src/extractor');

describe('Extractor', function () {
    describe('extract', function () {
        it('should extract one number', function () {
            const [data,err] = extract("application/json",
                {first: 'the first one', second: 'the second one'},
                { one: 'first' })

            should.not.exist(err);
            assert.lengthOf( Object.keys( data ),   1, 'Length should be 1');
            assert.equal(data['one'], 'the first one', 'Should extract element with key item');
        });

        it('should extract one number at depth 2', function () {
            const [data,err] = extract("application/json",
                { firstObject: {first: 'the first one', second: 'the second one'}},
                { one: 'firstObject.first' })

            should.not.exist(err);
            assert.lengthOf( Object.keys( data ),   1, 'Length should be 1');
            assert.equal(data['one'], 'the first one', 'Should extract element with key item');
        });
    });
});

const f = () => { 0 }
