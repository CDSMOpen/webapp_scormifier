"use strict"

path = require 'path'

module.exports = (grunt)->
	grunt.registerMultiTask "zipFolders", "Set up grunt-zip jobs to zip the scos up", ->
		options = @options()

		# 			
		targets = for input in @files
			srcDir = input.src[0] # only handles first src item
			target = 
				name: path.basename input.dest
				options:
					cwd: srcDir
					dest: "#{input.dest}.zip"
					src: "#{srcDir}/**"
					filter: "isFile"

		console.log target.options for target in targets

		zipTasks = for target in targets
			grunt.config ["zip", target.name], target.options
			"zip:#{target.name}"

		grunt.task.run zipTasks
		