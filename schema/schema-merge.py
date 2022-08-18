#!/usr/bin/env python3
"""
Compiles all the schema files into a single file
"""

import json
import pathlib

schema = "https://json-schema.org/draft/2020-12/schema"
id = "https://lottie-animation-community.github.io/tests/schema/docs/json/lottie.schema.json"
json_data = {
    "$schema": schema,
    "$id": id,
    "type": "object",
    "allOf": [{
        "$ref": "#/$defs/animation/animation"
    }]
}

root = pathlib.Path(__file__).parent / "docs" / "json"

defs = {}
for subdir in sorted(root.iterdir()):
    dir_schema = {}
    if subdir.is_dir():
        for file_item in subdir.iterdir():
            if file_item.is_file() and file_item.suffix == ".json":
                with open(file_item, "r") as file:
                    try:
                        file_schema = json.load(file)
                    except Exception:
                        print(file_item)
                        raise
                file_schema.pop("$schema", None)
                dir_schema[file_item.stem] = file_schema
        defs[subdir.name] = dir_schema

json_data["$defs"] = defs

with open(root / "lottie.schema.json", "w") as file:
    json.dump(json_data, file, indent=4)
