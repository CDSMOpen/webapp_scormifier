"use strict"

_ = require 'underscore'

module.exports = (grunt)->
	grunt.registerMultiTask "multiDestCopy", "Configure grunt copy to copy to multiple destinations",->
		options = @options()

		destinations = grunt.file.expand options.dests
		# console.log destinations
		fileDefinitions = @data.files

		copyConfigurations = for dest in destinations
			# console.log "Configuring copy to %s", dest
			files = for fileDef in fileDefinitions
				_.extend _.clone(fileDef), dest: dest

			copyConfig = {
				dest: dest
				files: files
			}

		# configure the tasks and add them to a task listgru
		multiCopyTasks = for copyConfig, i in copyConfigurations
			copyLabel = "#{@target}_to_#{copyConfig.dest}"
			grunt.config ['copy', copyLabel], files: copyConfig.files
			"copy:#{copyLabel}"

		# run the copy jobs	
		grunt.task.run multiCopyTasks
