#!/usr/bin/env lively
# frozen_string_literal: true

require_relative "cs16_multiplayer_view"

# Simple test application for CS16 multiplayer
# Run with: bundle exec lively multiplayer_test.rb
# Then open multiple browser windows to test multiplayer functionality

Application = Lively::Application[CS16MultiplayerView]