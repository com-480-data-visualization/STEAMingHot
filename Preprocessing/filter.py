from common import *

def filter_dataset(
    source_dataset: Dataset,
    predicates: list[Callable[[Game], bool]],
    verbose: bool = True
) -> Dataset:
    """Return a new dataset containing only games that satisfy every predicate."""
    new_ds: Dataset = {
        game_id: game
        for game_id, game in source_dataset.items()
        if all(predicate(game) for predicate in predicates)
    }
    if verbose:
        print(f'Filtered dataset from {len(source_dataset)} to {len(new_ds)} games.')
    return new_ds

# Here is an example of predicates list I tried
DEFAULT_PREDICATES = [
    lambda game: (game.positive + game.negative) >= 200, 
    # todo: add more predicates here
    ]