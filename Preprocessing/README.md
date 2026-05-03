# Preprocessing Pipeline

> [!NOTE] TL;DR
> This pipeline converts the raw JSON dataset obtained from the scrapper into a smaller MessagePack file that will be used as the main database in the web app. The pipeline can be configured by editing the `Config` block in `run.py`.

## Overview

The preprocessing scripts turn the raw JSON dataset into a more memory efficient file, that will be used for the rest of the project. The pipeline is intentionally simple and is driven from a single entry point: `run.py`.

## Pipeline Steps

1. `load.py` reads the raw JSON file and converts each game into a `Game` object.
2. `filter.py` keeps only the games that satisfy every predicate in `game_validation_predicates`. This is usefull to remove very small games with very few reviews, which are not useful for our purposes.
3. `reformat.py` removes the fields listed in `fields_to_drop` and converts the dataset into a compact raw structure.
4. `convert.py` writes the final dataset to a `.msgpack` file.

## How To Configure It

Edit the `Config` block in `run.py`. That is the only place you should normally change the pipeline behavior.

The main settings are:

- `original_dataset_path`: path to the input JSON dataset.
- `output_dataset_path`: path where the generated MessagePack file will be saved.
- `fields_to_drop`: fields removed before export to reduce file size.
- `game_validation_predicates`: checks used to filter out games that should not be kept.
- `verbose`: enables short progress messages during each step.

## What Each Setting Does

- `fields_to_drop` controls which parts of each game are removed before export. This is where you trim large or unnecessary text fields.
- `game_validation_predicates` controls dataset filtering. Add or remove predicates depending on which games should be included.
- `original_dataset_path` and `output_dataset_path` let you adapt the pipeline if your data lives somewhere else or if you want a different output name.

## Output

After the pipeline finishes, you get a compact MessagePack file containing the cleaned dataset. This format is faster to load and smaller than the original JSON.
