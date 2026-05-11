# How to use the build and run scripts
This guide will walk you through the steps to build and run the project. It covers the prerequisites, how to set up the environment, and how to use Vite for development and deployment. By following this guide, you will be able to get the project up and running on your local machine and deploy it to GitHub Pages when you're ready.

>[!TIP] 
> The development environment for the frontend is entirely contained within the `steaminghot` folder. This means that all the commands you need to run for development and deployment should be executed from within that folder. Make sure to navigate to the `./steaminghot` directory every time you want to run a command related to the frontend development or deployment.
 
## Prerequisites
### Node.js and npm
To build and run the project, it is absolutely necessary to have Node.js and npm installed on your machine. Luckily, npm comes bundled with Node.js, so you only need to install Node.js from the official website: https://nodejs.org/en/download.

After installing Node.js, you can verify that both Node.js and npm are installed correctly by running the following commands in your terminal:
```bash
node -v
npm -v
```
### Preprocessing the dataset
For the website to work, you need to preprocess the dataset and convert it into a format that can be easily loaded by the frontend. If the `steaminghot/public/data` folder is empty (it should not be the case), it means that the dataset has not been preprocessed yet, and you need to run the preprocessing script before you can build and run the project. This is done by running the `run.py` script located in the `preprocessing` folder. This script will read the raw dataset, preprocess it, and save it in the `steaminghot/public/data` folder in a format that can be easily loaded by the frontend (in our case, we use MessagePack format). More information about the preprocessing steps can be found in the `documentation/preprocessing.md` file.

## First time setup
When pulling the project for the first time, you will notice that there is a `package.json` file in the `steaminghot` folder, which is the configuration file for npm. Don't panic, everything is already set up for you, you just need to run the following command in the `steaminghot` folder to install all the dependencies:
```bash
npm install
```
That's it! You are now ready to build and run the project. 

## How to build and run with Vite
### During development
For development, simply run the following command in the `steaminghot` directory:
```bash
npm run dev
```
This will start a local development server with hot reloading (changes you make to the code will be reflected immediately in the browser).

### Production build
To produce a production-ready build, run the build command:
```bash
npm run build
```
This compiles the TypeScript source to JavaScript, bundles all dependencies, and outputs everything into a `dist` folder. You can then verify the result locally by running:
```bash
npm run preview
```
This will serves the `dist` folder on a local development server.

## How to deploy website on GitHub Pages
When you are ready to deploy the last version of the website, simply run:
```bash
npm run deploy
```
This will build the app and push the contents of the `dist` folder to the `gh-pages` branch of the repository, which is the branch used by GitHub Pages to serve the website.

## Under the hood (just for the curious ones)
### What is Vite and why we use it?
Vite is both a build tool and a development server. It takes care of compiling TypeScript into browser-compatible JavaScript and serving the app locally while you work on it. It also supports hot module replacement (HMR), meaning changes you make to the code are reflected in the browser instantly, without a manual page refresh.
### What does the npm environment contains?
- Vite: as explained above, we use Vite as our build tool and development server.
- TypeScript: we use TypeScript as our programming language for better type safety and developer experience.
- D3.js: obviously we use D3.js for our visualizations.
- Lodash: we use Lodash for some utility functions that make our code cleaner and more efficient.
- gh-pages: this is a package that allows us to easily deploy our app to GitHub Pages by pushing the built files to the `gh-pages` branch of our repository.
