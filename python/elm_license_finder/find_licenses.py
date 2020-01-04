import sys
from elm_license_finder import get_project_dependencies, output_tables

if __name__ == "__main__":
    dir = sys.argv[1] if len(sys.argv) > 1 else None
    deps = get_project_dependencies(dir)
    output_tables(deps)
