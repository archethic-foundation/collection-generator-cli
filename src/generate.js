import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import chalk from 'chalk';
import sha1 from 'sha1';
import minimist from 'minimist';
const args = minimist(process.argv.slice(2));
const configPath = args.config;
const config = JSON.parse(fs.readFileSync(configPath));

const {
  format,
  baseUri,
  description,
  background,
  uniqueDnaTolerance,
  layerConfigurations,
  rarityDelimiter,
  shuffleLayerConfigurations,
  debugLogs,
  extraMetadata,
  text,
  namePrefix,
  supply,
  name,
  symbol,
  addEditionToMetadata,
  addDnaToMetadata
} = config;

const basePath = process.cwd();
const buildDir = `${basePath}/build`;
const layersDir = `${basePath}/layers`;

const canvas = createCanvas(format.width, format.height);
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = format.smoothing;

let metadataList = [];
let attributesList = [];
const dnaList = new Set();
const DNA_DELIMITER = '-';

const command = 'generate';

const describe = 'Generate random NFTs';

const handler = async function () {

  const setupFolders = () => {
    if (fs.existsSync(buildDir)) {
      fs.rmSync(buildDir, { recursive: true });
    }
    fs.mkdirSync(buildDir);
    fs.mkdirSync(`${buildDir}/json`);
    fs.mkdirSync(`${buildDir}/images`);
  };

  const createRandomizedImages = async () => {
    let layerConfigIndex = 0;
    let editionCount = 1;
    let failedCount = 0;
    let abstractedIndexes = [];
    for (
      let i = 1;
      i <= layerConfigurations[layerConfigurations.length - 1].growEditionSizeTo;
      i++
    ) {
      abstractedIndexes.push(i);
    }
    if (shuffleLayerConfigurations) {
      abstractedIndexes = shuffle(abstractedIndexes);
    }
    debugLogs
      ? console.log("Editions left to create: ", abstractedIndexes)
      : null;
    while (layerConfigIndex < layerConfigurations.length) {
      const layers = layersSetup(
        layerConfigurations[layerConfigIndex].layersOrder
      );
      while (
        editionCount <= layerConfigurations[layerConfigIndex].growEditionSizeTo
      ) {
        let newDna = createDna(layers);
        if (isDnaUnique(dnaList, newDna)) {
          let results = constructLayerToDna(newDna, layers);
          let loadedElements = [];

          results.forEach((layer) => {
            loadedElements.push(loadLayerImg(layer));
          });

          await Promise.all(loadedElements).then((renderObjectArray) => {
            debugLogs ? console.log("Clearing canvas") : null;
            ctx.clearRect(0, 0, format.width, format.height);

            if (background.generate) {
              drawBackground();
            }
            renderObjectArray.forEach((renderObject, index) => {
              drawElement(
                renderObject,
                index,
                layerConfigurations[layerConfigIndex].layersOrder.length
              );

            });

            debugLogs
              ? console.log("Editions left to create: ", abstractedIndexes)
              : null;
            saveImage(abstractedIndexes[0]);
            addMetadata(newDna, abstractedIndexes[0]);
            saveMetaDataSingleFile(abstractedIndexes[0]);
            console.log(chalk.green(
              `Created edition: ${abstractedIndexes[0]}, with DNA: ${sha1(
                newDna
              )}`)
            );
          });
          dnaList.add(filterDNAOptions(newDna));
          editionCount++;
          abstractedIndexes.shift();
        } else {
          console.log("DNA exists!");
          failedCount++;
          if (failedCount >= uniqueDnaTolerance) {
            console.log(
              `You need more layers or elements to grow your edition to ${layerConfigurations[layerConfigIndex].growEditionSizeTo} artworks!`
            );
            process.exit(1);
          }
        }
      }
      layerConfigIndex++;
    }
    writeMetaData(JSON.stringify({
      supply: supply,
      name: name,
      type: "non-fungible",
      symbol: symbol,
      aeip: [2, 9],
      collection: metadataList
    }, null, 2));
  };

  setupFolders();
  createRandomizedImages();

}

function cleanDna(_str) {
  const withoutOptions = removeQueryStrings(_str);
  let dna = Number(withoutOptions.split(':').shift());
  return dna;
};

function cleanName(_str) {
  let nameWithoutExtension = _str.slice(0, -4);
  let nameWithoutWeight = nameWithoutExtension.split(rarityDelimiter).shift();
  return nameWithoutWeight;
};

function getElements(path) {
  return fs
    .readdirSync(path)
    .filter((item) => !/(^|\/)\.[^\/\.]/g.test(item))
    .map((i, index) => {
      if (i.includes('-')) {
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
};

function layersSetup(layersOrder) {
  const layers = layersOrder.map((layerObj, index) => ({
    id: index,
    elements: getElements(`${layersDir}/${layerObj.name}/`),
    name:
      layerObj.options?.['displayName'] != undefined
        ? layerObj.options?.['displayName']
        : layerObj.name,
    blend:
      layerObj.options?.['blend'] != undefined
        ? layerObj.options?.['blend']
        : 'source-over',
    opacity:
      layerObj.options?.['opacity'] != undefined ? layerObj.options?.['opacity'] : 1,
    bypassDNA:
      layerObj.options?.['bypassDNA'] !== undefined ? layerObj.options?.['bypassDNA'] : false,
  }));
  return layers;
};

function saveImage(_editionCount) {
  fs.writeFileSync(`${buildDir}/images/${_editionCount}.png`, canvas.toBuffer('image/png'));
};


function genColor() {
  let hue = Math.floor(Math.random() * 360);
  let pastel = `hsl(${hue}, 100%, ${background.brightness})`;
  return pastel;
};

function drawBackground() {
  ctx.fillStyle = background.static ? background.default : genColor();
  ctx.fillRect(0, 0, format.width, format.height);
};

function addMetadata(_dna, _edition) {
  let tempMetadata = {
    name: `${namePrefix} #${_edition}`,
    description: description,
    content: {
      aeweb: `${baseUri}/${_edition}.png`,
    },
    type_mime: `image/png`,
    edition: _edition,
    ...extraMetadata,
    attributes: attributesList,
  };

  if (addDnaToMetadata) {
    tempMetadata.dna = sha1(_dna)
  }

  metadataList.push(tempMetadata);
  attributesList = [];
};

function addAttributes(_element) {
  let selectedElement = _element.layer.selectedElement;
  attributesList.push({
    trait_type: _element.layer.name,
    value: selectedElement.name,
  });
};

async function loadLayerImg(_layer) {
  try {
    return new Promise(async (resolve) => {
      const image = await loadImage(`${_layer.selectedElement.path}`);
      resolve({ layer: _layer, loadedImage: image });
    });
  } catch (error) {
    console.error("Error loading image:", error);
  }
};

function addText(_sig, x, y, size) {
  ctx.fillStyle = text.color;
  ctx.font = `${text.weight} ${size}pt ${text.family}`;
  ctx.textBaseline = text.baseline;
  ctx.textAlign = text.align;
  ctx.fillText(_sig, x, y);
};

function drawElement(_renderObject, _index, _layersLen) {
  ctx.globalAlpha = _renderObject.layer.opacity;
  ctx.globalCompositeOperation = _renderObject.layer.blend;
  text.only
    ? addText(
      `${_renderObject.layer.name}${text.spacer}${_renderObject.layer.selectedElement.name}`,
      text.xGap,
      text.yGap * (_index + 1),
      text.size
    )
    : ctx.drawImage(
      _renderObject.loadedImage,
      0,
      0,
      format.width,
      format.height
    );

  addAttributes(_renderObject);
};

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
  debugLogs
    ? console.log(
      `Writing metadata for ${_editionCount}: ${JSON.stringify(metadata)}`
    )
    : null;

  if (!addEditionToMetadata) {
    delete metadata.edition
  }

  fs.writeFileSync(
    `${buildDir}/json/${_editionCount}.json`,
    JSON.stringify(metadata, null, 2)
  );
};

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
          `${layer.elements[i].id}:${layer.elements[i].filename}${layer.bypassDNA ? "?bypassDNA=true" : ""
          }`
        );
      }
    }
  });
  return randNum.join(DNA_DELIMITER);
};

function writeMetaData(_data) {
  fs.writeFileSync(`${buildDir}/json/_metadata.json`, _data);
};

function isDnaUnique(_DnaList = new Set(), _dna = "") {
  const _filteredDNA = filterDNAOptions(_dna);
  return !_DnaList.has(_filteredDNA);
};

function removeQueryStrings(_dna) {
  const query = /(\?.*$)/;
  return _dna.replace(query, "");
};

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
};

function getRarityWeight(_str) {
  let nameWithoutExtension = _str.slice(0, -4);
  let nameWithoutWeight = Number(nameWithoutExtension.split(rarityDelimiter).pop());
  if (isNaN(nameWithoutWeight)) {
    nameWithoutWeight = 1;
  }
  return nameWithoutWeight;
};

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
};

export default {
  command,
  describe,
  handler
};
