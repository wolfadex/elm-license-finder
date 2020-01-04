import setuptools

with open("README.md", "r") as fh:
    long_description = fh.read()

setuptools.setup(
    name="elm_license_finder",
    version="1.0.1",
    author="Wolfgang Schuster",
    description="Collects license information for Elm project dependencies.",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/wolfadex/elm-license-finder",
    packages=setuptools.find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires='>=3.6',
)
