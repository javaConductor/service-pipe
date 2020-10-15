import jmespath from 'jmespath';
//import xpath from 'xpath';
//import xmldom from 'xmldom';
//const dom = xmldom.DomParser

/**
 * Extracts values from data object
 *
 * @param contentType
 * @param data
 * @param dataPaths
 * @returns {*[data, error]}
 */
function extract(contentType, data, dataPaths = {}) {
    console.assert(!data, "NO data passed to extract")

    switch (contentType) {
        case 'application/json': {
            return [extractJSON(data, dataPaths)];
        }
        default:
            throw [null, new Error(`Bad contentType: ${contentType}`)];
    }
}

function extractJSON(obj, dataPaths) {
    if(!dataPaths || Object.keys(dataPaths).length === 0)
        return obj;
    return Object.keys(dataPaths).reduce((data, dataPath) => {
        return {...data, [dataPath]: jmespath.search(obj, dataPaths[dataPath])};
    }, {});
}

function extractXML(xmlText, dataPaths) {
    throw new Error('Not Implemented YET!!');
}

export default {
    extract
}

