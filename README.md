# exposy-server

Socket.io & express based server to expose localhost port over internet using exposy-cli

## What is **Exposy** ?

Exposy is a solution for exposing developer's local HTTP APIs over Internet using a `single command`.

## How does **Exposy** work?

Exposy system has 2 components:

- [exposy-server](https://github.com/exposy/exposy-server)
  > **exposy-server** is a web socket server & http server,that needs to be hosted & made available over internet. This proxies http requests coming over internet to **_exposy-cli_** socket client via a unique http end point specific to developer's machine & specified port. See design diagrams to know more.
- [exposy-cli](https://github.com/exposy/exposy-cli)
  > **exposy-client** is npm based CLI that needs to be installed on developer's system. It connects to **_exposy-server_** via web sockets & interchanges data to & from localhost web apps by calling localhost & sending response back to **_exposy-server_** over socket.See design diagrams to know more.

<br/>

## Design Diagrams

### Overall Design

![Overall](https://user-images.githubusercontent.com/15920476/193417940-0b8f6c9b-d05f-4320-8497-412cbcc050bc.png)

### Exposy Server Design

![exposy server](https://user-images.githubusercontent.com/15920476/193417936-57f02dd3-931d-4a6f-9fd5-1dc782e6c2d8.png)

### Exposy CLI Design

![exposy cli](https://user-images.githubusercontent.com/15920476/193417942-f1792f38-6c54-4a0d-9d64-bc039e4fbc9a.png)

## Willing to Contribute?

If you are reading this section then first of all we would like to thank you. A great product requires a great team and visionary mind. Our main aim of starting this project is to help the developers at ground level and make their life easy. If you are inclining towards this vision lets work together and build plantes' most easy and usable tool

We tried to keep the dev setup as easy as Exposy working. Follow the below steps to setup full fledged working exposy on your local machine

> To test/develop exposy-cli locally,
> hosted instance of exposy server (local or cloud) is required. Follow below steps to setup exposy-server local instance

### Setup Exposy Server

- [exposy-server](https://github.com/exposy/exposy-server)
- Run `npm install`
- Create `.env` file from `.env.example`
- Run `npm run dev`

### Setup Exposy CLI

- Fork [exposy-cli](https://github.com/exposy/exposy-cli)
- Run `npm install`
- Run `npm install -g .` from the root directory (required for recognizing `exposy` command in terminal )
- Run `exposy config` to configure exposy-server settings
- Run `exposy start -p <any local app's port which you want to expose>`
