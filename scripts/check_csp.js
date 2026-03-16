
const https = require('https');

const url = 'https://icpchue.com/login';

https.get(url, (res) => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        if (data.includes('Content-Security-Policy')) {
            console.log('Found CSP in body!');
        } else {
            console.log('No CSP in body.');
        }
    });

}).on('error', (e) => {
    console.error(e);
});
