# Change & release log

Releases in reverse chronological order.

Please check
[GitHub](https://github.com/xpack/xpm-liquid-ts/issues)
and close existing issues and pull requests.

## 2026-02-21

* v5.0.0 published on npmjs.com
* v5.0.0 prepared
* d2c2480 website update copyright 2026

## 2026-02-20

* d9ec695 tsdoc updates
* 138d272 fix tsdoc
* 60f9436 #15: add policies to InitTemplateBase
* 5b5afab #14: add a new policy topPropertiesXpmInitTemplate
* 7ca0150 #13: use common substitution variables for templates
* 460d487 #12: make most InitTemplateBase members and methods public
* d08bdc7 #11: add asserts to InitTemplateBase file functions
* 0c6c823 #10: use LiquidEngine in templates
* 70619b2 #9: pass options to LiquidEngine constructor

## 2026-02-19

* 270b015 move some tsconfig to config
* 98fdcf2 move eslint configurations to config
* a990e6e move prettier configurations to config

## 2026-02-17

* f1024c5 README update
* 5404785 website: blog post release 4.0.0 published
* c5a6124 4.0.0
* e8404f7 CHANGELOG: publish npm v4.0.0
* 2f47ffe CHANGELOG update

## 2026-02-17

## 2026-02-17

* f1024c5 README update
* 5404785 website: blog post release 4.0.0 published
* c5a6124 4.0.0
* e8404f7 CHANGELOG: publish npm v4.0.0
* 2f47ffe CHANGELOG update
* 484c061 website update
* 7e968d9 dist & website update
* a7aba72 shorten members names
* f44313e dist & website updates
* da68f12 rename actions & build configurations names
* 67592f0 dist & website update
* 147518c more readonly members
* 96a6120 tsdoc update
* 3ad016e dist & website re-generate
* 3045eb6 package.json update scripts
* 8815199 launch.json update
* 7e4b381 dist & website update
* 58cd921 README update
* 5e20089 tsdoc update
* 099bea8 update README & CODE-REVIEW
* d4bfb59 errors.ts update tsdoc
* 2f13eec add tests/CODE-REVIEW.md
* 0545e95 tests: remove more useless t.end() from async tests
* f4aa85f tests: add initialisation.ts

## 2026-02-16

* 145cb66 tests: split large files
* b677af0 test remove useless t.end() from async tests
* 44f225a tests update descriptions
* b2362fa tests: use t.reject and t.throws
* 3fc8ee1 tests use t.reject
* 1b06fa8 tests is_something.ts use array
* 69ee0ef tests use t.reject
* d96403c tests combinations-generator.ts update constant
* 1231def reclassify errors
* 91471b2 functions: make limits parameters
* bde3753 combinations-generatr.ts cosmetics
* 1133ea4 combinations-generator.ts update, with test

## 2026-02-13

* 4f2dfd8 combinations-generator.ts improvements & protected prefix
* 28e583f perform-substitutions.ts: add MAX_SUBSTITUTION_OUTPUT_SIZE
* b625728 simplify template expander
* fdae6cd add platformDetector
* db45573 data-model.ts: use LiquidEngine
* cbbdb19 perform-substitutions.ts: MAX_SUBSTITUTION_ITERATIONS
* 01904d2 create a shared TemplateExpander class
* c697ad3 hasLiquidSyntax, used but not in drops
* ccc4803 implement generator pattern for memory efficiency
* 35715bc single regex for both patterns
* 2620b47 assert must be initialised

## 2026-02-12

* 4439e93 build-configuration.ts cosmetics
* 4220750 chmod-recursively.ts: throws ConfigurationError
* 5e4ef0e cosmetise /* c8 ignore ... */
* fc2b8fb add edge case documentation for safety nets
* 5f556f0 platform-agnostic tests
* 419d14c build-configurations.ts: extract long methods
* ec52cc3 Improve error message consistency
* 40443cd chmod-recursive.ts: add MAX_RECURSION_DEPTH
* 15f94bb init-template-base.ts: collect all errors
* 0ecb130 tests: use common log
* 937cac2 add matrix-expander.ts
* 056938e tests/package.ts /tmp
* 1f575b4 tests/init-template-base.ts cosmetics
* ee177ed perform-substitutions.ts: MAX_ITERATIONS
* 650debc package.ts: constructor assert
* 0de2e2e init-template-base.ts: MAX_RETRIES
* 2c301b0 init-template-base.ts: render() assert
* a984ca3 build-configuration.ts: getJsonName() throws
* d403021 actions.ts: get optimisation
* 3474640 tests: log level silent
* 59f1bc4 tests cosmetics async & subtests

## 2026-02-11

* 5bc23d2 dist & website update
* 2d00c51 copilot-instructions update
* 1a076ef add missing tsdoc
* 22ddb5b package.json update description
* 7c4a934 build-configurtion.ts: document _processInherits()
* d31b34c package*.json remove del dependency
* b7b323a website/package*.json update
* 1b3f3b6 package*.json update
* 0ffdf16 dist & website update
* 18dee9f define separate types for constructor parameters
* 2f103ff tsdoc updates
* 7b3317b remove xpm & json namespaces
* 5ae5f2c rename Error classes

## 2026-02-08

* 1332aa8 use the json namespace
* 2c96339 use the xpm namespace

## 2026-02-07

* 89f67ef Revert "test-ci.yml: COLUMNS: 120"
* c8a8086 test-ci.yml: COLUMNS: 120
* 4cd563e update dist
* eff71b5 package.json: enable coverage to test-ci
* 4d07428 test/tap/init-template-base.ts test askForMoreValues
* d1e31e5 init-template-base.ts: group private

## 2026-02-05

* a2c569e dist & website update
* 31b06ea copilot-instructions.md update
* bd6ba29 remove /* eslint max-len: ...
* 1256585 tests: enable typecheck
* 82ce65b tests: add coverage-map
* 34f4e49 remove tests/package.json
* 7bb2c3a tests/tap t.test()
* d1ce5a5 .taprc typecheck commented out
* 98d4f96 tsconfig-common.json add TODO node22
* 74d2235 package.json update test scripts
* eaef09d package*.json remove make-dir & cp-file
* 296092b launch.json update test one
* 9f4eeb7 tests/tap/init-template-base.ts test copyFile|copyFolder
* 05df8f5 tests/tap/build-configurations.ts add type conversion
* 6b919db init-template-base.ts: update copyFile|copyFolder
* 30750bc types/json.ts add JsonBuildConfigurationTemplateMatrix
* 9da1e11 types/xpm.ts: add cwd to config
* bee6065 rename tests without numbers
* 853d9f9 dist & website update
* 6315202 launch.json update
* 54f0350 package.json update scripts
* ee7dd01 tests/tap/640-init-template-base.ts
* fded6f7 package.json: fix compile-watch
* 9bda80b .taprc # jobs 1
* 2b71bcc init-template-base.ts: private & _validatePropertiesDefinitions
* 48d9edc catch (error)
* 1ebcadd xpm-init-template.ts: add XpmInitTemplateType & Items
* b066c6a is-something.ts: fix isString() return type
* 6d0b7c7 build-configurations.ts: inherits explicit strings

## 2026-02-03

* 3b62f73 more consistent process.platform
* 8595c68 tests cleanups
* 1b0ea9e tests add errors
* 1b539a2 build-configurations.ts: split initialise()
* 8da659c cosmetics more separators
* c14bb15 move createSubstituted* as a method
* a96e65a utils.ts cosmetics
* 584fbaf renumber tests utils
* 782109b add combination-generator.ts
* f5713f5 tests renumber
* 9e72227 tests add build-configuration
* af7b925 tests/actions update messages
* 8c21537 build-configurations.ts: silence c8
* 60c0d9b build-configurations.ts: throw in _getBuildFolderRelativePath
* 84fb0dc build-configurations.ts: fix skip empty inherits

## 2026-02-02

* a4727cb actions.ts: upate duplicate messages
* d3a0a7a build-configurations.ts: get throws
* ea002db build-configurations.ts: check duplicates

## 2026-02-01

* 7134a6f utils.ts: fix c8 comment
* 62ae1c7 actions tested with 100% coverage
* c98d360 actions.ts: add more exceptions
* 2ab9b26 add c8 explanations
* 80ab542 remove @throws `AssertionError`
* 24f4165 add messages to assert()
* 18411c8 tests: integrate all subtitutions
* f4f856f copilot-instructions.md update

## 2026-01-30

* 61eb1c0 test: rework throws
* c351f48 actions.ts cosmetics
* c79bf4e actions & build-configuration getters
* 2c5f134 actions.ts cosmetics
* 54c9c48 actions.ts XpmAction initialise() with conditional substitutions
* e0f1a67 actions.ts XpmAction does not assert for jsonAction
* 11abb3b actions.ts get() throws if not found
* 8777358 package.ts cosmetics

## 2026-01-29

* 581704a tests re-work with folders & coverage
* 40e3bd4 silence coverage warnings
* f1b4b2a package.json cosmetics
* 4413130 policies.ts cosmetics
* c019981 perform-substitutions.ts: pass engine.options to Context
* 9169efb perform-substitutions.ts: rework properties & matrix drops
* 47a2ca6 liquid-engine.ts: accept keys on arrays

## 2026-01-28

* d4133d3 website tsdoc formatting

## 2026-01-27

* 7efd064 getPlatformKey more generic
* c61f87f tsdoc initialise()
* c553dd9 perform-subtitutions.ts cleanups
* 6437276 chmod-recursively.ts: add log.trace symlink
* 07dbb2b rename chmodRecursively

## 2026-01-26

* 00a533c pacakge.json add topCondig
* e6b2597 dist & website update
* dcf85ff src update tsdoc
* 2f92b48 website: remove unused _test-results.mdx
* 49383fc dist & website update
* 40efea4 website update
* f557695 actions.ts comments cosmetics
* ad63ce0 build-configurations.ts: rename isHidden, _substitutionsVariables

## 2026-01-25

* f40976b website update commons
* e89c336 website: API Reference
* 0c15985 dist & website update
* 29a3f81 src & tests: rename data-model, actions, build-configurations
* b53dc66 rename copilot-instructions.md
* 13056ac tsdoc cosmetics
* 67063c0 website: add index pages
* cc382ae dist & website update
* 5702d07 src: use html lists
* 9517446 website/package-lock.json update
* 5eac1d1 custom.css: reduce table rows padding
* 2a4b4e9 sidebar-category-tsdoc.json: add links

## 2026-01-24

* 74f1de3 api-extractor.json: silence ae-missing-release-tag
* 061d0b6 update dist & website without @public
* a3e602a src: remove @public
* e24c339 website use emitDeclarationOnly

## 2026-01-23

* 8a0f955 add website badge
* b3d68e2 website (work in progress)
* 937d81d Merge commit '70b7fa1a22e23dc9b55c8ef817ce0955e7e1caf2' into website
* 70b7fa1 Merge commit '3afbcbb27b1f3f0a73b1ee9fafe8efa55002bfde' into development
* 3afbcbb add dist to git
* a3f7406 .github update
* ba73b28 publish-github-pages update
* 29c83a5 website update after less .gitignore
* 0695e66 publish-github-pages update
* 6db7525 publish-github-pages update
* 6a6cb6c README update
* 454bb2c initial website
* 555fd47 package*.json update
* 43e4371 settings.json update
* e4f4f58 tsconfig*.json update
* 1fd5c75 tests/tap update for new api
* 45b4efe add .copilot-instructions.md
* af7165c add TSDoc comments

## 2026-01-19

* 385f43b policies.ts update
* d6289fe more fodler reorganise & cosmetics
* 83eb96b reorganise folders
* af70139 move downloader back to xpm
* 9fded39 eslint.config.js cleanup

## 2026-01-18

* 8aad321 separate downloader.ts
* 6876848 actions & buildConfigurations error processing
* 843f028 add liquid drop for matrix
* c1fa57f utils.ts: ad getErrorMessage()
* 8fe3cd5 liquid-build-configuration.ts: check circular inheritance

## 2026-01-17

* c5f46cf update tests without await
* b78b5bd liquid-build-configurtions.ts re-work substitutions logic
* cf73ab4 liquid-actions.ts throw XpmError
* 794456f perform-substitutions.ts throw XpmErrot
* f06ee21 liquid-drop.ts trace cosmetics
* 9139549 liquid-engine.ts accept split_lines on arrays
* 3efc46b liquid-build-configuration fix dependencies

## 2026-01-16

* fbcd561 liquid-build-configuration.ts cosmetics
* 8998052 liquid-actions.ts add reference to buildConfiguration
* 006395c liquid-actions.js: detect duplicates

## 2026-01-15

* 11698ce liquid-build-configuration: public jsonBuildConfiguration

## 2026-01-14

* 6741930 test update for windows
* ecc21d1 test-ci.yml update
* 399d566 CHANGELOG update

## 2026-01-14

* 54c8fe6 prepare 4.0.0-pre
* ea13d60 RAEDME updates, without liquid details
* 3a6c594 get buildFolderRelativePath()
* f7bd147 cosmetics
* 36c6141 pacakge.json cosmetics
* 2afc92d rename folder to core
* 4b011da launch all tests
* 2c12eba move initialise out of get()
* 46d673c catch strings
* 63a021b tests cosmetics
* 40f6b0f tests update with await get()
* f71a78b liquid-build-configurations.ts move initialise to get
* e7c608b liquid-actions.ts async get with initialise
* 5835d3d package.json test-one-0[1-6]0
* 58bb8b2 test templates
* 997ef5a launch.json skip **/async-hook-domain/**
* 945eb23 .taprc reporter terse
* 8d8a388 liquid-build-configurations.ts implement templates
* ce743b8 types.ts add JsonDependenciesContent
* 12c5670 liquid-package.ts rename actions, substitutionsVariables
* aea8bc0 liquid-engine.ts add join_lines, split_lines, keys
* 6cf1235 liquid-drop return objects
* 138c0ba template await newAction.initialise()
* 81cd220 private expandTemplateActions

## 2026-01-08

* cf188a1 process template in build configurations
* 2471681 rework actions with explicit initialise()
* c1e29ba README update
* 6f03e9c package.json update test scripts
* 6902bb3 launch.json debug test
* 65f597e tests package & actions
* 153bf36 .prettierignore allow tests
* ecf2374 liquid-actions.ts implement templates
* 21cc7a8 types.ts add JsonActionTemplate
* 1e4d3c5 liquid-package.ts assert message
* 8d6543b liquid-drop.ts cosmetics in errors
* 5e93416 perform-substitutions error cosmetics
* 24ce9ec initialise() returns boolean


## 2026-01-05

## 2026-01-05

* 51b7a26 3.1.3
* a087546 prepare v3.1.3
* 5515ed0 fix pacote & semver imports

## 2026-01-04

* 9af4dcf 3.1.2
* 0c93fdf prepare v3.1.2
* 0482730 fix action & configurations inheritance

## 2026-01-03

* f0f4616 3.1.1
* 0cc6b04 prepare v3.1.1
* v3.1.1 released
* 0549cc9 cosmetise imports
* b9b7f2a fix inherits
* bf3f0fc run() returns 0
* 3b26dde 3.1.0
* 2581b55 prepare v3.1.0
* c0abb4a cosmetics
* 536f845 policies.ts: add singleParameterXpmInitTemplate
* e7a4e9b 3.0.0
* bda9e7a prepare v3.0.0
* f4453ab update copyright 2026
* a703d84 add init-template-base.ts
* baa6357 types.ts update XpmContext
* 3937908 errors.ts: add Syntax, Output

## 2026-01-01

* 17b9048 package.json: fix-compile
* 26126ce package.ts cosmetics
* 0f9ac8b /lib/functions
* 5afe73c liquid-actions.ts: getCommands()
* 5919297 package.ts: rename readPackageDotJson & cosmetics

## 2025-12-31

* b287e94 pacakge.ts: update downloadBinaries
* 4049c07 types.ts: add JsonXpmBinariesPlatforms

## 2025-12-30

* 81ba853 index.ts: re-export Liquid
* c4f70b1 README update
* e5cb1f1 package.ts: simplify pacoteExtract()

## 2025-12-29

* 63e47fc package.json cosmetics
* 7f3a83a tests/README updates
* 9c2874a .taprc updates
* 390219e .prettierrc.json
* 6a91716 package.json cleanups
* 14ba400 tap update
* 68fe9ae tap ignore coverage
* b9c9e17 .taprc
* adce494 test-ci experiments
* 8556b59 test-ci.yml update
* e400e92 package*.json update
* 0000a21 eslint.config.js
* 7997da4 update tap (deprecate old tests)
* d3b5c59 src/README update
* 68032be package.json rename xpm-lib
* 7119858 index.ts update
* c7052cf package.ts silence eslint
* a19b236 types.ts fix JsonXpack

## 2025-12-27

* 619fa19 renamed xpm-lib and version 3.0.0
* 3c4dfef package.json: update deps
* 04dd426 remove xpm-liquid.ts
* 627068c package.ts: move many methods from xpm here
* 09a7b8a updates & cosmetics
* 25e5b73 utils.ts: add filter*()
* da3e8c1 add errors.ts
* 68952b9 add chmod-recursive.ts
* f95d30c add policies.ts
* c43b763 cosmetise imports
* 2a1194f extract types.ts

## 2025-12-18

* 84131c0 add package.ts
* d68fa24 rework constructors trace
* 3a4e927 rename liquid-*.ts
* ae3aa4e remove package .initialise()
* d2fd2d7 remove default #actions.initialise()
* 0787460 use #isInitialised
* 4cb86ee this.constructor.name & cosmetics

## 2025-12-17

* bacfe38 async inits, inheritS, names(), get()

## 2025-12-10

* eb21408 extract perform-subtitutions.ts

## 2025-12-09

* 2d76486 eslint fix
* 35de83b package*.json bump deps
* ee5be1e remove xpm-liquid from exports
* dbb37ff lint fixes
* a6e5ac2 utils.ts: add isString
* a84021f add actions & build-configurations
* bb09d4a rename substitutions-variables.ts
* ac15232 rename package.ts

## 2025-12-05

* 1d5c038 rework Actions & Action
* 9ff4cdd update config for module only

## 2025-12-02

* 1d9b228 data.ts add XpmLiquidData constructor

## 2025-12-01

* a7bb371 add preliminary data types
* a9873d8 split code
* cb47d7a copyright cosmetics

## 2025-11-27

* 3563508 2.2.1
* 7c2b134 prepare v2.2.1
* 596ca67 test original array behaviour
* 0d0000c add logger to performSubstitutions

## 2025-11-26

* 7ade690 2.2.0
* dc809d1 prepare v2.2.0

## 2025-11-25

* v2.2.0 released
* a0200ad #8: add Drop
* 0dbf1f5 2.1.0
* b72f8ea .npmignore website
* 8a387ba README update
* 0a64c94 update workflows
* 456f9b8 prepare v2.1.0
* 32ebd9b #8: use context for subsequent substitutions

## 2025-01-30

* c96ea70 website/package.json cosmetics

## 2025-01-10

* 0e4cfbf README updates

## 2025-01-08

* c96a2f7 package.json: bump deps

## 2024-12-24

* 5d43a66 re-generate commons

## 2024-03-10

* 1a031f7 workflows updates
* 4f1a91a move website to separate folder

## 2024-03-07

* 4949c55 2.0.0
* 8c39c6a package.json: npm-pack
* 163c870 README update
* 35b9864 prepare v2.0.0
* v2.0.0 released
* 7f7eebd bump deps
* 81487e3 #7: add lenientIf: true
* 433892e publish-github-pages update
* 769e376 README update
* 2ae81eb package.json: add safari action

## 2023-04-17

* 4c079b1 package.json: typedoc 0.24.4
* 6bb735c publish-*.yml: add package.json to includes

## 2023-04-16

* 180c768 package.json: typedoc 0.24.2

## 2023-04-09

* 49508b5 package.json: add tap-c8
* abc5763 bump typedoc 2.24.1

## 2023-04-05

* 0cbdd39 tests cosmetics

## 2023-04-04

* 88bd937 test-ci.yml: bump node 16

## 2023-03-18

* 983d04f destructure { log }
* 61e17cf CHANGELOG update
* a4bbcbf READMEs updates
* defca6e workflows renames
* 55ee90c package.json cosmetics
* 89f0696 update licenses
* 481dc74 eslint max-len

## 2023-03-13

* 487b8a9 update for node 16

## 2023-03-06

* fff1fca READMEs updates
* 6493477 CHANGELOG.md update
* 5b55a6c .vscode/settings.json: ignoreWords
* dbd995d typedoc.json: update not exported
* af1a28e package.json: update homepage
* da60975 package.json: update link-deps
* b5a1500 .npmignore update
* f84bbe4 .gitignore updates
* 5000d26 package.json updates
* 4dd6468 update workflows
* 0b4211a add typedoc metadata
* e710266 update top tsconfig*.json
* aa94fc7 add the esm folder
* 2f057ca update the src folder
* a25724d move the tests back to project root

## 2023-02-09

* addc422 1.2.3
* 7a047b5 CHANGELOG update
* 88603aa README update* ea48568 package.json: bump deps
* b0ab700 nodejs.yml: try again npm ci
* ffcee2b package-lock.json: generated with v14
* f7ebba0 package.json: rename script prepare
* a8839df xpm-liquid.ts: assert os.version
* df5893d nodejs.yml: npm install (ci fails)
* ec47725 prepare v1.2.3
* ec21e0f package.json: update engines
* 0c24380 tsconfig.json: es2020
* 032c0bc .vscode/settings.json: ignoreWords
* 335339f nodejs.yml: bump matrix
* f854faa package.json: bump deps

## 2022-10-21

* v1.2.2 released
* 454eb45 package.json: bump liquidjs & deps

## 2022-04-17

* v1.2.1 released
* bump deps

## 2022-01-01

* v1.2.0 released
* [#5] add `to_posix_filename` and `to_win32_filename`
* bump deps

## 2021-05-12

* v1.1.0 released
* [#4] - support multi-line properties
* move tests to src
* [#3] - validate configuration name

## 2021-05-10

* v1.0.0 released
* [#2] - rename filter to_filename
* [#1] - the filter path should not convert to lower case
* v0.1.1 released

## 2021-05-09

* v0.1.1 prepared

## 2021-05-06

* v0.1.0 released
* unit tests added
* created from VS Code xPack extension
