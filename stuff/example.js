import axios from "axios";


function Param(name, theType) {
    return {
        name, type: theType
    }
}

class Node {

    constructor(nodeProps) {
        this.name = nodeProps.name;
        this.url = nodeProps.url;
        this.method = nodeProps.method;


    }

}

/**
 * returns a function to get the field give stepData object
 * @param name value name from service response
 */
function gather(name){

}

const sequence =
    [
        {/*step 1*/
            name: "get Number Node",
            node: getNumberNode,
            params: {
                seed: 10
            },
            data: {},
            extract: {
                number1: "number"
            }
        },
        {/*step 2*/
            name : "Get the Number",
            node: getNumberNode,
            params: {
                seed: 10
            },
            data: {},
            extract: {
                number2: "number"
            }
        },
        {}


    ]


const stepDataSample = {
    previousData: {},
    data: {},
    executionTime: Date(),
    resultCode: 200
}


async function start(sequence, initialData) {

    let data = initialData || {};
    /// loop thru each node in the sequence
    for (let step in sequence){

        const [stepData, err] = await processStep(step, data)
        if (err){
            throw new Error(`Error processing step: ${step.name}`)
        }
        const dataFromStep = extract( step, stepData );
        data = {...data, ...dataFromStep};
    }
    return data;
}


async function processStep(step, data){


    // use the data from the node in the step to make the HTTP call
    const realData = {...step.node.nodeData, ...data};

    const template = (tpl, args) => tpl.replace(/\${(\w+)}/g, (_, v) => args[v]);

    console.log(template(step.node.url, realData));

    /// create the URL from the step
    const url = interpolate(step.node.url, realData)

    /// create the Header entries from the step data
    let headers = {};
    for (const headerName in step.node.headers) {
        headers[headerName] = interpolate(step.node.headers[headerName], realData)
    }

    const payload = interpolate( step.node.payload, realData);


    try {
        const response = await axios({
            method: step.node.method,
            url: url,
            data: payload,
            config: {headers: {'Content-Type': step.node.contentType, ...headers}}
        });
        return [response.data];

    } catch (e) {
        return [,e];
    }

}

function interpolate(urlTemplate, data){
    const tFunc = (tpl, args) => tpl.replace(/\${(\w+)}/g, (_, v) => args[v]||'');
    const url = tFunc(urlTemplate, data)
    return url;
}



const averageNode = {
    name: "Get Number",
    url: "http://thing.com/average",
    method: "POST",
    headers:{
        Authorization: "Bearer ${accessToken}"
    },
    nodeData: {
        accessToken: "44593759500940030T89Z"
    },
    payload: "[50,34.77,44,77,24,75,36,89,5,7,43,6,5,44,4,9]",
    contentType: "application/json",


}


const getNumberNode = {
    name: "Get Number",
    url: "http://thing.com/numbers?seed=${seed}",
    method: "GET",
    headers:{
        Authorization: "Bearer ${accessToken}"
    },
    nodeData: {
        accessToken: "44593759500940030T89Z"
    },
    contentType: "application/json",


}

const addNode = {
    name: "Add Numbers",
    url: "http://thing.com/numbers?seed=${seed}",
    method: "GET",
    parameters: {
        seed: Param('seed', Number,)
    },
    data: {},
    contentType: "application/json"
}
