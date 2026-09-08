# Client JavaScript Packages

This guide explains how to organize, test, and deploy client-side JavaScript packages in a Lively application.

## Package Boundaries

Small application entry points can live directly in `public/`. As client behavior grows, keeping reusable modules, their dependencies, and their tests in a workspace package gives that code an explicit boundary independent of the Ruby application.

Lively uses `bake-node` to maintain three distinct layers:

~~~ text
components/                 # Authored JavaScript packages and their tests.
node_modules/               # Package-manager installation.
public/_components/         # Generated browser-facing projection.
public/application.js       # Application entry point.
~~~

Only files in `components/` and `public/application.js` are authored directly. Treat `node_modules/` and `public/_components/` as generated output.

## Create a Package

For example, an application can place its presentation behavior in an internal package:

~~~ text
components/
  presentation/
    package.json
    Presentation.js
    test/
      Presentation.js
~~~

Define the package entry point and test command in `components/presentation/package.json`:

~~~ json
{
  "name": "@example/presentation",
  "private": true,
  "type": "module",
  "exports": "./Presentation.js",
  "scripts": {
    "test": "node --test test/*.js"
  }
}
~~~

The package can use any browser-ready JavaScript modules. `bake-node` projects those modules for static delivery; it does not require a bundling or transpilation step.

## Configure the Workspace

Register internal packages as workspaces in the application's root `package.json`, then select the files and browser import names that should be deployed:

~~~ json
{
  "private": true,
  "workspaces": [
    "components/*"
  ],
  "scripts": {
    "test": "npm test --workspaces --if-present"
  },
  "bake-node": {
    "packages": {
      "@example/presentation": {
        "include": [
          "Presentation.js"
        ],
        "imports": {
          "@example/presentation": "Presentation.js"
        }
      }
    }
  }
}
~~~

Install dependencies and generate the browser-facing projection:

~~~ bash
$ bundle exec bake node:install
$ bundle exec bake node:packages:static
~~~

The package is now available at `/_components/@example/presentation/Presentation.js`.

## Add the Package to a Page

Lively pages expose JavaScript packages through an import map. A custom page can extend the default imports and load an application entry point:

~~~ ruby
class ApplicationPage < Lively::Page
	IMPORTS = Lively::Pages::Index::IMPORTS.merge(
		"@example/presentation" => "/_components/@example/presentation/Presentation.js"
	).freeze
	
	def initialize(body:)
		super(
			title: "Presentation",
			body: body,
			imports: IMPORTS,
			modules: ["/application.js"]
		)
	end
end
~~~

The application entry point can then use the package by name:

~~~ javascript
import {Presentation} from '@example/presentation';

const presentation = new Presentation(document);
presentation.start();
~~~

Keep application startup and page-specific integration in `public/application.js`. Put reusable behavior in the package so it can be tested without starting the Ruby application.

## Test and Verify Packages

Run the workspace tests directly with the package manager:

~~~ bash
$ npm test
~~~

When generated packages are committed or deployed with the application, verify that they match the lock file and package configuration:

~~~ bash
$ bundle exec bake node:install frozen=true
$ bundle exec bake node:packages:check
~~~

The first command checks that dependency installation is reproducible. The second checks both the generated manifest and the contents of `public/_components`.

For details about package selection, import maps, and alternative package managers, see the [Bake Node documentation](https://socketry.github.io/bake-node/).
