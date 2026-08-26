import fs from 'node:fs';

const copyPath = 'apps/web/src/lib/newspaperCopy.ts';
let copy = fs.readFileSync(copyPath, 'utf8');
const before = `.replace(/%\\s*(\\d+(?:[.,]\\d+)?)/g, 'yüzde $1')`;
const after = `.replace(/\\b[yY]üzde\\s*%\\s*(\\d+(?:[.,]\\d+)?)/g, 'yüzde $1')\n    .replace(/%\\s*(\\d+(?:[.,]\\d+)?)/g, 'yüzde $1')`;
if (!copy.includes(before)) throw new Error('newspaperCopy yüzde normalizasyonu bulunamadı.');
fs.writeFileSync(copyPath, copy.replace(before, after));

const testPath = 'apps/web/src/lib/newspaperCopy.test.ts';
let test = fs.readFileSync(testPath, 'utf8');
const bad = 'Hakimler ve Savcılar Kurulu yüzde yüzde 25 açıkladı.';
const good = 'Hakimler ve Savcılar Kurulu yüzde 25 açıkladı.';
if (!test.includes(bad)) throw new Error('yüzde test beklentisi bulunamadı.');
fs.writeFileSync(testPath, test.replace(bad, good));
console.log('Turkish yüzde speech normalization fixed.');
