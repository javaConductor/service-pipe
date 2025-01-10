//import xpath from 'xpath';
//import xmldom from 'xmldom';
//const dom = xmldom.DomParser
module.exports = (function (jmespath) {
    /**
     * Extracts values from data object
     *
     * for each key/value in dataPaths {
     *     find data[dataPath.key]
     *     add to extracted[dataPath.key]
     * }
     * return the extracted
     *
     * @param contentType only supports "application/json
     * @param data DATA to extract from using dataPath.value
     * @param dataPaths  objects like {"pathToStore" : "pathToExtract"}
     * @returns {*[data, error]}
     */
    function extract(contentType, data, dataPaths = {}) {
      console.assert(data, `NO data passed to extract: [${JSON.stringify(data)}] `);
      switch (contentType) {
        case 'application/json': {
          return [extractJSON(data, dataPaths)];
        }
        default:
          return [null, new Error(`Bad contentType: ${contentType}`)];
      }
    }

    function extractJSON(obj, dataPaths) {
      if (!dataPaths || Object.keys(dataPaths).length === 0)
        return obj;
      const extracted = Object.keys(dataPaths).reduce((data, dataPath) => {
        return {...data, [dataPath]: jmespath.search(obj, dataPaths[dataPath])};
      }, {});
      return extracted;
    }

    // function extractXML(xmlText, dataPaths) {
    //   throw new Error('Not Implemented YET!!');
    // }

    return {extract};
  }
)(require('jmespath'));
