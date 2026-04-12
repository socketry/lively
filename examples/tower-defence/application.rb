#!/usr/bin/env lively
# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2025, by Samuel Williams.

require_relative "lib/data_nexus"

# The shared controller is passed to every GameView instance via Lively's
# state mechanism, so all connected players share the same game world.
Application = Lively::Application[
	DataNexus::GameView,
	controller: DataNexus::GameController.new,
]
