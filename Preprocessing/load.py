import os 
import json
from common import *
def load_dataset(datapath: str, verbose = True) -> Dataset:
    dataset_: RawDataset = {}
    if os.path.exists(datapath):
        with open(datapath, 'r', encoding='utf-8') as fin:
            text = fin.read()
            if len(text) > 0:
                dataset_ = json.loads(text)
    else:
        raise FileNotFoundError(f'Could not find {datapath}. Please make sure the file exists and is in the correct location.')

    dataset: Dataset = {}
    for game_id, game_data in dataset_.items():
        dataset[str(game_id)] = Game(game_id=game_id, **game_data)

    if verbose:
        print(f'Loaded {len(dataset)} games from {datapath}.')
    
    return dataset