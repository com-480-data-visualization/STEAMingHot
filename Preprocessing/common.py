from dataclasses import dataclass, field
from typing import Any, Callable

MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
MONTH_TO_NUM = {month: i + 1 for i, month in enumerate(MONTHS)}
DATA_PATH = 'data/games.json'

type Dataset = dict[str, Game]
type RawDataset = dict[str, dict[str, Any]] 

def real_user_score(game: Game) -> float:
    """Calculate the real user score for a game, based on the number of positive and negative reviews."""
    total_reviews = game.positive + game.negative
    if total_reviews == 0:
        return 0.0
    return (game.positive / total_reviews) * 100.0

""" 'Nov 16, 2018' -> {day: 16, month: 11, year: 2018} """
def parse_release_date(date_str: str) -> dict[str, int]: 
    # Sperate the ","
    parts = date_str.split(',')
    if len(parts) != 2:
        raise ValueError(f'Invalid date format: {date_str}')
    # Parse the year
    year = int(parts[1].strip())
    # Parse the month and day
    month_day = parts[0].strip().split(' ')
    if len(month_day) != 2:
        raise ValueError(f'Invalid date format: {date_str}')
    month_str, day_str = month_day
    month = MONTH_TO_NUM.get(month_str)
    if month is None:
        raise ValueError(f'Invalid month: {month_str} in date: {date_str}')
    day = int(day_str)
    return {'day': day, 'month': month, 'year': year}

def human_readable_estimated_owners(estimated_owners_str: str) -> str:
    """ '2000-1000000' -> '2K-1M' """
    parts = estimated_owners_str.split('-')
    if len(parts) != 2:
        raise ValueError(f'Invalid estimated owners format: {estimated_owners_str}')
    min_owners, max_owners = parts
    min_owners = int(min_owners)
    max_owners = int(max_owners)
    def human_readable(num: int) -> str:
        if num >= 1_000_000:
            return f'{num // 1_000_000}M'
        elif num >= 1_000:
            return f'{num // 1_000}K'
        else:
            return str(num)
    return f'{human_readable(min_owners)}-{human_readable(max_owners)}' 


@dataclass
class Game:
    game_id: str
    name: str
    release_date: str
    required_age: int
    price: float
    dlc_count: int
    detailed_description: str
    about_the_game: str
    short_description: str
    reviews: str
    header_image: str
    website: str
    support_url: str
    support_email: str
    windows: bool
    mac: bool
    linux: bool
    metacritic_score: int
    metacritic_url: str
    achievements: int
    recommendations: int
    notes: str
    supported_languages: list
    full_audio_languages: list
    packages: list[dict]
    developers: list
    publishers: list
    categories: list
    genres: list
    screenshots: list
    movies: list
    user_score: int
    score_rank: str
    positive: int
    negative: int
    estimated_owners: str
    average_playtime_forever: int
    average_playtime_2weeks: int
    median_playtime_forever: int
    median_playtime_2weeks: int
    discount: int
    peak_ccu: int
    tags: list 