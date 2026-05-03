from common import *

def filter_dataset(
    source_dataset: Dataset,
    predicates: list[Callable[[Game], bool]],
    verbose: bool = True
) -> Dataset:
    """Return a new dataset containing only games that satisfy every predicate."""

    if verbose:
        log_step(2, 4, f'Filtering dataset with {len(predicates)} predicates...')

    new_ds: Dataset = {
        game_id: game
        for game_id, game in source_dataset.items()
        if all(predicate(game) for predicate in predicates)
    }
    
    if verbose:
        log_step(2, 4, f'Filtered dataset from {len(source_dataset)} to {len(new_ds)} games.', done=True)
    return new_ds