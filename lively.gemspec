# frozen_string_literal: true

require_relative "lib/lively/version"

Gem::Specification.new do |spec|
	spec.name = "lively"
	spec.version = Lively::VERSION
	
	spec.summary = "A simple client-server SPA framework."
	spec.authors = ["Samuel Williams"]
	spec.license = "MIT"
	
	spec.cert_chain  = ["release.cert"]
	spec.signing_key = File.expand_path("~/.gem/release.pem")
	
	spec.homepage = "https://github.com/socketry/lively"
	
	spec.metadata = {
		"documentation_uri" => "https://socketry.github.io/lively/",
		"source_code_uri" => "https://github.com/socketry/lively.git",
	}
	
	spec.files = Dir.glob(["{bin,context,lib,public}/**/*", "*.md"], File::FNM_DOTMATCH, base: __dir__)
	
	spec.executables = ["lively"]
	
	spec.required_ruby_version = ">= 3.2"
	
	spec.add_dependency "agent-context"
	spec.add_dependency "falcon", "~> 0.47"
	spec.add_dependency "io-watch"
	spec.add_dependency "live", "~> 0.18"
	spec.add_dependency "xrb"
end
