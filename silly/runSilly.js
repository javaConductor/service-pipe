const {exec,spawn} = require('child_process');

function run(sillyAppPath) {


    const sillyApp = spawn(`node ${sillyAppPath}`);
    return sillyApp;
}

module.exports = {
    run
};
