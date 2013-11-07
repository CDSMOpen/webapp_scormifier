"use strict"

Crypto = require 'crypto'
path = require 'path'
Handlebars = require 'handlebars'
_ = require 'underscore'
_.str = require 'underscore.string'
_.mixin _.str.exports()

_manifestWriter = (grunt)->
	->
		options = @options()

		Handlebars.registerHelper "safeUri", (uri)->
			new Handlebars.SafeString encodeURIComponent(uri)

		Handlebars.registerHelper "hash", (str)->
			_hashString str

		template = Handlebars.compile options.template

		for fileGroup in @files
			manifest = template
				props: options.props
				files: fileGroup.src

			manifestPath = path.join fileGroup.cwd, fileGroup.dest
			grunt.file.write manifestPath, manifest
			
# _multiManifestWriter = (grunt)->
# 	->
# 		options = @options()
# 		targetFolders = grunt.file.expand options.folders
# 		console.log "Writing manifests for:"
# 		console.log targetFolders

# 		manifestConfigs = for folder, i in targetFolders
# 			@data

# 		# console.log config for config in manifestConfigs
# 		# console.log _.pick(config, "props") for config in manifestConfigs
# 		console.log @data

			 
			
_hashString = (message)->
	Crypto.createHash('md5')
		.update(message)
		.digest('hex')

module.exports = (grunt)->
	grunt.registerMultiTask "writeManifest", "write a manifest listing all the files matched by your search pattern.", _manifestWriter(grunt)
	# grunt.registerMultiTask "writeManifests", "specify a range of folders for which you want to write manifests", _multiManifestWriter(grunt)