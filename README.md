# Sputnik

Sputnik is a desktop music player built using web technologies —such as JavaScript, HTML and CSS— along with Electron and React.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Getting started

Clone the repository locally:

``` bash
git clone https://github.com/bonavida/sputnik.git
```

## Requirements:

- Node 12.13.0
- npm 6.12.0

## Install dependencies:

``` bash
cd sputnik
npm install
```

## Development

To run the app in dev mode with hot-reloader, run in two separate consoles:

To run the front-end
``` bash
npm start
```

and to run electron

``` bash
npm run electron
```

## Build the app

```bash
npm run build
```

The built files are placed in `/build` at the root directory.

If you want to run electron with the built files, run the following command:

```bash
npm run electron:local
```

## App packaging and distribution

To package the app, depending on the desired platform, use the following commands:

``` bash
npm run dist:win     // Windows
npm run dist:linux   // Linux
npm run dist:osx     // Mac
npm run dist:all     // All platforms
```

The package files are placed in `/release`.

## Preload script
This file, placed at `electron/preload.js`, is needed to expose the electron API inside the React app. It lets your UI communicate with the native electron APIs.

### Electron API Usage
Inside the React app we have access to the native electron APIs trough `window.electron`. In the example below we use the electron module `ipcRenderer`. As you can see, we have added some extra code just to be sure that this won't throw an error if the app is deployed in the web browser and not in electron.

```
const { ipcRenderer } = window.electron || {};

...

ipcRenderer && ipcRenderer.send('message');  // This will only run in electron
```
