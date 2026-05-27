# Project of Data Visualization (COM-480)

| Student's name | SCIPER |
| -------------- | ------ |
| Alice Reymond | 325763 |
| Lorie Xu | 327573 |
| Valentin Porchet | 347219 |

[Milestone 1](milestones/Milestone1.pdf) • [Milestone 2](milestones/Milestone2.pdf) • [Milestone 3](milestones/St)
## Project description
### Introduction
The goal of this project is to help game developers and publishers to better understand what makes a game successful on the Steam platform. To do so, we have scrapped a large dataset of games and their attributes from the Steam store, and we have built a web application that allows to explore this dataset through different visualizations. The web application is built with TypeScript and D3.js, and it is deployed on GitHub Pages.

### Visualizations:
The web application includes the following visualizations:
- A tool to search for games individually and to see their main attributes and reviews. It also provides a tag selection interface that allows to find more similar games.
- A Ranking of the top games with different success metrics (number of reviews, average rating, etc.). 
- An overview of the whole dataset in the form of a parallel coordinates plot, which allows to see the distribution of the different attributes and to find interesting correlations between them by brushing the lines.
- A race plot showing the evolution of game releases by genre over time.

## How to run the project
### Prerequisites
- Python (tested with Python 3.13)
- Node.js (with npm, which is included in the Node.js installation) 

### Clone the repository
For the scraping part, we used the [Steam Games Scraper](https://github.com/FronkonGames/Steam-Games-Scraper) developed by [Martin Bustos](https://github.com/FronkonGames) (FronkonGames). We added it as a git submodule to our repository, so you can clone the repository with the following command:
```
    git clone --recurse-submodules https://github.com/com-480-data-visualization/STEAMingHot.git
```
If you have already cloned the repo without the `--recurse-submodules` flag, you can initialize and update the submodule with:
```
    git submodule update --init
```
The submodule is pinned to a specific commit(`1d4026d658d3a9d053de6257323b0b5d02b69e25`), so you don't have to worry about it being updated and breaking your code.

### Scrape the data (optional)
The scraping part is optional, since we already provide a scraped and preprocessed version of the dataset in the `steaminghot/public/data` folder. However, if you want the most up-to-date data, you can follow the very simple instructions in the corresponding [README](Steam-Games-Scraper/README.md) of the submodule (you'll only need to obtain a Steam Web API key and store it in the right file). **When done with scraping, make sure the generated file `games.json` is in the `Data` folder of the root directory of the project.**

### Preprocess the data (also optional)
The preprocessing pipeline is implemented in the `Preprocessing` folder. The goal of the preprocessing step is to clean the data and to transform it into a format that can be easily used by the visualization part. Note that this dataset is already provided in the `steaminghot/public/data` folder, so you can skip this step if you want. However, if you want to try the preprocessing pipeline on a pre-scraped dataset available on [Kaggle](https://www.kaggle.com/datasets/fronkongames/steam-games-dataset/data?select=games.json) or if you have scraped a new dataset, you can run the following command from the root directory of the project:
```
    python Preprocessing/run.py
```
When the pipeline is done, it will generate a file called `games.msgpack` in the `steaminghot/public/data` folder, which will be used as the main database for the web app. More details about the preprocessing pipeline can be found in the [Documentation](Documentation/Preprocessing.md).

### Run and build the web app
The web app is implemented in the `steaminghot` folder. As the source code is written in **TypeScript**, we use the **Vite** build tool to compile the code and to run the development server. We also use the **gh-pages** module to deploy the web app on GitHub Pages. All details about how to run and build the web app can be found in the [build-and-run.md](Documentation/build-and-run.md) file in the `Documentation` folder.