#!/bin/bash

# Run the application with proper paths
export RUBYLIB="/Users/jimmy/jimmy_side_projects/lively/lib:$RUBYLIB"

exec ruby -I/Users/jimmy/jimmy_side_projects/lively/lib \
     -I/Users/jimmy/jimmy_side_projects/lively/examples/cs2d \
     /Users/jimmy/jimmy_side_projects/lively/bin/lively \
     application.rb