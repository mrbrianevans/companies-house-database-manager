setInterval(() => {
    new Promise(resolve => require('dns').lookup('google.com', function (err) {
        if (err && err.code === "ENOTFOUND") {
            resolve(false);
        } else {
            resolve(true);
        }
    })).then(online => console.log('Keep alive', new Date(), {online}))
    // every 5 minutes
}, 300_000)