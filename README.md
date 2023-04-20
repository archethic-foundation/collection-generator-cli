# Collection Generator CLI 🔥

Welcome to Collection Generator CLI, this repository lets you generate, upload and mint NFT collection on Archethic Public Blockchain.

## Installation 🛠️

```sh
npm install -g aenft-collection 
```

To check if project is installed successfully, run the following command -

```sh
aenft-collection about
```

## Usage ℹ️
First, create a ``config.json`` file with this structure (for example at the root of your project):

```json
{
  "namePrefix": "Your Collection",
  "description": "Remember to replace this description",
  "baseUri": "",
  "supply": 500000000,
  "name": "AE Collection",
  "symbol": "AE05",
  "layerConfigurations": [
    {
      "growEditionSizeTo": 5,
      "layersOrder": [
        { "name": "Background" },
        { "name": "Eyeball" },
        { "name": "Eye color" },
        { "name": "Iris" },
        { "name": "Shine" },
        { "name": "Bottom lid" },
        { "name": "Top lid" },
      ]
    }
  ],
  "shuffleLayerConfigurations": false,
  "debugLogs": false,
  "format": {
    "width": 512,
    "height": 512,
    "smoothing": false
  },
  "text": {
    "only": false,
    "color": "#ffffff",
    "size": 20,
    "xGap": 40,
    "yGap": 40,
    "align": "left",
    "baseline": "top",
    "weight": "regular",
    "family": "Courier",
    "spacer": " => "
  },
  "pixelFormat": {
    "ratio": 0.015625
  },
  "background": {
    "generate": true,
    "brightness": "80%",
    "static": false,
    "default": "#000000"
  },
  "extraMetadata": {},
  "rarityDelimiter": "#",
  "uniqueDnaTolerance": 10000,
  "addDnaToMetadata": false,
  "addEditionToMetadata": false
}
```

Create your different layers as folders in a 'layers' directory (this directory must be in the root), and add all the layer assets in these directories. You can name the assets anything as long as it has a rarity weight attached in the file name like so: `example element#70.png`. You can optionally change the delimiter `#` to anything you would like to use in the variable `rarityDelimiter` in the `config.json` file.

Once you have all your layers, go into your `config.json` and update the `layerConfigurations` objects `layersOrder` array to be your layer folders name in order of the back layer to the front layer.

_Example:_ If you were creating a portrait design, you might have a background, then a head, a mouth, eyes, eyewear, and then headwear, so your `layersOrder` would look something like this:

```json
"layerConfigurations": [
    {
      "growEditionSizeTo": 100,
      "layersOrder": [
        { "name": "Head" },
        { "name": "Mouth" },
        { "name": "Eyes" },
        { "name": "Eyeswear" },
        { "name": "Headwear" },
      ]
    }
  ],
```

The `name` of each layer object represents the name of the folder (in `/layers/`) that the images reside in.

Optionally you can now add multiple different `layerConfigurations` to your collection. Each configuration can be unique and have different layer orders, use the same layers or introduce new ones. This gives the artist flexibility when it comes to fine tuning their collections to their needs.

_Example:_ If you were creating a portrait design, you might have a background, then a head, a mouth, eyes, eyewear, and then headwear and you want to create a new race or just simple re-order the layers or even introduce new layers, then you're `layerConfigurations` and `layersOrder` would look something like this:

```jsonc
  "layerConfigurations": [
    {
      // Creates up to 50 artworks
      "growEditionSizeTo": 50,
      "layersOrder": [
        { "name": "Background" },
        { "name": "Head" },
        { "name": "Mouth" },
        { "name": "Eyes" },
        { "name": "Eyeswear" },
        { "name": "Headwear" },
      ]
    },
    {
      // Creates an additional 100 artworks
      "growEditionSizeTo": 150,
      "layersOrder": [
        { "name": "Background" },
        { "name": "Head" },
        { "name": "Mouth" },
        { "name": "Eyes" },
        { "name": "Eyeswear" },
        { "name": "Headwear" },
      ]
    }
  ]
```

Update your `format` size, ie the outputted image size, and the `growEditionSizeTo` on each `layerConfigurations` object, which is the amount of variation outputted.

You can mix up the `layerConfigurations` order on how the images are saved by setting the variable `shuffleLayerConfigurations` in the `config.js` file to true. It is false by default and will save all images in numerical order.

If you want to have logs to debug and see what is happening when you generate images you can set the variable `debugLogs` in the `config.json` file to true. It is false by default, so you will only see general logs.


When you are ready, run the following command and your outputted art will be in the `build/images` directory and the json in the `build/json` directory:

```sh
aenft-collection generate --config ./config.json
```

- `config` is the path of your `config.json` file.
- `layers` is the path to your NFT layers folder (optional, default to: `./layers`)
- `output` is the path of your NFT collection building output (optional, default to: `./build`)
  
The program will output all the images in the `build/images` directory along with the metadata files in the `build/json` directory. Each collection will have a `_metadata.json` file that consists of all the metadata in the collection inside the `build/json` directory. The `build/json` folder also will contain all the single json files that represent each image file. The single json file of a image will look something like this:

```json
{
  "name": "Your Collection #1",
  "description": "Remember to replace this description",
  "image": "http://localhost:4000/api/web_hosting/0000c11d9aba1cf7228230c479e3c85f370065b0a7dddc99035e635de78faff263cb/1.png",
  "dna": "f696ea4c20ab1ee434ba5b8e99a4af0f4f10a4b0",
  "edition": 1,
  "date": 1676285790212,
  "attributes": [
    {
      "trait_type": "Background",
      "value": "Black"
    },
    {
      "trait_type": "Eyeball",
      "value": "White"
    },
    {
      "trait_type": "Eye color",
      "value": "Cyan"
    },
    {
      "trait_type": "Iris",
      "value": "Medium"
    },
    {
      "trait_type": "Shine",
      "value": "Shapes"
    },
    {
      "trait_type": "Bottom lid",
      "value": "Low"
    },
    {
      "trait_type": "Top lid",
      "value": "Middle"
    }
  ]
}
```

You can also add extra metadata to each metadata file by adding your extra items, (key: value) pairs to the `extraMetadata` object variable in the `config.js` file.

```js
const extraMetadata = {
  creator: "Manuj Varma",
};
```

If you don't need extra metadata, simply leave the object empty. It is empty by default.

```js
const extraMetadata = {};
```

That's it, you're done.

## Upload & Mint on Archethic

### Upload the generated images to Archethic Public Blockchain

To upload images - 

- `seed` is a string representing the transaction chain entropy to be able to derive and generate the keys
- `endpoint` is the URL of a welcome node to receive the transaction
- `build-path` is the path of the NFT collection generation output (optional, default to: `./build`)
  
```bash
aenft-collection upload --seed myseedphrase --endpoint https://testnet.archethic.net
```

### Mint a collection on Archethic Public Blockchain

To mint a NFT collection on Archethic Public Blockchain - 

- `seed` is a string representing the transaction chain entropy to be able to derive and generate the keys
- `endpoint` is the URL of a welcome node to receive the transaction
- `build-path` is the path of the NFT collection generation output (optional, default to: `./build`)

```bash
aenft-collection mint --seed myseedphrase --endpoint https://testnet.archethic.net
```

Hope you will create some awesome artworks with this code.
