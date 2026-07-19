const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync('dist/index.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

const selector1 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2)";
const el1 = document.querySelector(selector1);
console.log("Element 1:", el1 ? el1.outerHTML : "Not found in static HTML");

const selector2 = "div#root:nth-of-type(1) > div:nth-of-type(1) > main:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3)";
const el2 = document.querySelector(selector2);
console.log("Element 2:", el2 ? el2.outerHTML : "Not found in static HTML");
