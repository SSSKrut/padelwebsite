import csv
import json
import sys
from pathlib import Path


def load_achievements_map() -> dict[str, list[str]]:
    achievements_path = Path("data/players_achievements.json")
    if not achievements_path.exists():
        return {}
    with achievements_path.open(encoding="utf-8") as json_file:
        data = json.load(json_file)
    return {str(key).strip(): value for key, value in data.items()}


def parse_achievements(value: str) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(";") if item.strip()]


def normalize_header(value: str) -> str:
    return value.strip().lower().replace(" ", "_")


def build_header_map(fieldnames: list[str]) -> dict[str, str]:
    return {normalize_header(name): name for name in fieldnames}


def first_value(row: dict[str, str], header_map: dict[str, str], aliases: list[str]) -> str | None:
    for alias in aliases:
        normalized = normalize_header(alias)
        if normalized in header_map:
            return row.get(header_map[normalized], "").strip()
    return None


def convert(csv_path: Path, json_path: Path) -> None:
    with csv_path.open(newline="", encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file)
        fieldnames = reader.fieldnames or []
        header_map = build_header_map(fieldnames)
        achievements_map = load_achievements_map()

        required_aliases = {
            "name": ["name"],
            "rating_points": ["ratingpoints", "rating_points", "total_points", "total_number_of_points", "total"],
            "rating_delta": ["ratingdelta", "rating_delta", "delta", "change", "latest_change", "weekly_change"],
        }

        missing_required = []
        for key, aliases in required_aliases.items():
            if not any(normalize_header(alias) in header_map for alias in aliases):
                missing_required.append(key)
        if missing_required:
            missing_list = ", ".join(missing_required)
            raise ValueError(f"Missing required columns: {missing_list}")

        players = []
        for row in reader:
            if not any(row.values()):
                continue
            name = first_value(row, header_map, required_aliases["name"])
            rating_points = first_value(row, header_map, required_aliases["rating_points"])
            rating_delta = first_value(row, header_map, required_aliases["rating_delta"])
            if not name or rating_points is None or rating_delta is None:
                continue

            player_id = first_value(row, header_map, ["id", "player_id"])
            rank_value = first_value(row, header_map, ["rank", "place", "position"])
            achievements_value = first_value(row, header_map, ["achievements"])
            achievements = parse_achievements(achievements_value or "")
            if player_id and str(player_id) in achievements_map:
                achievements.extend(achievements_map[str(player_id)])
            elif name in achievements_map:
                achievements.extend(achievements_map[name])
            achievements = list(dict.fromkeys(achievements))

            players.append(
                {
                    "rank": int(rank_value) if rank_value else None,
                    "name": name,
                    "achievements": achievements,
                    "ratingPoints": int(float(rating_points)),
                    "ratingDelta": int(float(rating_delta)),
                }
            )

    if any(player["rank"] is None for player in players):
        sorted_players = sorted(players, key=lambda item: (-item["ratingPoints"], item["name"]))
        for index, player in enumerate(sorted_players, start=1):
            player["rank"] = index
        players = sorted_players

    json_path.write_text(json.dumps(players, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    if len(sys.argv) != 3:
        print("Usage: python scripts/players_from_csv.py <input.csv> <output.json>")
        raise SystemExit(1)

    csv_path = Path(sys.argv[1])
    json_path = Path(sys.argv[2])
    convert(csv_path, json_path)


if __name__ == "__main__":
    main()
