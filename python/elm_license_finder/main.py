import os
import sys
import re
import json
import platform
try:
    from pathlib import Path
    from colorclass import Color
    from terminaltables import SingleTable
    import semver
except ImportError:
    print("ERROR:  Need to install required modules.")
    print("python3 -m pip install colorclass terminaltables semver")
    sys.exit(1)

VERSION_REGEX = re.compile(r'^(\d+)\.(\d+)\.(\d+)$')
VERSION_REGEX_NOCAP = r'\d+\.\d+\.\d+'
COMPARATOR_REGEX = r'(?:<|>)=?'
RANGE = f'({VERSION_REGEX_NOCAP})\\s+' + \
        f'({COMPARATOR_REGEX})\\s+' + \
        'v\\s+' + \
        f'({COMPARATOR_REGEX})\\s+' + \
        f'({VERSION_REGEX_NOCAP})'
VRANGE_REGEX = re.compile(RANGE)
CMP = {
    "<": [-1],
    "<=": [-1, 0],
    ">": [1],
    ">=": [0, 1]
}
# will handle all dependencies
PROJECT_DEPS = {}


def get_versions_from_home(elm_home):
    dirs = filter(
        lambda d: os.path.isdir(os.path.join(elm_home, d)),
        [dir for dir in os.listdir(elm_home)]
    )
    return [v for v in dirs if re.match(VERSION_REGEX_NOCAP, v)]


def version_in_range(low, low_op, version, high_op, high):
    compare_low = semver.compare(low, version) in CMP[low_op]
    compare_high = semver.compare(version, high) in CMP[high_op]
    return compare_low and compare_high


def get_highest_version_from_dir(dir, cmp_version):
    low, low_op, high_op, high = VRANGE_REGEX.findall(cmp_version)[0]
    all_versions = [v for v in get_versions_from_home(dir)]
    return max(list(filter(
        lambda v: version_in_range(low, low_op, v, high_op, high),
        all_versions
    )))


def add_dep_to_dict(pkg_home, who, what, pkg, version, type):
    with open(
        os.path.join(pkg_home, who, what, version, "elm.json"), "r"
    ) as dep_file:
        license = json.load(dep_file)["license"]
    PROJECT_DEPS[pkg] = {
        "version": version,
        "license": license,
        "type": type
    }


def get_project_dependencies(json_directory):
    json_path = os.path.join(
        json_directory if json_directory else os.getcwd(),
        "elm.json"
    )

    if platform.system() == "Windows":
        ELM_HOME = os.path.join(str(Path.home()), "AppData", "Roaming", "elm")
    else:
        ELM_HOME = os.path.join(str(Path.home()), ".elm")

    ELM_HOME = os.getenv("ELM_HOME", ELM_HOME)
    with open(json_path, "r") as elm_file:
        json_data = json.load(elm_file)

    dependencies = json_data["dependencies"]
    type = json_data["type"]
    elm_version = json_data["elm-version"]
    if type == "package":
        elm_version = get_highest_version_from_dir(ELM_HOME, elm_version)
    package_home = os.path.join(ELM_HOME, elm_version, "packages")
    if not os.path.exists(package_home):
        print(f"I'm unable to find your package home: {package_home}")
        raise
    if type == "application":
        for type in ["direct", "indirect"]:
            deps = dependencies[type]
            for pkg, ver in deps.items():
                who, what = pkg.split("/")
                add_dep_to_dict(package_home, who, what, pkg, ver)
    elif type == "package":
        for pkg, ver in dependencies.items():
            who, what = pkg.split("/")
            high_ver = get_highest_version_from_dir(
                os.path.join(package_home, who, what),
                ver
            )
            add_dep_to_dict(package_home, who, what, pkg, high_ver, "direct")
    else:
        print(f"""Unknown Elm project type of {type}.
        Expected your elm.json to have either:
            \"type\": \"application\"
                or
            \"type\": \"package\"
        """)
        raise
    return PROJECT_DEPS


def output_tables(deps):
    # Build Table Headers
    lsc_count_data = [
        [Color("{red}License{/red}"), Color("{red}Count{/red}")]
    ]
    large_table_data = [
        [
            Color("{red}Package{/red}"),
            Color("{red}Version{/red}"),
            Color("{red}License{/red}"),
            Color("{red}Type{/red}")
        ]
    ]
    # Build table bodies
    packages = list(deps.keys())
    lsc_count_data = {"total": 0, "direct": 0, "indirect": 0}
    for pkg in packages:
        pkg_data = deps[pkg]
        license = pkg_data["license"]
        if license not in lsc_count_data.keys():
            lsc_count_data[license] = 0
        lsc_count_data[license] += 1
        lsc_count_data["total"] += 1
        lsc_count_data[pkg_data["type"]] += 1
        large_table_data.append(
            [pkg, pkg_data["version"], license, pkg_data["type"]]
        )
    for l, c in lsc_count_data.items():
        if l not in ["total", "direct", "indirect"]:
            lsc_count_data.append([l, str(c)])

    # Format Tables
    lsc_table = SingleTable(lsc_count_data)
    lsc_table.inner_row_border = True
    lsc_table.justify_columns = {0: 'center', 1: 'center'}
    print("Dependencies:")
    print(f"Total: {lsc_count_data['total']}")
    print(f"Direct: {lsc_count_data['direct']}")
    print(f"Indirect: {lsc_count_data['indirect']}")
    print(lsc_table.table)
    large_table = SingleTable(large_table_data)
    large_table.inner_row_border = True
    large_table.justify_columns = {
        0: 'center',
        1: 'center',
        2: 'center',
        3: 'center'
    }
    print(large_table.table)
