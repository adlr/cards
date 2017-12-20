// Units are in ponts (1/72)" . You can get some ideas for values from
// https://github.com/GNOME/glabels/blob/master/templates/avery-us-templates.xml

var COLS = 3;
var ROWS = 10;
var LEFT_MARGIN = 0.15625 * 72;
var TOP_MARGIN = 0.5 * 72 + 7;
var LABEL_WIDTH = 189;
var LABEL_HEIGHT = 72;
var X_STRIDE = 2.78125 * 72;
var Y_STRIDE = LABEL_HEIGHT;
var TOP_PAD = 3;
var SHOW_OUTLINE = false;

var csv = require('csv');
var fs = require('fs');
var pdfdoc = require('pdfkit');

/// test
//var fontkit = require('fontkit');
//var font = fontkit.openSync('GiveYouGlory.ttf');
//var run = font.layout('hello world');
//console.log(run.positions);
/// end test

var infile = process.argv[2];

var lineCount = function(str) {
    return str.split('\n').length;
}

var getFontSizeToFit = function(doc, text, font, idealSize, width) {
    if (lineCount(text) > 1) {
	var ret = idealSize;
	var lines = text.split('\n');
	for (i in lines) {
	    ret = Math.min(ret, getFontSizeToFit(doc, lines[i], font,
						 idealSize, width));
	}
	return ret;
    }
    doc.font(font).fontSize(idealSize);
    var realWidth = doc.widthOfString(text);
    if (realWidth <= width)
	return idealSize;
    return idealSize * width / realWidth;
}

var render = function(addresses) {
    var doc = new pdfdoc();
    doc.pipe(fs.createWriteStream('labels.pdf'));
    for (i in addresses) {
	if ((i != 0) && (i % (COLS * ROWS) == 0)) {
	    // Add a new page
	    doc.addPage();
	}
	var row = (i / COLS | 0) % (ROWS);
	var col = i % COLS;
	var lines = addresses[i].split('\n');
	var name = lines[0];
	var addr = lines.slice(1).join('\n');

	// Draw label rectangle
	if (SHOW_OUTLINE) {
	    doc.lineWidth(1).strokeColor('#ccc');
	    doc.roundedRect(LEFT_MARGIN + X_STRIDE * col,
			    TOP_MARGIN + Y_STRIDE * row,
			    LABEL_WIDTH, LABEL_HEIGHT,
			    10).stroke();
	}

	doc.font("GiveYouGlory.ttf").fontSize(15);
	doc.fontSize(getFontSizeToFit(doc, name, "GiveYouGlory.ttf",
				      15, LABEL_WIDTH - 10));
	doc.text(name, LEFT_MARGIN + X_STRIDE * col,
		  TOP_MARGIN + Y_STRIDE * row + TOP_PAD,
		 {align: 'center', width: LABEL_WIDTH, height: LABEL_HEIGHT/3});
	var nameHeight = doc.currentLineHeight() - 6 + TOP_PAD;
	//var nameHeight = LABEL_HEIGHT / 3 - 10;

	var addrFontSize = 21;
	doc.font("AmaticSC-Bold.ttf").fontSize(addrFontSize);
	var size = getFontSizeToFit(doc, addr, "AmaticSC-Bold.ttf",
				    addrFontSize, LABEL_WIDTH - 10)
	if (size < addrFontSize) {
	    console.log(addr + ' at ' + size);
	}
	doc.fontSize(size);
	var lines = addr.split('\n');
	for (i in lines) {
	    doc.text(lines[i], LEFT_MARGIN + X_STRIDE * col,
		     TOP_MARGIN + Y_STRIDE * row + nameHeight +
		     (doc.currentLineHeight() - 4) * i,
		     {align: 'center', width: LABEL_WIDTH, height: LABEL_HEIGHT/3});
	}
    }
    doc.end();
}

fs.readFile(infile, 'utf8', function (err, data) {
    if (err) {
	return console.log(err);
    }
    csv.parse(data, function(err, rows) {
	var addresses = [];
	for (i in rows) {
	    if (rows[i][2].indexOf('\n') > -1) {
		addresses.push(rows[i][2]);
	    } else if (i != 0) {
		console.log('Skipping address on row ' + i + ': ' + rows[i][2]);
	    }
	}
	render(addresses);
    });
});
