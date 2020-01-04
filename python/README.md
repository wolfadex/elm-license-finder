# Elm License Finder
**Python Edition**

## Using Python CLI Script

**Requires Python 3**

Run `python3 -m pip install colorclass terminaltables semver`

If you are running the python script from inside your `elm.json` directory:
`python3 find_licenses.py`

If you are running the python script from a different directory:
`python3 find_licenses.py relative/path/to/elm/project`

## Using Python Package

**Requires Python 3**

Install the package with `python3 -m pip install elm_license_finder`

Import the two needed functions and use them:

```
import os
from elm_license_finder import get_project_dependencies, output_tables

dir = os.path.join("path", "to", "elm", "project")

# Parses elm.json and builds dependency and license data
deps = get_project_dependencies(dir)
# Outputs pretty tables with the information
output_tables(deps)
```
