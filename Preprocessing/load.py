import os 
import json
from common import *
def load_dataset(datapath: str, verbose = True) -> Dataset:
    """Load the dataset from a JSON file and return it as a dict of Game objects."""

    if verbose:
        log_step(1, 4, f'Loading dataset from {datapath}...')
        
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
        log_step(1, 4, f'Loaded dataset with {len(dataset)} games', done=True)
    
    return dataset