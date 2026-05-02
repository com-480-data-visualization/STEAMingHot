from load import *
from filter import *
from reformat import *
from convert import *
from common import *

# PROJECT_ROOT is the parent of this file
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FOLDER = os.path.join(PROJECT_ROOT, 'data')
ORIGINAL_DATASET_PATH = os.path.join(DATA_FOLDER, 'games.json')
OUTPUT_DATASET_PATH = os.path.join(DATA_FOLDER, 'games.msgpack')

def main():
    dataset: Dataset = load_dataset(ORIGINAL_DATASET_PATH)
    dataset: Dataset = filter_dataset(dataset, DEFAULT_PREDICATES)
    output_dataset: RawDataset = reformat_dataset(dataset)
    export_to_msgpack(output_dataset, OUTPUT_DATASET_PATH)

if __name__ == "__main__":
    main()