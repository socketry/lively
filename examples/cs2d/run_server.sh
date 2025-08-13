#!/bin/bash

# Run the async Redis lobby server

export RUBYLIB="/Users/jimmy/jimmy_side_projects/lively/lib:$RUBYLIB"
export PATH="/Users/jimmy/jimmy_side_projects/lively/bin:$PATH"

exec ruby -I/Users/jimmy/jimmy_side_projects/lively/lib \
     -I/Users/jimmy/jimmy_side_projects/lively/examples/cs2d \
     /Users/jimmy/jimmy_side_projects/lively/bin/lively \
     async_redis_lobby_i18n.rb