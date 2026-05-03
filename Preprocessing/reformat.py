from common import *
from dataclasses import asdict


def reformat_dataset(source_dataset: Dataset, fields_to_drop: list[str], verbose=True) -> RawDataset:
    """Reformat the dataset by dropping unwanted fields and converting it into a more compact format."""
    #todo: doc
    games_data: list[dict] = [drop_fields(game, fields_to_drop) for game in source_dataset.values()]
    fields_schema: list[str] = list(games_data[0].keys()) # all games have the same fields
    rows = [list(gd.values()) for gd in games_data]

    output_data: RawDataset = {
        'schema': fields_schema,
        'games': rows
    }
    if verbose:
        print(f'Reformatted dataset. Original number of fields per game: {len(output_data["schema"]) + len(fields_to_drop)}, new number of fields: {len(output_data["schema"])}.')

    return output_data

def drop_fields(game: Game, fields_to_drop: list[str]) -> dict:
    game_dict = asdict(game)
    for field in fields_to_drop:
        game_dict.pop(field) 
    return game_dict
    
