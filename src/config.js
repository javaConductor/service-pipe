module.exports = (function (yaml, fs) {
    try {
        let config = null;
        config = yaml.safeLoad(fs.readFileSync('./mash.yml', 'utf8'));
        const indentedJson = JSON.stringify(config, null, 4);
        console.log(indentedJson);
        return config;
    } catch (e) {
        console.error("Configuration Error", e);
        process.exit(1);
    }

})(require('js-yaml'), require('fs'))
