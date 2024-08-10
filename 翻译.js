const promiseRetry = require('promise-retry');
const dotenv = require('dotenv');
const fs = require('fs-jetpack');
const path = require('path');
const _ = require('lodash');
const fetch = require('node-fetch');
const crypto = require('crypto');
const debouncePromise = require('awesome-debounce-promise').default;

const wikiSiteBase = 'https://onetwo.ren/CDDA-Kenan-Modpack-Chinese/#';
const sourceDirName = 'Kenan-Structured-Modpack';
const translatedDirName = `Kenan-Modpack-Chinese`;
const translateCacheDirName = `中文翻译`;
const cddaWikiFolder = path.join(__dirname, 'wiki', 'tiddlers', 'cdda');
const hasChinese = (text) => /[\u4e00-\u9fa5]/.test(text);
/**
 * 作为高质量翻译源的 mod，会指导其他 mod 的翻译
 */
const highQualityMods = ['nocts_cata_mod_DDA', 'secronom', 'Arcana'];

const getFakeId = (item, index) =>
  typeof item?.id === 'string'
    ? item.id
    : item?.type === 'recipe' && item.result && item.difficulty
    ? `${item.result}(difficulty${item.difficulty})`
    : item?.type === 'speech' && item.speaker
    ? `${Array.isArray(item.speaker) ? item.speaker[0] : item.speaker}→${index}`
    : item?.type === 'AMMO' || item?.type === 'COMESTIBLE'
    ? item.abstract
    : typeof index === 'number'
    ? `[${index}]`
    : '';
const getContext = (sourceModName, item, index) => `${sourceModName}→${item.type}→${getFakeId(item, index)}`;
// const getItemBrowserLink = (item) =>
//   item.id ? `http://cdda.aloxaf.cn/search?q=${escape(Array.isArray(item.id) ? item.id[0] : item.id)}` : '';
// 日志记录相关
let logCounter = 0;
let logs = [];
let errors = [];
const logger = {
  log: (...message) => {
    console.log(...message);
    logs.push(`Log${logCounter++} ${message.join(' ')}\n`);
    debouncedFlushLog();
  },
  error: (...message) => {
    console.error(...message);
    errors.push(`Log${logCounter++} ${message.join(' ')}\n`);
    debouncedFlushLog();
  },
  flush: () => {
    fs.append(path.join(__dirname, 'log.log'), logs.join('\n'));
    fs.append(path.join(__dirname, 'error.log'), errors.join('\n'));
    logs = [];
    errors = [];
  },
};
const debouncedFlushLog = _.debounce(logger.flush, 1000);

// 创建文件夹
fs.dir(path.join(__dirname, translatedDirName));
fs.dir(path.join(__dirname, translateCacheDirName));
fs.dir(path.join(__dirname, cddaWikiFolder));

// 获取源文件夹中的 mod 名称列表
const sourceModDirs = _.sortedUniq(
  fs.list(path.resolve(__dirname, 'Kenan-Structured-Modpack')).filter((name) => name !== '.DS_Store')
);


// 尝试用qwen翻译
const apiKey = `${process.env.QWEN}`;
const endpointUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

/**
 * 使用Qwen API进行文本生成
 * @param {string} promptValue - 需要翻译或生成的文本提示
 * @returns {Promise<string>} - 生成的文本内容
 */
async function qwenTextGenerate(promptValue) {
  // 构建请求体
  const requestBody = {
    model: 'qwen-max',
    "input":{
      "messages":[      
        {
          "role": "system",
          "content": `你是一名专业翻译员，擅长使用AI工具翻译我输入的内容。
          目标语言：中文
          优化要点：语法纠正、符合正常中文表达、适应中国文化
          要求：尽量使用我上传的文件中专业术语的表达，但在意思严重冲突下不需要符合文件中的翻译；形如'<color>'的尖括号包裹的内容保持原样不要改变
          特别注意：保持原意，优化语言流畅性和准确性，这是CDDA大灾变中的游戏内容，确保它符合一个丧尸病毒爆发后的世界，只输出翻译后的内容，不要作任何解释`
        },
        {
          "role": "user",
          "content": `${promptValue}\n\n翻译:`
        }
      ]
    },
    max_tokens: 100,
    temperature: 0.7,
  };

  // 设置请求头
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  try {
    // 发起POST请求
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API请求失败，状态码：${response.status}，错误代码：${errorData.code}，错误信息：${errorData.message}`);
    }

    // 解析响应数据
    const data = await response.json();
    const generatedText = data.output.text.trim();

    return generatedText;
  } catch (error) {
    console.error('文本生成请求失败:', error);
    throw error;
  }
}

/**
 * 尝试使用不同的翻译服务进行翻译，目前彩云、搜狗都删掉了，只剩下 通义千问LLM
 * @param {string} value 待翻译的值
 * @returns {Promise<string>} 翻译后的字符串
*/
const unionTranslate = (value) => qwenTextGenerate(value)

const tags = {
  '</color>': '2222',
  '<color_red>': '2223',
  '<color_light_red>': '2323',
  '<color_dark_red>': '2423',
  '<color_white>': '2224',
  '<color_light_white>': '2324',
  '<color_dark_white>': '2424',
  '<color_green>': '2225',
  '<color_light_green>': '2325',
  '<color_dark_green>': '2425',
  '<color_yellow>': '2226',
  '<color_light_yellow>': '2326',
  '<color_dark_yellow>': '2426',
  '<color_magenta>': '2227',
  '<color_light_magenta>': '2327',
  '<color_dark_magenta>': '2427',
  '<color_cyan>': '2228',
  '<color_light_cyan>': '2328',
  '<color_dark_cyan>': '2428',
  '<color_blue>': '2229',
  '<color_light_blue>': '2329',
  '<color_dark_blue>': '2429',
  '<color_gray>': '2230',
  '<color_light_gray>': '2330',
  '<color_dark_gray>': '2430',
  '<color_pink>': '2231',
  '<color_light_pink>': '2331',
  '<color_dark_pink>': '2431',
  '<color_brown>': '2232',
  '<color_light_brown>': '2332',
  '<color_dark_brown>': '2432',
  '<good>': '5555',
  '</good>': '5655',
  '<name_b>': '5556',
  '<thirsty>': '5557',
  '<swear!>': '5558',
  '<sad>': '5559',
  '<greet>': '5560',
  '<no>': '5561',
  '<im_leaving_you>': '5562',
  '<ill_kill_you>': '5563',
  '<ill_die>': '5564',
  '<wait>': '5565',
  '<no_faction>': '5566',
  '<name_g>': '5567',
  '<keep_up>': '5568',
  '<yawn>': '5569',
  '<very>': '5570',
  '<okay>': '5571',
  '<really>': '5572',
  '<let_me_pass>': '5573',
  '<done_mugging>': '5574',
  '<happy>': '5575',
  '<drop_it>': '5576',
  '<swear>': '5577',
  '<lets_talk>': '5578',
  '<hands_up>': '5579',
  '<move>': '5580',
  '<hungry>': '5581',
  '<fuck_you>': '5582',
  '<npcname>': '6666',
  '<yrwp>': '6667',
  '<mywp>': '6668',
  '<ammo>': '6669',
  '<info>': '6670',
  '</info>': '6671',
  '<the_cataclysm>': '6672',
  '<chitchat_player_responses>': '6673',
  '<speech_warning>': '6674',
  '<sweetie>': '6675',
  '<shoggoth_chat>': '6676',
};
const mapTo111 = {
  '%1$s': '1111',
  '%2$s': '1112',
  '%3$s': '1113',
  '%s': '1114',
  ...tags,
  '\n\n': '7777',
  '\n': '8888',
};
if (_.uniq(Object.keys(mapTo111).map((key) => mapTo111[key])).length !== Object.keys(mapTo111).length) {
  throw new Error('mapTo111 有重复的 key');
}
function replaceNto1111(text) {
  // 防止 %2$s 影响了翻译，先替换成不会被翻译的占位符，然后之后再替换回来
  // 移除前后空格，以免影响搜狗翻译的字符串拼接，它居然要求前后不能有个空格
  return _.trim(Object.keys(mapTo111).reduce((acc, key) => acc.replaceAll(key, ` ${mapTo111[key]}  `), text));
}
function replace1111toN(text) {
  // 防止 %2$s 影响了翻译
  return Object.keys(mapTo111).reduce((acc, key) => acc.replaceAll(mapTo111[key], key), text);
}
const TRANSLATION_ERROR = 'Translation Error';
/**
 * 使用百度翻译，带重试
 * @param {string | undefined} value 要翻译的字符串，可以为空，为空就返回空
 */
function tryTranslation(value) {
  if (typeof value !== 'string') return Promise.resolve(value);
  if (!_.trim(value)) return Promise.resolve('');
  let lastResult = 'null';
  let retryCount = 0;

  const stringToTranslate = replaceNto1111(value);
  return promiseRetry(
    (retry, number) => {
      return unionTranslate(stringToTranslate)
        .then((result) => {
          if (typeof result === 'string') {
            return replace1111toN(result);
          }
          lastResult = result;
          retryCount = number;
          return retry(new Error('Translation failed'));
        })
        .catch((error) => {
          logger.error('Translate failed', error.message, `stringToTranslate:\n${stringToTranslate}`);
          retryCount = number;
          return new Promise((resolve) => setTimeout(resolve, 2000))
            .then(retry);
        });
    },
    { retries: 10, maxTimeout: 10000, randomize: true }
  ).catch((error) => {
    const errorMessage = `${TRANSLATION_ERROR}1: ${error?.message} ${error?.stack}\nresult:\n${lastResult}\nFrom:\n${value}\nstringToTranslate:\n${stringToTranslate}\nRetryCount: ${retryCount}\nRetry Again\n--\n\n `;
    logger.error(errorMessage);
    return TRANSLATION_ERROR;
  });
}
/**
 *  paratranz 的翻译条目格式，保存到文件时保存为此格式，读取时反序列化为 original: translation 放入 cache
  * 来自 https://paratranz.cn/projects/create
 *  
 [
  {
    "key": "KEY 键值",
    "original": "source text 原文",
    "translation": "translation text 译文",
    "context": "string meta info, context, etc. 上下文或其他信息"
  },
  {
    "key": "KEY 键值 2",
    "original": "source text 原文 2",
    "translation": "translation text 译文 2"
  }
] 
*/
function kvToParatranz(kvTranslationsCache, stages, contexts) {
  return _.sortBy(
    Object.entries(kvTranslationsCache).map(([original, translation]) => {
      return {
        key: crypto.createHash('md5').update(original).digest('hex'),
        original,
        translation,
        context: contexts[original],
        stage: stages[original] ?? 0,
      };
    }),
    'original'
  );
}
/**
 * 把 paratranz 的翻译条目格式转换回 { original: translation } 的格式
 */
function paratranzToKV(paratranzTranslationsContent) {
  return paratranzTranslationsContent.reduce((prev, item) => {
		if (item.translation?.includes(TRANSLATION_ERROR)) {
      return { ...prev, [item.original]: TRANSLATION_ERROR };
    }
    return { ...prev, [item.original]: item.translation };
  }, {});
}
/**
 * 把 paratranz 的翻译条目格式转换回 { original: translation } 的格式
 */
function paratranzToStage(paratranzTranslationsContent) {
  return paratranzTranslationsContent.reduce((prev, item) => {
    if (item.translation?.includes(TRANSLATION_ERROR)) {
      return { ...prev, [item.original]: TRANSLATION_ERROR };
    }
    return { ...prev, [item.original]: item.stage };
  }, {});
}

/**
 * 所有 mod 的 cache
 */
const modTranslationCaches = {};
/**
 * 共享所有Mod翻译的成果，加速翻译，但之后每个mod自己还是存一份
 */
let sharedTranslationCache = {};
const sharedName = '共享';
/**
 * 在启动时调用，加载之前翻译过的内容，无需使用 paratranz 格式，以加速导入
 */
function loadSharedTranslationCache() {
  logger.log('加载缓存的翻译');
  let count = 1;
  const sharedPath = path.join(__dirname, translateCacheDirName, `${sharedName}.json`);
  logger.log(`加载${sharedName}的翻译 ${sharedPath}`);
  sharedTranslationCache = JSON.parse(fs.read(sharedPath, 'utf8'));
  // for (const sourceModName of highQualityMods) {
  //   logger.log(`加载缓存的翻译 ${count++}/${highQualityMods.length} ${sourceModName}`);
  //   try {
  //     const translationCacheFilePath = path.join(__dirname, translateCacheDirName, `${sourceModName}.json`);
  //     const kvCacheContent = paratranzToKV(
  //       JSON.parse(_.trim(fs.read(translationCacheFilePath, 'utf8')).replaceAll('\\\\n', '\\n'))
  //     );
  //     const cacheForThisMod = new ModCache(translationCacheFilePath, kvCacheContent, sourceModName);
  //     modTranslationCaches[sourceModName] = cacheForThisMod;
  //     sharedTranslationCache = {
  //       ...sharedTranslationCache,
  //       ...kvCacheContent,
  //     };
  //   } catch (error) {
  //     logger.error(`loadSharedTranslationCache ${translationCacheFilePath} Error: ${error.message} ${error.stack}`);
  //   }
  // }
}
function storeSharedTranslationCache() {
  logger.log('储存共享的翻译');
  const sharedTranslationCacheFilePath = path.join(__dirname, translateCacheDirName, `${sharedName}.json`);
  fs.write(sharedTranslationCacheFilePath, JSON.stringify(sharedTranslationCache, undefined, '  '));
}

class ModCache {
  modName;
  stages = {};
  contexts = {};
  translationCache = {};
  translationCacheFilePath;
  /**
   * 初始化翻译缓存，没传第二个参数时，尝试从文件系统里加载有之前翻译和润色过的内容的翻译缓存，如果该翻译缓存文件不存在，就创建一个出来
   */
  constructor(translationCacheFilePath, translationCache = {}, modName, stages) {
    this.modName = modName;
    this.translationCacheFilePath = translationCacheFilePath;
    this.debouncedWriteTranslationCache = _.debounce(this.writeTranslationCache.bind(this), 1000);
    try {
      this.stages =
        stages ??
        paratranzToStage(JSON.parse(_.trim(fs.read(translationCacheFilePath, 'utf8')).replaceAll('\\\\n', '\\n')));
      if (Object.keys(translationCache).length === 0) {
        this.translationCache = paratranzToKV(
          JSON.parse(_.trim(fs.read(translationCacheFilePath, 'utf8')).replaceAll('\\\\n', '\\n'))
        );
      }
    } catch (error) {
      logger.error(
        `ModCache error ${translationCacheFilePath}, create empty translation cache to fs ${translationCache}, errorMessage is\n ${error.message} ${error.stack}\n`
      );
      // process.exit(1);
      this.writeTranslationCache(translationCacheFilePath, {});
    }
  }

  setContext(key, value) {
    this.contexts[key] = value;
  }

  writeTranslationCache(
    translationCacheFilePath = this.translationCacheFilePath,
    translationCache = this.translationCache
  ) {
    return fs.write(
      translationCacheFilePath,
      JSON.stringify(kvToParatranz(translationCache, this.stages, this.contexts), undefined, ' ')
    );
  }

  insertToCache(key, value) {
    this.translationCache[key] = value;
    if (!value.includes(TRANSLATION_ERROR)) {
      sharedTranslationCache[key] = value;
      this.stages[value] = 1;
    } else {
      sharedTranslationCache[key] = `${sharedTranslationCache[key]}\n\n${value}`;
      this.stages[value] = 0;
    }
    this.debouncedWriteTranslationCache();
  }

  /**
   * 从本Mod翻译内容缓存或全局翻译缓存里获取内容，优先本Mod缓存
   */
  get(key) {
    if (this.translationCache[key] !== undefined || sharedTranslationCache[key] !== undefined) {
      let translatedValue = // 优先检查官中内容里有没有，而且去掉一些可能影响匹配的内容
        (sharedTranslationCache[key] ?? sharedTranslationCache[_.trim(key, '*')])
          ?.replaceAll(/"(.+)"/g, '“$1”')
          ?.replaceAll('(', '（')
          ?.replaceAll(')', '）')
          ?.replaceAll('。。。', '…')
          ?.replaceAll(/(?<![\.a-zA-Z0-9])\.(?![\.a-zA-Z0-9])/gm, '。')
          ?.replaceAll(',', '，')
          ?.replaceAll('?', '？')
          ?.replaceAll(':', '：')
          ?.replaceAll('!', '！')
          ?.replaceAll('， ', '，') ?? this.translationCache[key];
      // 如果本地翻译没有此内容，就用共享翻译资源刷新此mod翻译
      if (this.translationCache[key] === undefined) {
        this.insertToCache(key, translatedValue);
      }
      // 如果 copies of 的原型有值，且copies of 的原型的审核进度大于当前进度
      if (
        this.translationCache[key.replace('copies of ', '')] !== undefined &&
        (this.stages[key.replace('copies of ', '')] ?? 0) > (this.stages[key] ?? 0) &&
        (this.stages[key.replace('copies of ', '')] ?? 0) > 0
      ) {
        logger.log('使用 copies of 的原型');
        translatedValue = this.translationCache[key.replace('copies of ', '')];
        this.insertToCache(key, translatedValue);
        this.stages[key] = this.stages[key.replace('copies of ', '')];
      }
      // 或者当前值的 copies of 有值，且一方的审核进度较低
      if (
        this.translationCache['copies of ' + key] !== undefined &&
        (this.stages['copies of ' + key] ?? 0) > (this.stages[key] ?? 0) &&
        (this.stages['copies of ' + key] ?? 0) > 0
      ) {
        logger.log('使用加上 copies of');
        translatedValue = this.translationCache['copies of ' + key];
        this.insertToCache(key, translatedValue);
        this.stages[key] = this.stages['copies of ' + key];
      }
      // 如果已有翻译库有此内容，且翻译部分还没有审核过，则直接使用已有翻译库
      if (
        sharedTranslationCache[key] !== undefined &&
        (this.stages[key] === undefined || this.stages[key] === 1 || this.stages[key] === 0)
      ) {
        logger.log('使用已有翻译库');
        this.insertToCache(key, translatedValue);
        // this.stages[key] = 5;
        translatedValue = sharedTranslationCache[key];
      }
      return translatedValue;
    }
  }
}

/**
 * 尝试使用缓存的内容，没有就实际翻译
 * @param {string} value 待翻译的字符串
 * @param {ModCache} modTranslationCache 此mod的翻译缓存文件
 */
async function translateWithCache(value, modTranslationCache, context) {
  if (value === undefined) return undefined;
  if (value === '') return '';
  if (typeof value !== 'string') return value;
  /*
  if (hasChinese(value)) {
    logger.error(`\nHas Chinese in text ${value}\n${context}`);
    // console.trace();
    // process.exit(1);
    return value;
  }
  */
  let translatedValue = modTranslationCache.get(value);
  // 有时候 tag 没有被正确翻译，原文里有 tag，结果里没有
  const hasNotTranslatedTag =
    typeof translatedValue === 'string' &&
    Object.keys(tags).some((key) => value.includes(key) && !translatedValue.includes(key));
  if (hasNotTranslatedTag) {
    logger.error(`之前的翻译有问题，没有 tag：\n${value}\n${translatedValue}\n`);
  }
  if (translatedValue !== undefined /*  && !hasNotTranslatedTag */) {
    // logger.log(`Use Cached version ${translatedValue}\n--\n`);
  } else {
    // 没有缓存，就更新缓存
    logger.log(`No Cached Translation for ${value}\n`);
    translatedValue = value;
    logger.log(`New Translation ${value}\n -> ${translatedValue}\n`);
    modTranslationCache.insertToCache(value, translatedValue);
  }
  modTranslationCache.setContext(value, context);
  return translatedValue;
}

/**
 * 读取原始文件内容，打平成一维数组，并带上路径信息
 * @param {string} 原始mod文件夹的地址
 */
function readSourceFiles(sourceModDirPath) {
  const folders = fs.inspectTree(sourceModDirPath);
  const foldersWithContent = getFileJSON(folders, path.dirname(sourceModDirPath));
  return foldersWithContent;
}

/**
 * 递归把文件内容塞进文件树里
 * @param {Object} inspectData https://www.npmjs.com/package/fs-jetpack#inspecttreepath-options
 * @param {string | undefined} parentPath 用于拼凑 filePath 用的父级路径
 */
function getFileJSON(inspectData, parentPath = '') {
  const filePath = path.join(parentPath, inspectData.name);
  if (inspectData.type === 'file') {
    if (inspectData.name.endsWith('json')) {
      // JSON 文件
      try {
        return { ...inspectData, content: JSON.parse(fs.read(filePath)), filePath };
      } catch (error) {
        console.error('JSON 格式出错' + error.message);
        console.error(filePath);
        process.exit(-1);
      }
    } else {
      // png 贴图等
      return { ...inspectData, rawContent: fs.read(filePath, 'buffer'), filePath };
    }
  }
  if (inspectData.type === 'dir') {
    return _.compact(inspectData.children.flatMap((item) => getFileJSON(item, filePath)));
  }
}

/**
 * 把处理过的结果写到 CN mod 文件夹里
 * @param {Object[]} foldersWithContent 一维数组，基本类似于 inspectData https://www.npmjs.com/package/fs-jetpack#inspecttreepath-options ，但是多了 content 包含 JSON parse 过的文件内容，以及 filePath 是完整的原始文件路径
 */
function writeToCNMod(foldersWithContent) {
  const writeContent = (content) => {
    const newFilePath = content.filePath.replace(`${sourceDirName}/`, `${translatedDirName}/`);
    logger.log('newFilePath', newFilePath);
    if (content.content) {
      // JSON 文件
      fs.write(newFilePath, JSON.stringify(content.content, undefined, '  '));
    } else if (content.rawContent) {
      // png 贴图等
      fs.write(newFilePath, content.rawContent);
    }
  };
  if (Array.isArray(foldersWithContent)) {
    for (const inspectDataWithContent of foldersWithContent) {
      writeContent(inspectDataWithContent);
    }
  } else if (typeof foldersWithContent === 'object' && typeof inspectDataWithContent?.type === 'string') {
    writeContent(foldersWithContent);
  } else {
    throw new Error(`Error Bad Data ${JSON.stringify(inspectDataWithContent)}`);
  }
}

async function writeTiddlerToWikiAndTranslate(sourceModName, jsonName, item, translator, filePath) {
  // 把内容写到 wiki 里
  fs.write(
    path.join(cddaWikiFolder, jsonName),
    `tags: ${item.type} ${sourceModName} ${getFakeId(item.id)}
creator: 林一二
title: ${jsonName.replace('.tid', '')}
type: text/vnd.tiddlywiki
`
  );
  // if (item.id) {
  //   fs.append(
  //     path.join(cddaWikiFolder, jsonName),
  //     `\n\n[[物品浏览器：${escape(item.id)}|${getItemBrowserLink(item)}]]\n\n`
  //   );
  // }
  fs.append(path.join(cddaWikiFolder, jsonName), `\n\n!! 所在文件\n\n${filePath}\n`);
  fs.append(path.join(cddaWikiFolder, jsonName), '\n\n!! 原文\n\n```json\n');
  fs.append(path.join(cddaWikiFolder, jsonName), JSON.stringify(item, undefined, '  '));
  fs.append(path.join(cddaWikiFolder, jsonName), '\n```\n\n');
  await translator(item);
  // 把翻译后的内容写到 wiki 里
  fs.append(path.join(cddaWikiFolder, jsonName), '\n\n!! 汉化\n\n```json\n');
  fs.append(path.join(cddaWikiFolder, jsonName), JSON.stringify(item, undefined, '  '));
  fs.append(path.join(cddaWikiFolder, jsonName), '\n```\n\n');
}

/**
 *
 * @param {Object} fileItem 基本类似于 inspectData https://www.npmjs.com/package/fs-jetpack#inspecttreepath-options ，但是多了 content 包含 JSON parse 过的文件内容
 * @param {ModCache} modTranslationCache 此mod的翻译缓存文件
 */
async function translateStringsInContent(fileItem, modTranslationCache, sourceModName) {
  if (Array.isArray(fileItem.content)) {
    // 文件的内容一般是一维数组
    for (let index = 0; index < fileItem.content.length; index++) {
      const item = fileItem.content[index];
      const translators = getCDDATranslator(
        modTranslationCache,
        sourceModName,
        item,
        index,
        fileItem.filePath.replace(__dirname, '')
      );
      const translator = translators[item.type];
      if (!translator) {
        logger.error(`没有 ${item.type} 的翻译器`);
      } else {
        const jsonName = `${getContext(sourceModName, item, index)}.tid`;
        await writeTiddlerToWikiAndTranslate(
          sourceModName,
          jsonName,
          item,
          translator,
          fileItem.filePath.replace(__dirname, '')
        );
      }
    }
    return fileItem;
  } else if (fileItem.rawContent) {
    return fileItem;
  } else {
    const translators = getCDDATranslator(
      modTranslationCache,
      sourceModName,
      fileItem.content,
      0,
      fileItem.filePath.replace(__dirname, '')
    );
    const translator = translators[fileItem.content?.type];
    if (!translator) {
      logger.error(`没有 ${fileItem.content?.type ?? fileItem.content?.type} 的翻译器`);
    } else {
      const jsonName = `${getContext(sourceModName, fileItem.content, 0)}.tid`;
      await writeTiddlerToWikiAndTranslate(
        sourceModName,
        jsonName,
        fileItem.content,
        translator,
        fileItem.filePath.replace(__dirname, '')
      );
    }
    return fileItem;
  }
}

/**
 * 获取 translator 对象，内含从各种 CDDA JSON 里提取待翻译字段的翻译器
 * @param {ModCache} modTranslationCache 此mod的翻译缓存文件
 */
function getCDDATranslator(modTranslationCache, sourceModName, fullItem, index, filePath) {
  const translators = {};
  const translateFunction = (value) =>
    translateWithCache(
      value,
      modTranslationCache,
      `ID: ${Array.isArray(fullItem.id) ? fullItem.id[0] : fullItem.id}\n位于 ${filePath}\n类型为 ${fullItem.type}

WIKI:
${wikiSiteBase}${getContext(sourceModName, fullItem, index).replace('%', '%25')}
`
    );
  const noop = () => {};

  // 常用的翻译器
  const maleFemaleItemDesc = async (item) => {
    item.male = await translateFunction(item.male);
    item.female = await translateFunction(item.female);
  };

  const messageOrMessages = async (item) => {
    if (Array.isArray(item?.message)) {
      item.message = await Promise.all(item.message.map((msg) => translateFunction(msg)));
    }
    if (typeof item?.message === 'string') {
      item.message = await translateFunction(item.message);
    }
    if (Array.isArray(item?.messages)) {
      item.messages = await Promise.all(item.messages.map((msg) => translateFunction(msg)));
    }
  };
  const useActionMsg = async (useAction) => {
    if (useAction.activation_message) {
      useAction.activation_message = await translateFunction(useAction.activation_message);
    }
    if(useAction.summon_msg){
      useAction.summon_msg = await translateFunction(useAction.summon_msg);
    }
    await messageOrMessages(useAction);
    if (useAction.msg) {
      useAction.msg = await translateFunction(useAction.msg);
    }
    if (useAction.friendly_msg) {
      useAction.friendly_msg = await translateFunction(useAction.friendly_msg);
    }
    if (useAction.hostile_msg) {
      useAction.hostile_msg = await translateFunction(useAction.hostile_msg);
    }
    if (useAction.holster_prompt) {
      useAction.holster_prompt = await translateFunction(useAction.holster_prompt);
    }
    if (useAction.holster_msg) {
      useAction.holster_msg = await translateFunction(useAction.holster_msg);
    }
    if (useAction.need_charges_msg) {
      useAction.need_charges_msg = await translateFunction(useAction.need_charges_msg);
    }
    if (useAction.menu_text) {
      useAction.menu_text = await translateFunction(useAction.menu_text);
    }
    if(Array.isArray(useAction?.player_descriptions)){
      useAction.player_descriptions = await Promise.all(useAction.player_descriptions.map((player_descriptions) => translateFunction(player_descriptions)));
    }
    if(typeof useAction?.player_descriptions === 'string'){
      useAction.player_descriptions = await translateFunction(useAction.player_descriptions)
    }
    if(Array.isArray(useAction?.npc_descriptions)){
      useAction.npc_descriptions = await Promise.all(useAction.npc_descriptions.map((npc_descriptions) => translateFunction(npc_descriptions)));
    }
    if(typeof useAction?.npc_descriptions === 'string'){
      useAction.npc_descriptions = await translateFunction(useAction.npc_descriptions)
    }
  };
  const attacks = async (item) => {
    if (item.attacks) {
      item.attacks.attack_text_u = await translateFunction(item.attacks.attack_text_u);
      item.attacks.attack_text_npc = await translateFunction(item.attacks.attack_text_npc);
    }
  };
  const monsterAttack = async (item) => {
    if (item.hit_dmg_u) {
      item.hit_dmg_u = await translateFunction(item.hit_dmg_u);
    }
    if (item.hit_dmg_npc) {
      item.hit_dmg_npc = await translateFunction(item.hit_dmg_npc);
    }
    if (item.no_dmg_msg_u) {
      item.no_dmg_msg_u = await translateFunction(item.no_dmg_msg_u);
    }
    if (item.no_dmg_msg_npc) {
      item.no_dmg_msg_npc = await translateFunction(item.no_dmg_msg_npc);
    }
    if (item.miss_msg_u) {
      item.miss_msg_u = await translateFunction(item.miss_msg_u);
    }
    if (item.miss_msg_npc) {
      item.miss_msg_npc = await translateFunction(item.miss_msg_npc);
    }
  };
  const namePlDesc = async (item) => {
    if (item.name) {
      if (typeof item.name === 'string') {
        item.name = await translateFunction(item.name);
      } else {
        await maleFemaleItemDesc(item.name);
        item.name.str = await translateFunction(item.name.str);
        item.name.str_pl = await translateFunction(item.name.str_pl);
        item.name.str_sp = await translateFunction(item.name.str_sp);
      }
    }
    item.description = await translateFunction(item.description);
    item.detailed_definition = await translateFunction(item.detailed_definition);
    await messageOrMessages(item);

    if (Array.isArray(item.use_action)) {
      // 有可能是一个数组
      for (const useAction of item.use_action) {
        await useActionMsg(useAction);
      }
    }
    if (typeof item.use_action === 'object') {
      await useActionMsg(item.use_action);
    }
    if (item.use_action?.activation_message) {
      if (Array.isArray(item.use_action.activation_message)) {
        // 有可能是一个数组
        for (const useAction of item.use_action.activation_message) {
          await useActionMsg(useAction);
        }
      } else {
        // 有可能只有一个，就是个 Object
        await useActionMsg(item.use_action.activation_message);
      }
    }
    await messageOrMessages(item.use_action);

    if (item.special_attacks) {
      for (const specialAttacks of item.special_attacks) {
        if (specialAttacks.description) {
          specialAttacks.description = await translateFunction(specialAttacks.description);
        }
        if (specialAttacks.monster_message) {
          specialAttacks.monster_message = await translateFunction(specialAttacks.monster_message);
        }
        if (specialAttacks.no_ammo_sound) {
          specialAttacks.no_ammo_sound = await translateFunction(specialAttacks.no_ammo_sound);
        }
        await monsterAttack(item);
      }
    }

    await relic(item);
    await attacks(item);
  };

  const material = async (item) => {
    if (item.name) {
      if (typeof item.name === 'string') {
        item.name = await translateFunction(item.name);
      } else {
        item.name.str = await translateFunction(item.name.str);
        item.name.str_pl = await translateFunction(item.name.str_pl);
        item.name.str_sp = await translateFunction(item.name.str_sp);
      }
    }
    item.description = await translateFunction(item.description);
    if (Array.isArray(item.dmg_adj)) {
      item.dmg_adj = await Promise.all(item.dmg_adj.map((adj) => translateFunction(adj)));
    }
    item.bash_dmg_verb = await translateFunction(item.bash_dmg_verb);
    item.cut_dmg_verb = await translateFunction(item.cut_dmg_verb);
  };

  const relic = async (item) => {
    if (item.relic_data?.passive_effects) {
      for (const passiveEffect of item.relic_data.passive_effects) {
        if (passiveEffect.hit_you_effect) {
          for (const hitYouEffect of passiveEffect.hit_you_effect) {
            await messageOrMessages(hitYouEffect);
            if (hitYouEffect.npc_message) {
              hitYouEffect.npc_message = await translateFunction(hitYouEffect.npc_message);
            }
          }
        }
        if (passiveEffect.hit_me_effect) {
          for (const hitYouEffect of passiveEffect.hit_me_effect) {
            await messageOrMessages(hitYouEffect);

            if (hitYouEffect.npc_message) {
              hitYouEffect.npc_message = await translateFunction(hitYouEffect.npc_message);
            }
          }
        }
      }
    }
  };

  const clothingMod = async (item) => {
    if (item.implement_prompt) {
      item.implement_prompt = await translateFunction(item.implement_prompt);
    }
    if (item.destroy_prompt) {
      item.destroy_prompt = await translateFunction(item.destroy_prompt);
    }
  };

  const dynamicLine = async (line) => {
    if (line?.concatenate) {
      // let now = line.concatenate;
      // if (typeof now === 'object'){
      //   while(now?.no && typeof now.no !== 'string'){
      //     now.yes = await translateFunction(now.yes);
      //     now = now.no;
      //   }
      //   if(now?.yes){
      //     now.yes = await translateFunction(now.yes);
      //   }
      //   if(now?.no){
      //     now.no = await translateFunction(now.no);
      //   }
      // }
      if (Array.isArray(line?.concatenate)){
        await Promise.all(line.concatenate.map(async (item) => {
          if (typeof item?.yes === 'string') {
            item.yes = await translateFunction(item.yes);
          }
          if(Array.isArray(item?.yes)){
            item.yes = await Promise.all(item.yes.map((yes) => translateFunction(yes)));
          }
          if (typeof item?.no === 'string') {
            item.no = await translateFunction(item.no);
          }
          if(Array.isArray(item?.no)){
            item.no = await Promise.all(item.no.map((no) => translateFunction(no)));
          }
          let now;
          // typeof无法区分不是array的object
          if((item?.yes && Object.getPrototypeOf(item?.yes) === Object.prototype) || (item?.no && Object.getPrototypeOf(item?.no) === Object.prototype)){
            if(item?.yes && Object.getPrototypeOf(item?.yes) === Object.prototype){
              now = item.yes
            }
            if(item?.no && Object.getPrototypeOf(item?.no) === Object.prototype){
              now = item.no
            }
            while ((now?.yes && Object.getPrototypeOf(now?.yes) === Object.prototype) || (now?.no && Object.getPrototypeOf(now?.no) === Object.prototype)){
              if(now?.yes && Object.getPrototypeOf(now?.yes) === Object.prototype){
                if(typeof now?.no === 'string') {
                  now.no = await translateFunction(now.no);
                }
                if(Array.isArray(now?.no)){
                  now.no = await Promise.all(now.no.map((no) => translateFunction(no)));
                }
                now = now.yes
              }
              if(now?.no && Object.getPrototypeOf(now?.no) === Object.prototype){
                if(typeof now?.yes === 'string') {
                  now.yes = await translateFunction(now.yes);
                }
                if(Array.isArray(now?.yes)){
                  now.yes = await Promise.all(now.yes.map((yes) => translateFunction(yes)));
                }
                now = now.no
              }
            }
            if (typeof now?.yes === 'string') {
              now.yes = await translateFunction(now.yes);
            }
            if(Array.isArray(now?.yes)){
              now.yes = await Promise.all(now.yes.map((yes) => translateFunction(yes)));
            }
            if (typeof now?.no === 'string') {
              now.no = await translateFunction(now.no);
            }
            if(Array.isArray(now?.no)){
              now.no = await Promise.all(now.no.map((no) => translateFunction(no)));
            }
          }
        }))
      }
    }
    if (typeof line.yes === 'string') {
      line.yes = await translateFunction(line.yes);
    } else if (typeof line.yes === 'object') {
      if (Array.isArray(line.yes)) {
        line.yes = await Promise.all(line.yes.map((yes) => translateFunction(yes)));
      } else {
        await dynamicLine(line.yes);
      }
    }
    if (typeof line.no === 'string') {
      line.no = await translateFunction(line.no);
    } else if (typeof line.no === 'object') {
      if (Array.isArray(line.no)) {
        line.no = await Promise.all(line.no.map((no) => translateFunction(no)));
      } else {
        await dynamicLine(line.no);
      }
    }
  };
  const talkTopic = async (item) => {
    if (Array.isArray(item.responses)) {
      for (const response of item.responses) {
        response.text = await translateFunction(response.text);
        if (Array.isArray(response?.effect)) {
          for (const res_effect of response.effect) {
            if (res_effect.u_message) res_effect.u_message = await translateFunction(res_effect.u_message);
          }
        }
        if (response?.effect && Object.getPrototypeOf(response?.effect) === Object.prototype)
          response.effect.u_message = await translateFunction(response.effect.u_message)
      }
    }
    if (item.dynamic_line) {
      if (typeof item.dynamic_line === 'string') {
        item.dynamic_line = await translateFunction(item.dynamic_line);
      } else if (typeof item.dynamic_line === 'object') {
        if (Array.isArray(item.dynamic_line)) {
          item.dynamic_line = await Promise.all(
            item.dynamic_line.map((dynamic_line) => translateFunction(dynamic_line))
          );
        } else {
          await dynamicLine(item.dynamic_line);
        }
      }
    }
  };
  const weakpoint_set = async(item) =>{
    for(const weakpoint of item.weakpoints){
      if (weakpoint.name) {
        weakpoint.name = await translateFunction(weakpoint.name);
      }
      if (weakpoint.effects) {
        for (const effect of weakpoint.effects) {
          if (effect.message) {
            effect.message = await translateFunction(effect.message);
          }
        }
      }
    }
  }
  const fieldsToTranslate = [
    'u_message',
    'message',
    'npc_message',
    'title',
    'descriptions',
    'npc_make_sound',
    'u_make_sound',
    'success_message',
    'fail_message',
    'spawn_message',
    'spawn_message_plural',
    'u_query',
    'npc_query'
  ];
  
  const recursiveTranslate = async (obj) => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        
        if (Array.isArray(value)) {
          // If the value is an array, recursively translate each element
          obj[key] = await Promise.all(value.map(async (item) => {
            if (typeof item === 'object' && item !== null) {
              return recursiveTranslate(item);
            } else if (typeof item === 'string' && fieldsToTranslate.includes(key)) {
              return translateFunction(item);
            }
            return item;
          }));
        } else if (typeof value === 'object' && value !== null) {
          // Recursively process nested objects
          obj[key] = await recursiveTranslate(value);
        } else if (fieldsToTranslate.includes(key) && typeof value === 'string') {
          // Translate specified text fields using translateFunction
          obj[key] = await translateFunction(value);
        }
      }
    }
  
    return obj;
  };
  
  const EOC = async (item) => {
    await recursiveTranslate(item);
  }; 

  const infoItem = async (item) => {
    // 注意可能有 <good>protection</good> 这样的标记
    item.info = await translateFunction(item.info);
  };

  const npc = async (item) => {
    item.name_unique = await translateFunction(item.name_unique);
    item.name_suffix = await translateFunction(item.name_suffix);
  };

  const subCategory = async (subCategoryName, categoryName) => {
    if (subCategoryName === 'CSC_ALL') return subCategoryName;
    // CC_SECRONOM
    // "CSC_SECRONOM_FLESH",
    // "CSC_SECRONOM_FLESH ARMOR",
    // "CSC_SECRONOM_FLESH ALTERATION"
    const prefix = categoryName.replace('CC_', 'CSC_') + '_';
    const realCategoryName = subCategoryName.replace(prefix, '');
    const translated = await translateFunction(realCategoryName);
    return prefix + translated;
  };

  // 注册各种类型数据的翻译器
  translators.profession = namePlDesc;
  translators.scenario = async (item) => {
    item.name = await translateFunction(item.name);
    item.description = await translateFunction(item.description);
    item.start_name = await translateFunction(item.start_name);
  };
  translators.start_location = namePlDesc;
  translators.furniture = namePlDesc;
  translators.gate = async (item) => {
    for (const key of Object.keys(item.messages)) {
      item.messages[key] = await translateFunction(item.messages[key]);
    }
  };
  translators.terrain = namePlDesc;
  translators.trap = async (item) => {
    item.name = await translateFunction(item.name);
  };
  translators.item_group = noop;
  translators.ammunition_type = namePlDesc;
  translators.AMMO = namePlDesc;
  translators.ARMOR = namePlDesc;
  translators.BIONIC_ITEM = namePlDesc;
  translators.BOOK = namePlDesc;
  translators.GENERIC = namePlDesc;
  translators.TOOL = namePlDesc;
  translators.COMESTIBLE = namePlDesc;
  translators.GUNMOD = namePlDesc;
  translators.GUN = namePlDesc;
  translators.TOOL_ARMOR = namePlDesc;
  translators.harvest = namePlDesc;
  translators.SPELL = namePlDesc;
  translators.MONSTER_FACTION = noop;
  translators.monstergroup = noop;
  translators.MONSTER = namePlDesc;
  translators.SPECIES = async (item) => {
    if (item.description) {
      item.description = await translateFunction(item.description);
    }
    if (item.footsteps) {
      item.footsteps = await translateFunction(item.footsteps);
    }
  };
  translators.speech = async (item) => {
    item.sound = await translateFunction(item.sound);
  };
  translators.dream = async (item) => {
    item.messages = await Promise.all(item.messages.map((msg) => translateFunction(msg)));
  };
  translators.mutation_category = async (item) => {
    item.name = await translateFunction(item.name);
    item.iv_message = await translateFunction(item.iv_message);
    item.mutagen_message = await translateFunction(item.mutagen_message);
    item.memorial_message = await translateFunction(item.memorial_message);
  };
  translators.mutation = namePlDesc;
  translators.talk_topic = talkTopic;
  translators.faction = namePlDesc;
  translators.mission_definition = async (item) => {
    await namePlDesc(item);
    if (item.dialogue) {
      item.dialogue.describe = await translateFunction(item.dialogue.describe);
      item.dialogue.offer = await translateFunction(item.dialogue.offer);
      item.dialogue.accepted = await translateFunction(item.dialogue.accepted);
      item.dialogue.rejected = await translateFunction(item.dialogue.rejected);
      item.dialogue.advice = await translateFunction(item.dialogue.advice);
      item.dialogue.inquire = await translateFunction(item.dialogue.inquire);
      item.dialogue.success = await translateFunction(item.dialogue.success);
      item.dialogue.success_lie = await translateFunction(item.dialogue.success_lie);
      item.dialogue.failure = await translateFunction(item.dialogue.failure);
    }
  };
  translators.npc_class = async (item) => {
    if(item?.name){
      item.name = await translateFunction(item.name);
    }
    if(item?.job_description){
      item.job_description = await translateFunction(item.job_description)
    }
  }
  translators.npc = npc;
  translators.trait_group = noop;
  translators.mapgen = noop;
  translators.ter_furn_transform = async (item) => {
    if (item.fail_message) {
      item.fail_message = await translateFunction(item.fail_message);
    }
    if (Array.isArray(item.terrain)) {
      for (const terrain of item.terrain) {
        await messageOrMessages(terrain);
      }
    }
  };
  translators.overmap_special = namePlDesc;
  translators.overmap_terrain = namePlDesc;
  translators.region_overlay = namePlDesc;
  translators.city_building = namePlDesc;
  translators.requirement = namePlDesc;
  translators.recipe = async (item) => {
    await namePlDesc(item);
    // if (item.subcategory && item.category) {
    //   item.subcategory = await subCategory(item.subcategory, item.category);
    // }
  };
  translators.recipe_category = async (item) => {
    await namePlDesc(item);
    // if (Array.isArray(item.recipe_subcategories) && item.id) {
    //   item.recipe_subcategories = await Promise.all(
    //     item.recipe_subcategories.map((name) => subCategory(name, item.id))
    //   );
    // }
  };
  translators.uncraft = namePlDesc;
  translators.enchantment = namePlDesc;
  translators.SPELL = namePlDesc;
  translators.achievement = async (item) => {
    await namePlDesc(item);
    if (Array.isArray(item.requirements)) {
      for (const requirement of item.requirements) {
        requirement.description = await translateFunction(requirement.description);
      }
    }
  };
  translators.ammo_effect = namePlDesc;
  translators.bionic = namePlDesc;
  translators.clothing_mod = clothingMod;
  translators.effect_type = async (item) => {
    if (Array.isArray(item.name)) {
      item.name = await Promise.all(item.name.map((msg) => translateFunction(msg)));
    }
    if (Array.isArray(item.desc)) {
      item.desc = await Promise.all(item.desc.map((msg) => translateFunction(msg)));
    }
    if (item.apply_message) {
      item.apply_message = await translateFunction(item.apply_message);
    }
    if (item.remove_message) {
      item.remove_message = await translateFunction(item.remove_message);
    }

    if (Array.isArray(item.decay_messages) && Array.isArray(item.decay_messages[0])) {
      item.decay_messages = await Promise.all(
        item.decay_messages.map((msgGroup) =>
          Promise.all(
            msgGroup.map((msg) => {
              if (msg !== 'good' && msg !== 'bad' && msg !== 'neutral' && msg !== 'mixed')
                return translateFunction(msg);
              else return msg;
            })
          )
        )
      );
    }

    if (Array.isArray(item.miss_messages) && Array.isArray(item.miss_messages[0])) {
      item.miss_messages = await Promise.all(
        item.miss_messages.map((msgGroup) => Promise.all(msgGroup.map((msg) => translateFunction(msg))))
      );
    }
  };
  translators.emit = namePlDesc;
  translators.field_type = noop;
  translators.json_flag = infoItem;
  translators.martial_art = async (item) => {
    await namePlDesc(item);
    if (Array.isArray(item.initiate)) {
      item.initiate = await Promise.all(item.initiate.map((msg) => translateFunction(msg)));
    }
    if (Array.isArray(item.onmove_buffs)) {
      for (const buff of item.onmove_buffs) {
        await namePlDesc(buff);
      }
    }
    if (Array.isArray(item.onattack_buffs)) {
      for (const buff of item.onattack_buffs) {
        await namePlDesc(buff);
      }
    }
    if (Array.isArray(item.onhit_buffs)) {
      for (const buff of item.onhit_buffs) {
        await namePlDesc(buff);
      }
    }
    if (Array.isArray(item.ongethit_buffs)) {
      for (const buff of item.ongethit_buffs) {
        await namePlDesc(buff);
      }
    }
    if (Array.isArray(item.onpause_buffs)) {
      for (const buff of item.onpause_buffs) {
        await namePlDesc(buff);
      }
    }
    if (Array.isArray(item.onblock_buffs)) {
      for (const buff of item.onblock_buffs) {
        await namePlDesc(buff);
      }
    }
    if (Array.isArray(item.ondodge_buffs)) {
      for (const buff of item.ondodge_buffs) {
        await namePlDesc(buff);
      }
    }
    if (Array.isArray(item.oncrit_buffs)) {
      for (const buff of item.oncrit_buffs) {
        await namePlDesc(buff);
      }
    }
    if (Array.isArray(item.onkill_buffs)) {
      for (const buff of item.onkill_buffs) {
        await namePlDesc(buff);
      }
    }
    if (Array.isArray(item.static_buffs)) {
      for (const buff of item.static_buffs) {
        await namePlDesc(buff);
      }
    }
  };
  translators.material = material;
  translators.MOD_INFO = namePlDesc;
  translators.scent_type = namePlDesc;
  translators.skill = namePlDesc;
  translators.snippet = async (item) => {
    if (Array.isArray(item.text)) {
      for (let text of item.text){
        if (typeof text === 'string'){
          text = await translateFunction(text)
        } else if (typeof text === 'object'){
          text.text = await translateFunction(text.text)
        }
      }
    } else if (typeof item.text === 'string') {
      item.text = await translateFunction(item.text);
    }
  };
  translators.morale_type = async (item) => {
    item.text = await translateFunction(item.text);
  };
  translators.technique = namePlDesc;
  translators.vehicle_part = namePlDesc;
  translators.overlay_order = noop;
  translators.mod_tileset = noop;
  translators.palette = noop;
  translators.event_statistic = async (item) => {
    if (item.description?.str_sp) {
      item.description.str_sp = await translateFunction(item.description.str_sp);
    }
  };
  translators.event_transformation = namePlDesc;
  translators.MAGAZINE = namePlDesc;
  translators.monsterAttack = namePlDesc;
  translators.WHEEL = namePlDesc;
  translators.mutation_type = namePlDesc;
  translators.map_extra = namePlDesc;
  translators.tool_quality = namePlDesc;
  translators.construction = namePlDesc;
  translators.construction_group = namePlDesc;
  translators.vehicle_group = noop;
  translators.PET_ARMOR = namePlDesc;
  translators.item_action = namePlDesc;
  translators.ENGINE = namePlDesc;
  translators.ITEM_CATEGORY = namePlDesc;
  translators.weapon_category = namePlDesc;
  translators.practice = namePlDesc;
  translators.vitamin = namePlDesc;
  translators.sound_effect = noop;
  translators.vehicle_placement = namePlDesc;
  translators.monster_attack = monsterAttack;
  translators.EXTERNAL_OPTION = infoItem;
  translators.overmap_land_use_code = namePlDesc;
  translators.region_settings = namePlDesc;
  translators.proficiency = namePlDesc;
  translators.overmap_location = namePlDesc;
  translators.weather_type = namePlDesc;
  translators.effect_on_condition = EOC;
  translators.ITEM_BLACKLIST = noop;
  translators.MONSTER_BLACKLIST = noop;
  translators.MONSTER_WHITELIST = noop;
  translators.colordef = noop;
  translators.monster_adjustment = noop;
  translators.MIGRATION = noop;
  translators.vehicle = namePlDesc;
  translators.vehicle_spawn = noop;
  translators.file = noop;
  translators.charge_removal_blacklist = noop;
  translators.harvest_drop_type = noop;
  translators.vehicle_part_migration = noop;
  translators.damage_type = namePlDesc;
  translators.damage_info_order = noop;
  translators.monster_flag = noop;
  translators.profession_group = noop;
  translators.proficiency_category = namePlDesc;
  translators.activity_type = async (item) => {
    item.verb = await translateFunction(item.verb);
  };
  translators.weakpoint_set = weakpoint_set;
  translators.body_part = async (item) => {
    item.name = await translateFunction(item.name);
    item.name_multiple = await translateFunction(item.name_multiple);
    item.accusative.str = await translateFunction(item.accusative.str);
    item.heading = await translateFunction(item.heading);
    item.heading_multiple = await translateFunction(item.heading_multiple);
    item.encumbrance_text = await translateFunction(item.encumbrance_text);
    item.smash_message = await translateFunction(item.smash_message);
    if(item?.hp_bar_ui_text){
      item.hp_bar_ui_text = await translateFunction(item.hp_bar_ui_text);
    }
  }
  

  return translators;
}

/**
 * 助手函数，帮我们限制一次请求翻译API的量
 */
const chunkAsync = (arr, callback, chunkSize = 1) => {
  const results = [];
  const chunks = _.chunk(arr, chunkSize);
  const work = chunks.reduce((previousPromise, chunk) => {
    return previousPromise.finally(() => {
      results.push(...chunk.map(callback));
      return Promise.all(results);
    });
  }, Promise.resolve());
  return work.finally(() => {}).then(() => Promise.all(results));
};

/**
 * 开始翻译，一次翻译一个 Mod
 * @param {string} sourceModName 源文件夹里要翻译的 mod 的名字
 */
async function translateOneMod(sourceModName) {
  const translationCacheFilePath = path.join(__dirname, translateCacheDirName, `${sourceModName}.json`);
  const sourceModDirPath = path.join(__dirname, sourceDirName, sourceModName);
  let modTranslationCache;
  try {
    const sourceFileContents = readSourceFiles(sourceModDirPath);
    modTranslationCache =
      modTranslationCaches[sourceModName] ?? new ModCache(translationCacheFilePath, {}, sourceModName);
    const contents = await chunkAsync(
      sourceFileContents,
      (fileItem) => translateStringsInContent(fileItem, modTranslationCache, sourceModName),
      10
    );
    writeToCNMod(contents);
  } catch (error) {
    logger.error(`translateOneMod failed for ${sourceModName} ${error.message} ${error.stack}`);
  }
  modTranslationCache?.writeTranslationCache();
}

async function main() {
  loadSharedTranslationCache();
  for (const sourceModName of sourceModDirs) {
    logger.log(`\n${sourceModName} Translate start!\n`);
    await translateOneMod(sourceModName);
    logger.log(`\n${sourceModName} Translate done!\n`);
    logger.flush();
  }
  // storeSharedTranslationCache();
}
// 执行翻译脚本
main().catch((error) => {
  console.error(`Unexpectedly quit, error is ${error.message} ${error.stack}`);
  logger.error(error, `${error.message} ${error.stack}`);
  logger.flush();
  process.exit(1);
});
