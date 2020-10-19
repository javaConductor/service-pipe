function doIt(urlTemplate, data) {
    const tFunc = (tpl, args) => tpl.replace(/\${(\w+)}/g, (_, v) => args[v] || '');

    /// create the URL from the data
    const url = tFunc(urlTemplate, data)
    console.log(url);
}

doIt("http://thing.com:${port}/numbers/${accountId}?seed=${seed}", {accountId: "XXHJBBJK8D800", seed: 277})