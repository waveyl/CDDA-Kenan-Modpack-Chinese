const PO = require('pofile');
const fs = require('fs-jetpack');
const path = require('path');
const _ = require('lodash');

const translationsToImportInDir = 'imports';

const OGPOFilePath = path.join(__dirname, translationsToImportInDir, '0.G.po');
const OFPOFilePath = path.join(__dirname, translationsToImportInDir, '0.F.po');
const OEPOFilePath = path.join(__dirname, translationsToImportInDir, '0.E.po');
const ODPOFilePath = path.join(__dirname, translationsToImportInDir, '0.D.po');
const OCPOFilePath = path.join(__dirname, translationsToImportInDir, '0.C.po');
const OBPOFilePath = path.join(__dirname, translationsToImportInDir, '0.B.po');
const OAPOFilePath = path.join(__dirname, translationsToImportInDir, '0.A.po');
const masterPOFilePath = path.join(__dirname, translationsToImportInDir, '2024.03.22.po');

/**
 * 共享所有Mod翻译的成果，加速翻译，但之后每个mod自己还是存一份
 */
let sharedTranslationCache = {};
const translateCacheDirName = `中文翻译`;
const sharedName = '共享';
/**
 * 在启动时调用，加载之前翻译过的内容，无需使用 paratranz 格式，以加速导入
 */
function loadSharedTranslationCache() {
  console.log('加载缓存的翻译');
  let count = 1;
  const sharedPath = path.join(__dirname, translateCacheDirName, `${sharedName}.json`);
  console.log(`加载${sharedName}的翻译 ${sharedPath}`);
  sharedTranslationCache = JSON.parse(fs.read(sharedPath, 'utf8'));
}
function storeSharedTranslationCache() {
  console.log('储存共享的翻译');
  const sharedTranslationCacheFilePath = path.join(__dirname, translateCacheDirName, `${sharedName}.json`);
  fs.write(sharedTranslationCacheFilePath, JSON.stringify(sharedTranslationCache, undefined, '  '));
}

PO.load(OAPOFilePath, function (err, po) {
  po.items.forEach((item) => {
    if (item.msgstr[0]) {
      // DEBUG: console
      sharedTranslationCache[item.msgid] = item.msgstr[0];
      //console.log(item);
    }
  });
  PO.load(OBPOFilePath, function (err, po) {
    po.items.forEach((item) => {
      if (item.msgstr[0]) {
        // DEBUG: console
        sharedTranslationCache[item.msgid] = item.msgstr[0];
        //console.log(item);
      }
    });
    PO.load(OCPOFilePath, function (err, po) {
      po.items.forEach((item) => {
        if (item.msgstr[0]) {
          // DEBUG: console
          sharedTranslationCache[item.msgid] = item.msgstr[0];
          //console.log(item);
        }
      });
      PO.load(ODPOFilePath, function (err, po) {
        po.items.forEach((item) => {
          if (item.msgstr[0]) {
            // DEBUG: console
            sharedTranslationCache[item.msgid] = item.msgstr[0];
            //console.log(item);
          }
        });
        PO.load(OEPOFilePath, function (err, po) {
          po.items.forEach((item) => {
            if (item.msgstr[0]) {
              // DEBUG: console
              sharedTranslationCache[item.msgid] = item.msgstr[0];
              //console.log(item);
            }
          });
          PO.load(OFPOFilePath, function (err, po) {
            po.items.forEach((item) => {
              if (item.msgstr[0]) {
                // DEBUG: console
                sharedTranslationCache[item.msgid] = item.msgstr[0];
                //console.log(item);
              }
            });
            PO.load(OGPOFilePath, function (err, po) {
              po.items.forEach((item) => {
                if (item.msgstr[0]) {
                  // DEBUG: console
                  sharedTranslationCache[item.msgid] = item.msgstr[0];
                  //console.log(item);
                }
              });
              PO.load(masterPOFilePath, function (err, po) {
                po.items.forEach((item) => {
                  if (item.msgstr[0]) {
                    // DEBUG: console
                    sharedTranslationCache[item.msgid] = item.msgstr[0];
                    //console.log(item);
                  }
                });
          storeSharedTranslationCache();
              });
            });
          });
        });
      })
    })
  })
});
