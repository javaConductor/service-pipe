const chai = require('chai');
const assert = chai.assert;
const should = chai.should();

const {extract} = require('../src/extractor');

describe('Extractor', function () {

  describe('extract', function () {
    it('should extract one number', function () {
      const [data, err] = extract("application/json",
        {first: 'the first one', second: 'the second one'},
        [
            {destinationElement:"one", sourceJmesPath: 'first'}
        ])

      should.not.exist(err);
      assert.lengthOf(Object.keys(data), 1, 'Length should be 1');
      assert.equal(data['one'], 'the first one', 'Should extract element with key item');
    });

    it('should extract one number at depth 2', function () {
      const [data, err] = extract("application/json",
        {firstObject: {first: 'the first one', second: 'the second one'}},
      [{destinationElement:"one", sourceJmesPath: 'firstObject.first'}]
    )

      should.not.exist(err);
      assert.lengthOf(Object.keys(data), 1, 'Length should be 1');
      assert.equal(data['one'], 'the first one', 'Should extract element with key item');
    });

    it('should copy complete input to element when "-" is the jmesPath', function () {

      const input = {firstObject: {first: 'the first one', second: 'the second one'}};
      const extracts = [{destinationElement:"all", sourceJmesPath: '-'}];

      const [data, err] = extract("application/json",
          input,
          extracts)

      should.not.exist(err);
      assert.lengthOf(Object.keys(data), 1, 'Length should be 1');

      assert.equal(data['all'], input, 'The input should be the value of "all" ')
    });

    it('should copy complete array to element when "-" is the jmesPath', function () {

      const input = [0,1,2,3,4,5,6,7,8,9];
      const extracts = [{destinationElement:"all", sourceJmesPath: '-'}];

      const [data, err] = extract("application/json",
          input,
          extracts)

      should.not.exist(err);
      assert.lengthOf(Object.keys(data), 1, 'Length should be 1');
      assert.equal(data['all'], input, 'The input should be the value of "all" ')
    });

    it('should fail for bad jmesPath', function () {

      const input = {firstObject: {first: 'the first one', second: 'the second one'}};
      const extracts = [{destinationElement:"bad", sourceJmesPath: '$$'}];

      const [, err] = extract("application/json",
          input,
          extracts)

      should.exist(err);
      assert.equal(err, "jmespath error: Unknown character:$")
    });

    it('should extract 0 value', function () {

      const input = {min: 0};
      const extracts = [{destinationElement:"minValue", sourceJmesPath: 'min'}];

      const [data, err] = extract("application/json",
          input,
          extracts)

      should.not.exist(err);
      assert.lengthOf(Object.keys(data), 1, 'Object should have 1 element');
      assert.exists(data['minValue'], "minValue should exist and be 0")
      assert.exists(data.minValue, "minValue should exist and be 0")
      assert.equal(data.minValue, 0, "minValue should exist and be 0")
    });

    it('should extract "0" value', function () {

      const input = {min: "0"};
      const extracts = [{destinationElement:"minValue", sourceJmesPath: 'min'}];

      const [data, err] = extract("application/json",
          input,
          extracts)

      should.not.exist(err);
      assert.lengthOf(Object.keys(data), 1, 'Object should have 1 element');
      assert.exists(data['minValue'], "minValue should exist and be 0")
      assert.exists(data.minValue, "minValue should exist and be '0'")
      assert.equal(data.minValue, '0', "minValue should exist and be '0'")

    });

  });
});
