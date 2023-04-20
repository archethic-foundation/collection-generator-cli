import { createCanvas, loadImage } from "canvas";
import fs from "fs";
import chalk from "chalk";
import sha1 from "sha1";

const DNA_DELIMITER = "-";

const command = "generate";
const describe = "Generate random NTF collection";
const builder = {
  config: {
    description: "Path to your NFT collection config file",
    type: "string",
    demandOption: false,
    default: "./config.json",
    alias: "c",
  },
  layers: {
    description: "Path to your NFT layers folder",
    type: "string",
    demandOption: false,
    default: "./layers",
    alias: "l",
  },
  output: {
    description: "Path to your NFT collection output folder",
    type: "string",
    demandOption: false,
    default: "./build",
    alias: "o",
  },
};

function checkRequiredConfig(config) {
  const required = [
    "namePrefix",
    "description",
    "baseUri",
    "supply",
    "name",
    "symbol",
    "layerConfigurations",
    "shuffleLayerConfigurations",
    "debugLogs",
    "format",
    "text",
    "pixelFormat",
    "background",
    "extraMetadata",
    "rarityDelimiter",
    "uniqueDnaTolerance",
    "addDnaToMetadata",
    "addEditionToMetadata",
  ];
  const missing_config = [];
  required.forEach((key) => {
    if (!config.hasOwnProperty(key)) {
      missing_config.push(key);
    }
  });
  if (missing_config.length > 0) {
    console.log(
      chalk.red(`Missing required config options: ${missing_config.join(", ")}`)
    );
    process.exit(1);
  }
}

const handler = async function (argv) {
  // check if config file exists
  const configPath = argv.config;
  if (!fs.existsSync(configPath)) {
    console.log(
      chalk.red(
        `Could not find config file at ${configPath}, please check the path and try again.`
      )
    );
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(configPath));
  checkRequiredConfig(config);
  global.config = config;

  global.buildDir = argv.output;
  global.layersDir = argv.layers;

  global.canvas = createCanvas(config.format.width, config.format.height);
  global.ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = config.format.smoothing;

  global.metadataList = [];
  global.attributesList = [];
  const dnaList = new Set();

  const setupFolders = () => {
    if (fs.existsSync(buildDir)) {
      fs.rmSync(buildDir, { recursive: true });
    }
    fs.mkdirSync(buildDir);
    fs.mkdirSync(`${buildDir}/json`);
    fs.mkdirSync(`${buildDir}/images`);
  };

  const createRandomizedImages = async () => {
    let globalEditionCount = 1;

    for (
      let configIndex = 0;
      configIndex < config.layerConfigurations.length;
      configIndex++
    ) {
      let editionCount = 1;
      let failedCount = 0;
      let abstractedIndexes = [];

      for (
        let i = globalEditionCount;
        i <
        globalEditionCount +
          config.layerConfigurations[configIndex].growEditionSizeTo;
        i++
      ) {
        abstractedIndexes.push(i);
      }

      if (config.shuffleLayerConfigurations) {
        abstractedIndexes = shuffle(abstractedIndexes);
      }

      config.debugLogs
        ? console.log("Editions left to create: ", abstractedIndexes)
        : null;

      const layers = layersSetup(
        config.layerConfigurations[configIndex].layersOrder
      );

      while (
        editionCount <=
        config.layerConfigurations[configIndex].growEditionSizeTo
      ) {
        let newDna = createDna(layers);

        if (isDnaUnique(dnaList, newDna)) {
          let results = constructLayerToDna(newDna, layers);
          let loadedElements = [];

          results.forEach((layer) => {
            loadedElements.push(loadLayerImg(layer));
          });

          await Promise.all(loadedElements).then((renderObjectArray) => {
            config.debugLogs ? console.log("Clearing canvas") : null;
            ctx.clearRect(0, 0, config.format.width, config.format.height);

            if (config.background.generate) {
              drawBackground();
            }

            renderObjectArray.forEach((renderObject, index) => {
              drawElement(
                renderObject,
                index,
                config.layerConfigurations[configIndex].layersOrder.length
              );
            });

            config.debugLogs
              ? console.log("Editions left to create: ", abstractedIndexes)
              : null;

            saveImage(abstractedIndexes[0]);
            addMetadata(newDna, abstractedIndexes[0]);
            saveMetaDataSingleFile(abstractedIndexes[0]);
            console.log(
              chalk.green(
                `Created edition: ${abstractedIndexes[0]}, with DNA: ${sha1(
                  newDna
                )}`
              )
            );
          });

          dnaList.add(filterDNAOptions(newDna));
          editionCount++;
          abstractedIndexes.shift();
        } else {
          console.log("DNA exists!");
          failedCount++;

          if (failedCount >= config.uniqueDnaTolerance) {
            console.log(
              `You need more layers or elements to grow your edition to ${config.layerConfigurations[configIndex].growEditionSizeTo} artworks!`
            );
            process.exit(1);
          }
        }
      }

      globalEditionCount +=
        config.layerConfigurations[configIndex].growEditionSizeTo;
    }

    writeMetaData(
      JSON.stringify(
        {
          supply: config.supply,
          name: config.name,
          type: "non-fungible",
          symbol: config.symbol,
          aeip: [2, 9],
          collection: metadataList,
        },
        null,
        2
      )
    );
  };

  setupFolders();
  createRandomizedImages();
};

function cleanDna(_str) {
  const withoutOptions = removeQueryStrings(_str);
  let dna = Number(withoutOptions.split(":").shift());
  return dna;
}

function cleanName(_str) {
  let nameWithoutExtension = _str.slice(0, -4);
  let nameWithoutWeight = nameWithoutExtension
    .split(config.rarityDelimiter)
    .shift();
  return nameWithoutWeight;
}

function getElements(path) {
  // check if path exists
  if (!fs.existsSync(path)) {
    console.log(
      chalk.red(
        `Could not find layer folder at ${path}, please check the path and try again.`
      )
    );
    process.exit(1);
  }
  return fs
    .readdirSync(path)
    .filter((item) => !/(^|\/)\.[^\/\.]/g.test(item))
    .map((i, index) => {
      if (i.includes("-")) {
        throw new Error(`layer name can not contain dashes, please fix: ${i}`);
      }
      return {
        id: index,
        name: cleanName(i),
        filename: i,
        path: `${path}${i}`,
        weight: getRarityWeight(i),
      };
    });
}

function layersSetup(layersOrder) {
  const layers = layersOrder.map((layerObj, index) => ({
    id: index,
    elements: getElements(`${layersDir}/${layerObj.name}/`),
    name:
      layerObj.options?.["displayName"] != undefined
        ? layerObj.options?.["displayName"]
        : layerObj.name,
    blend:
      layerObj.options?.["blend"] != undefined
        ? layerObj.options?.["blend"]
        : "source-over",
    opacity:
      layerObj.options?.["opacity"] != undefined
        ? layerObj.options?.["opacity"]
        : 1,
    bypassDNA:
      layerObj.options?.["bypassDNA"] !== undefined
        ? layerObj.options?.["bypassDNA"]
        : false,
  }));
  return layers;
}

function saveImage(_editionCount) {
  fs.writeFileSync(
    `${buildDir}/images/${_editionCount}.png`,
    canvas.toBuffer("image/png")
  );
}

function genColor() {
  let hue = Math.floor(Math.random() * 360);
  let pastel = `hsl(${hue}, 100%, ${config.background.brightness})`;
  return pastel;
}

function drawBackground() {
  ctx.fillStyle = config.background.static
    ? config.background.default
    : genColor();
  ctx.fillRect(0, 0, config.format.width, config.format.height);
}

function addMetadata(_dna, _edition) {
  let tempMetadata = {
    name: `${global.config.namePrefix} #${_edition}`,
    description: config.description,
    content: {
      aeweb: `${config.baseUri}/${_edition}.png`,
    },
    type_mime: `image/png`,
    edition: _edition,
    ...config.extraMetadata,
    attributes: attributesList,
  };

  if (config.addDnaToMetadata) {
    tempMetadata.dna = sha1(_dna);
  }

  metadataList.push(tempMetadata);
  attributesList = [];
}

function addAttributes(_element) {
  let selectedElement = _element.layer.selectedElement;
  attributesList.push({
    trait_type: _element.layer.name,
    value: selectedElement.name,
  });
}

async function loadLayerImg(_layer) {
  try {
    return new Promise(async (resolve) => {
      const image = await loadImage(`${_layer.selectedElement.path}`);
      resolve({ layer: _layer, loadedImage: image });
    });
  } catch (error) {
    console.error("Error loading image:", error);
  }
}

function addText(_sig, x, y, size) {
  ctx.fillStyle = text.color;
  ctx.font = `${text.weight} ${size}pt ${text.family}`;
  ctx.textBaseline = text.baseline;
  ctx.textAlign = text.align;
  ctx.fillText(_sig, x, y);
}

function drawElement(_renderObject, _index, _layersLen) {
  ctx.globalAlpha = _renderObject.layer.opacity;
  ctx.globalCompositeOperation = _renderObject.layer.blend;
  config.text.only
    ? addText(
        `${_renderObject.layer.name}${text.spacer}${_renderObject.layer.selectedElement.name}`,
        config.text.xGap,
        config.text.yGap * (_index + 1),
        config.text.size
      )
    : ctx.drawImage(
        _renderObject.loadedImage,
        0,
        0,
        config.format.width,
        config.format.height
      );

  addAttributes(_renderObject);
}

function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;
  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

function saveMetaDataSingleFile(_editionCount) {
  let metadata = metadataList.find((meta) => meta.edition == _editionCount);
  config.debugLogs
    ? console.log(
        `Writing metadata for ${_editionCount}: ${JSON.stringify(metadata)}`
      )
    : null;

  if (!config.addEditionToMetadata) {
    delete metadata.edition;
  }

  fs.writeFileSync(
    `${buildDir}/json/${_editionCount}.json`,
    JSON.stringify(metadata, null, 2)
  );
}

function createDna(_layers) {
  let randNum = [];
  _layers.forEach((layer) => {
    var totalWeight = 0;
    layer.elements.forEach((element) => {
      totalWeight += element.weight;
    });

    let random = Math.floor(Math.random() * totalWeight);
    for (var i = 0; i < layer.elements.length; i++) {
      random -= layer.elements[i].weight;
      if (random < 0) {
        return randNum.push(
          `${layer.elements[i].id}:${layer.elements[i].filename}${
            layer.bypassDNA ? "?bypassDNA=true" : ""
          }`
        );
      }
    }
  });
  return randNum.join(DNA_DELIMITER);
}

function writeMetaData(_data) {
  fs.writeFileSync(`${buildDir}/json/_metadata.json`, _data);
}

function isDnaUnique(_DnaList = new Set(), _dna = "") {
  const _filteredDNA = filterDNAOptions(_dna);
  return !_DnaList.has(_filteredDNA);
}

function removeQueryStrings(_dna) {
  const query = /(\?.*$)/;
  return _dna.replace(query, "");
}

function filterDNAOptions(_dna) {
  const dnaItems = _dna.split(DNA_DELIMITER);
  const filteredDNA = dnaItems.filter((element) => {
    const query = /(\?.*$)/;
    const querystring = query.exec(element);
    if (!querystring) {
      return true;
    }
    const options = querystring[1].split("&").reduce((r, setting) => {
      const keyPairs = setting.split("=");
      return { ...r, [keyPairs[0]]: keyPairs[1] };
    }, []);

    return options.bypassDNA;
  });

  return filteredDNA.join(DNA_DELIMITER);
}

function getRarityWeight(_str) {
  let nameWithoutExtension = _str.slice(0, -4);
  let nameWithoutWeight = Number(
    nameWithoutExtension.split(config.rarityDelimiter).pop()
  );
  if (isNaN(nameWithoutWeight)) {
    nameWithoutWeight = 1;
  }
  return nameWithoutWeight;
}

function constructLayerToDna(_dna = "", _layers = []) {
  let mappedDnaToLayers = _layers.map((layer, index) => {
    let selectedElement = layer.elements.find(
      (e) => e.id == cleanDna(_dna.split(DNA_DELIMITER)[index])
    );
    return {
      name: layer.name,
      blend: layer.blend,
      opacity: layer.opacity,
      selectedElement: selectedElement,
    };
  });
  return mappedDnaToLayers;
}

export default {
  command,
  describe,
  handler,
  builder,
};
