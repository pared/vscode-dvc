#!/bin/bash

# cd to demo and setup venv if needed
source ./activate-demo-venv.sh

python3 -m pip install --upgrade pip
pip install -U -r ./requirements.txt
