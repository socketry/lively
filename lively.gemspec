
require_relative "lib/lively/version"

Gem::Specification.new do |spec|
	spec.name = "lively"
	spec.version = Lively::VERSION
	
	spec.summary = "A simple client-server SPA framework."
	spec.authors = ["Samuel Williams"]
	spec.license = "MIT"
	
	spec.homepage = "https://github.com/socketry/lively"
	
	spec.files = Dir.glob('{lib,public}/**/*', File::FNM_DOTMATCH, base: __dir__)
	
	spec.required_ruby_version = ">= 2.5.0"
	
	spec.add_dependency "async-io"
	spec.add_dependency "falcon"
	spec.add_dependency "live", "~> 0.5.0"
	
	spec.add_development_dependency "async-rspec", "~> 1.1"
	spec.add_development_dependency "bundler"
	spec.add_development_dependency "covered", "~> 0.10"
	spec.add_development_dependency "rspec", "~> 3.6"
end
