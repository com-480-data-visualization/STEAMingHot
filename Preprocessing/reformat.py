from common import *
from dataclasses import asdict

def reformat_dataset(source_dataset: Dataset) -> RawDataset:
    """Return a new RawDataset with some fields reformatted for memory efficiency"""
    dataset_out: RawDataset = {}
    for id, game in source_dataset.items():
        dataset_out[id] = asdict(game)
    return dataset_out
        