# Collection Generator CLI 🔥

Welcome to Collection Generator CLI, this repository lets you generate, upload and mint NFT collection on Archethic Public Blockchain.

## Installation 🛠️

If you are cloning the project then run this first, otherwise you can download the source code on the release page and skip this step.

```sh
git clone https://github.com/archethic-foundation/collection-generator-cli.git
```

Alternatively you can run following commands if you have node installed.

```sh
npm install
```

```sh
npm link
```

To check if project is installed successfully, run the following command -

```sh
nft welcome
```

or

```sh
node index.js welcome
```

## Usage ℹ️

Create your different layers as folders in the 'layers' directory, and add all the layer assets in these directories. You can name the assets anything as long as it has a rarity weight attached in the file name like so: `example element#70.png`. You can optionally change the delimiter `#` to anything you would like to use in the variable `rarityDelimiter` in the `src/config.js` file.

Once you have all your layers, go into `src/config.js` and update the `layerConfigurations` objects `layersOrder` array to be your layer folders name in order of the back layer to the front layer.

_Example:_ If you were creating a portrait design, you might have a background, then a head, a mouth, eyes, eyewear, and then headwear, so your `layersOrder` would look something like this:

```js
const layerConfigurations = [
  {
    growEditionSizeTo: 100,
    layersOrder: [
      { name: "Head" },
      { name: "Mouth" },
      { name: "Eyes" },
      { name: "Eyeswear" },
      { name: "Headwear" },
    ],
  },
];
```

The `name` of each layer object represents the name of the folder (in `/layers/`) that the images reside in.

Optionally you can now add multiple different `layerConfigurations` to your collection. Each configuration can be unique and have different layer orders, use the same layers or introduce new ones. This gives the artist flexibility when it comes to fine tuning their collections to their needs.

_Example:_ If you were creating a portrait design, you might have a background, then a head, a mouth, eyes, eyewear, and then headwear and you want to create a new race or just simple re-order the layers or even introduce new layers, then you're `layerConfigurations` and `layersOrder` would look something like this:

```js
const layerConfigurations = [
  {
    // Creates up to 50 artworks
    growEditionSizeTo: 50,
    layersOrder: [
      { name: "Background" },
      { name: "Head" },
      { name: "Mouth" },
      { name: "Eyes" },
      { name: "Eyeswear" },
      { name: "Headwear" },
    ],
  },
  {
    // Creates an additional 100 artworks
    growEditionSizeTo: 150,
    layersOrder: [
      { name: "Background" },
      { name: "Head" },
      { name: "Eyes" },
      { name: "Mouth" },
      { name: "Eyeswear" },
      { name: "Headwear" },
      { name: "AlienHeadwear" },
    ],
  },
];
```

Update your `format` size, ie the outputted image size, and the `growEditionSizeTo` on each `layerConfigurations` object, which is the amount of variation outputted.

You can mix up the `layerConfigurations` order on how the images are saved by setting the variable `shuffleLayerConfigurations` in the `config.js` file to true. It is false by default and will save all images in numerical order.

If you want to have logs to debug and see what is happening when you generate images you can set the variable `debugLogs` in the `config.js` file to true. It is false by default, so you will only see general logs.

If you want to play around with different blending modes, you can add a `blend: MODE.colorBurn` field to the layersOrder `options` object.

If you need a layers to have a different opacity then you can add the `opacity: 0.7` field to the layersOrder `options` object as well.

If you want to have a layer _ignored_ in the DNA uniqueness check, you can set `bypassDNA: true` in the `options` object. This has the effect of making sure the rest of the traits are unique while not considering the `Background` Layers as traits, for example. The layers _are_ included in the final image.

To use a different metadata attribute name you can add the `displayName: "Awesome Eye Color"` to the `options` object. All options are optional and can be addes on the same layer if you want to.

Here is an example on how you can play around with both filter fields:

```js
const layerConfigurations = [
  {
    growEditionSizeTo: 5,
    layersOrder: [
      { name: "Background" , {
        options: {
          bypassDNA: false;
        }
      }},
      { name: "Eyeball" },
      {
        name: "Eye color",
        options: {
          blend: MODE.destinationIn,
          opacity: 0.2,
          displayName: "Awesome Eye Color",
        },
      },
      { name: "Iris" },
      { name: "Shine" },
      { name: "Bottom lid", options: { blend: MODE.overlay, opacity: 0.7 } },
      { name: "Top lid" },
    ],
  },
];
```

Here is a list of the different blending modes that you can optionally use.

```js
const MODE = {
  sourceOver: "source-over",
  sourceIn: "source-in",
  sourceOut: "source-out",
  sourceAtop: "source-out",
  destinationOver: "destination-over",
  destinationIn: "destination-in",
  destinationOut: "destination-out",
  destinationAtop: "destination-atop",
  lighter: "lighter",
  copy: "copy",
  xor: "xor",
  multiply: "multiply",
  screen: "screen",
  overlay: "overlay",
  darken: "darken",
  lighten: "lighten",
  colorDodge: "color-dodge",
  colorBurn: "color-burn",
  hardLight: "hard-light",
  softLight: "soft-light",
  difference: "difference",
  exclusion: "exclusion",
  hue: "hue",
  saturation: "saturation",
  color: "color",
  luminosity: "luminosity",
};
```

When you are ready, run the following command and your outputted art will be in the `build/images` directory and the json in the `build/json` directory:

```sh
nft generate
```

or

```sh
node index.js generate
```

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
- `path` is the path of the folder you want to deploy

```bash
nft upload --seed myseedphrase --endpoint https://testnet.archethic.net --path ./build/images
```

or

```sh
node index.js upload --seed myseedphrase --endpoint https://testnet.archethic.net --path ./build/images
```

### Mint a collection on Archethic Public Blockchain

To mint a NFT collection on Archethic Public Blockchain - 

- `seed` is a string representing the transaction chain entropy to be able to derive and generate the keys
- `endpoint` is the URL of a welcome node to receive the transaction
- `path` is the path of the json file you want to deploy

```bash
nft mint --seed myseedphrase --endpoint https://testnet.archethic.net --path ./build/json/_metadata.json
```

or

```sh
node index.js mint --seed myseedphrase --endpoint https://testnet.archethic.net --path ./build/json/_metadata.json
```

Hope you will create some awesome artworks with this code.
