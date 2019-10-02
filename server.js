const app = require('express')()
    , http = require('http').Server(app)
    , SerialPort = require('serialport')
    ;

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
var ress;
var interval;
var intervaltime = 350;
var busy = false;
app.get('/read', function (req, res) {
    if (busy) {
        res.status(503).send();
    } else {
        ress = res;
        busy = true;
        interval = setInterval(function () {
            port.write(Buffer.from('A004018901D1', 'hex'));
        }, intervaltime);
    }
});
app.get('/write/:id', function (req, res) {
    if (busy) {
        res.status(503).send();
    } else {
        ress = res;
        busy = true;
        interval = setInterval(function () {
            let hex = Buffer.from(req.params.id.padStart(9, '0'), 'utf8').toString('hex');
            let fullstr = 'A013018200000000010205' + hex + calc_cksum8('A013018200000000010205' + hex);
            port.write(Buffer.from(fullstr, 'hex'));
        }, intervaltime);
    }
});
app.get('/cancel', function (req, res) {
    clearInterval(interval);
    busy = false;
    if (ress && !ress.headersSent) {
        ress.status(503).send();
    }
    res.send('OK');
});
http.listen(8082, function () {
    console.log('Server UP', 'PID ' + process.pid);
});
var port = new SerialPort("COM4", {
    baudRate: 115200
});
port.on('data', function (data) {
    if (ress && !ress.headersSent) {
        switch (data.toString('hex').length) {
            case 42://read
                ress.send(Buffer.from(data.toString('hex', 7, 16), 'hex').toString('utf8'));
                clearInterval(interval);
                busy = false;
                break;
            case 54://write
                ress.send(Buffer.from(data.toString('hex', 9, 18), 'hex').toString('utf8'));
                clearInterval(interval);
                busy = false;
                break;
        }
    } else {
        clearInterval(interval);
        busy = false;
    }
});
function calc_cksum8(N) {
    strN = new String(N);
    strN = strN.toUpperCase();
    strHex = new String("0123456789ABCDEF");
    result = 0;
    fctr = 16;
    for (i = 0; i < strN.length; i++) {
        if (strN.charAt(i) == " ") continue;
        v = strHex.indexOf(strN.charAt(i));
        if (v < 0) {
            result = -1;
            break;
        }
        result += v * fctr;
        if (fctr == 16) fctr = 1;
        else fctr = 16;
    }
    if (result < 0) {
        strResult = new String("Non-hex character");
    }
    else if (fctr == 1) {
        strResult = new String("Odd number of characters");
    }
    else {
        result = (~(result & 0xff) + 1) & 0xFF;
        strResult = strHex.charAt(Math.floor(result / 16)) + strHex.charAt(result % 16);
    }
    return strResult;
}