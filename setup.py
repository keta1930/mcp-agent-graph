from setuptools import setup, find_packages
import os

# 读取版本号
with open("__version__.py", "r") as f:
    exec(f.read())

# 读取README
with open("README.md", "r", encoding="utf-8") as f:
    long_description = f.read()

setup(
    name="mag",
    version=__version__,
    packages=find_packages(exclude=["*.venv", "*.venv.*", ".venv.*", ".venv"]),
    install_requires=requirements,
    author="Yan Yixin",
    author_email="yandeheng1@gmail.com",
    description="MCP Agent Graph - Python SDK for Agent Development Framework",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/keta1930/mcp-agent-graph",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.8",
    include_package_data=True,
)