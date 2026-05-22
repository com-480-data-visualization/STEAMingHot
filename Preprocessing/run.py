from load import *
from filter import *
from reformat import *
from convert import *
from common import *

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FOLDER = os.path.join(PROJECT_ROOT, 'data')
ORIGINAL_DATASET_PATH = os.path.join(DATA_FOLDER, 'games.json')
OUTPUT_DATASET_PATH = os.path.join(PROJECT_ROOT, 'steaminghot/public/data/games.msgpack')

@dataclass
class Config:
    original_dataset_path: str
    output_dataset_path: str
    fields_to_drop: list[str]
    game_validation_predicates: list[Callable[[Game], bool]]
    verbose: bool = True


def main(config: Config) -> None:
    dataset: Dataset = load_dataset(config.original_dataset_path, config.verbose)
    dataset: Dataset = filter_dataset(dataset, config.game_validation_predicates, config.verbose)
    output_dataset: RawDataset = reformat_dataset(dataset, config.fields_to_drop, config.verbose)
    export_to_msgpack(output_dataset, config.output_dataset_path, config.verbose)


if __name__ == "__main__":
    ################################################################################
    # NOTE TO MY TEAMMATES: THIS IS THE ONLY PLACE YOU SHOULD EDIT IN THIS PIPELINE.
    ################################################################################
    config = Config(
        original_dataset_path=ORIGINAL_DATASET_PATH,
        output_dataset_path=OUTPUT_DATASET_PATH,
        fields_to_drop=[
            'detailed_description', # we mostly care about the short description
            'about_the_game', # often the same as detailed_description, which we drop
            'website',
            'support_url',
            'support_email',
            'reviews', # too inconsistent and takes 6 mb on full dataset
            'score_rank', # only 40 games have it
            'user_score', # only 40 games have it
            'screenshots', # take an extreme amount of space, header image is enough
            'packages', #todo: discuss that one (13mb on full dataset)
            # 'metacritic_url', # could be actually useful, only takes 2.5mb on full dataset
        ],
        game_validation_predicates=[
            # lambda game: (game.positive + game.negative) >= 50,
        ],
    )
    main(config)