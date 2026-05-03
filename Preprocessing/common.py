from dataclasses import dataclass, field
from typing import Any, Callable

MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
MONTH_TO_NUM = {month: i + 1 for i, month in enumerate(MONTHS)}
GREEN = '\033[32m'
BLUE = '\033[34m'
RESET = '\033[0m'

# Type aliases for better input/output clarity in main pipeline functions
type Dataset = dict[str, Game]
type RawDataset = dict[str, Any]

def log_step(at:int, total:int, text: str, done=False) -> None:
    """Format a log message for a pipeline step."""
    prefix = f'Step {at}/{total}:'
    if done:
        print(f'{GREEN}✓ {prefix}{RESET} {text}')
    else:
        print(f'{BLUE}→ {prefix}{RESET} {text}')

def real_user_score(game: Game) -> float:
    """Calculate the real user score for a game, based on the number of positive and negative reviews."""
    total_reviews = game.positive + game.negative
    if total_reviews == 0:
        return 0.0
    return (game.positive / total_reviews) * 100.0

def parse_release_date(date_str: str) -> dict[str, int]: 
    """ 'Nov 16, 2018' -> {day: 16, month: 11, year: 2018} """
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
    game_id: str                    # Unique identifier for the application.
    name: str                       # Title of the game.
    release_date: str               # Official release date.
    required_age: int               # Minimum age requirement (0 if none).
    price: float                    # Cost in USD (0.0 if free).
    dlc_count: int                  # Total number of downloadable content items.
    detailed_description: str       # Full description.
    about_the_game: str             # Similar to full description.
    short_description: str          # Brief plain-text description.
    reviews: str                    # Review data (field accessed but not unpacked in script).
    header_image: str               # URL to the store header image.
    website: str                    # Official game website URL.
    support_url: str                # Support website URL.
    support_email: str              # Contact email for support.
    windows: bool                   # Windows OS compatibility.
    mac: bool                       # macOS compatibility.
    linux: bool                     # Linux compatibility.
    metacritic_score: int           # Score from Metacritic (0 if none).
    metacritic_url: str             # URL to Metacritic review page.
    achievements: int               # Total number of achievements.
    recommendations: int            # Total user recommendations.
    notes: str                      # Extra content information/warnings.
    supported_languages: list       # Comma-separated list of languages.
    full_audio_languages: list      # Comma-separated list of languages with audio.
    packages: list[dict]            # list of objects: title (string), description (string), subs (list of objects with text, description, price).
    developers: list                # list of strings: Names of development entities.
    publishers: list                # list of strings: Names of publishing entities.
    categories: list                # list of strings: Feature categories (e.g., "Multi-player").
    genres: list                    # list of strings: Game genres (e.g., "Action").
    screenshots: list               # list of strings: URLs to game screenshots (Note: script uses spelling "scrennshots" in some places).
    movies: list                    # list of strings: URLs to game trailers/videos.
    user_score: int                 # Internal user score (0 if none).
    score_rank: str                 # Rank based on user reviews.
    positive: int                   # Count of positive votes.
    negative: int                   # Count of negative votes.
    estimated_owners: str           # Range of owners (e.g., "0 - 20000").
    average_playtime_forever: int   # Average playtime in minutes (since 2009).
    average_playtime_2weeks: int    # Average playtime in minutes (last 14 days).
    median_playtime_forever: int    # Median playtime in minutes (since 2009).
    median_playtime_2weeks: int     # Median playtime in minutes (last 14 days).
    discount: int                   # Discount percentage.
    peak_ccu: int                   # Yesterday's peak concurrent users.
    tags: list                      # list/dict: User-defined tags (keys represent tag names). 