.PHONY: help setup dev install build build-all build-showcase test test-watch publish publish-dry

help: ## Show this help
	@echo ""
	@echo "  svelte-treeview-canvas"
	@echo "  ====================="
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

setup: install ## Alias for install

install: ## Install npm dependencies
	npm install

dev: ## Start dev server (port 17778)
	npm run dev

build: ## Build library only (svelte-package)
	npm run prepack

build-all: ## Build everything (showcase + library)
	npm run build

build-showcase: ## Build showcase site only
	npm run build:showcase

test: ## Run tests once
	npm run test:run

test-watch: ## Run tests in watch mode
	npm run test

publish: ## Publish to npm (TAG=rc for pre-release)
	npm publish $(if $(TAG),--tag $(TAG))

publish-dry: ## Dry-run publish (TAG=rc for pre-release)
	npm publish --dry-run $(if $(TAG),--tag $(TAG))
