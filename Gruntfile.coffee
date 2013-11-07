"use strict"
path = require 'path'
module.exports = (grunt)->
	require("matchdep").filterDev("grunt-*").forEach(grunt.loadNpmTasks)

	inputFolder = "input"
	tempFolder = "working"
	outputFolder = "output"



	grunt.initConfig
		clean:
			output: outputFolder
			temp: tempFolder
			test: 
				expand: true
				cwd: "test"
				src: ["fixtures/*/*"]


		copy:
			content: 
				files: [
					expand: true
					cwd: inputFolder
					src: ["*/*/**/*.*"]
					dest: tempFolder
				]

		multiDestCopy:
			test:
				options:
					dests: ["test/*/*"]

				files: [	
					expand: true
					cwd: inputFolder
					src: ["*/C1*/**/*.*"]
				]

			scormFiles:
				options:
					dests: ["#{tempFolder}/*/*"]
				files: [
					expand: true
					cwd: "scorm_base"
					src: ["**/*.*"]
				]

		writeIMSManifests:
			scorms:
				options:
					template: grunt.file.read "templates/imsmanifest_noscore.xml.handlebars"
					projectName: "Santia"
					folders: ["#{tempFolder}/*/*"]
					props:
						manifest_id: "uk.co.santia" # unique namespace to this pack - com.cdsm.customer.project.module
						org_id: "org_id_santia" # unique to this pack. This is not the Customer Org. It's how to organise scos
						org_name: "Santia" # Title of this project
						sco_id: "sco_id" # unique to this pack. This is not the Customer Org. It's how to organise scos
						sco_name: "Int Diploma" # Title of this project
						sco_pass_score: 0.5 # Scaled value 0 - 1 


		# writeManifest:
		# 	example:
		# 		options:
		# 			template: grunt.file.read "templates/imsmanifest.xml.handlebars"
		# 			props:
		# 				manifest_id: "uk.co.santia.c1111" # unique namespace to this pack - com.cdsm.customer.project.module
		# 				org_id: "org_id_santia" # unique to this pack. This is not the Customer Org. It's how to organise scos
		# 				org_name: "Santia" # Title of this project
		# 				sco_id: "sco_id" # unique to this pack. This is not the Customer Org. It's how to organise scos
		# 				sco_name: "Int Diploma" # Title of this project
		# 				sco_pass_score: 0.5 # Scaled value 0 - 1 
		 		

		# 		files: [
		# 			cwd: ".tmp/int_diploma/C1international_diploma"
		# 			src: ["**/*.*"]
		# 			dest: "ims_manifest.xml"
		# 		]


		zipFolders:
			package:
				options:
					dest: outputFolder		

				expand: true
				cwd: tempFolder
				src: "*/*"
				dest: outputFolder
				filter: "isDirectory"

	grunt.registerMultiTask "writeIMSManifests", "configure write manifest to write an ims manifest for each sco", ->
		# this task just configures multiple 'writeManifest' tasks
		options = @options()
		targetFolders = grunt.file.expand options.folders

		writeManifestConfigs = for folder, index in targetFolders
			folderName = path.basename folder
			{
				options:
					template: options.template
					props:
						manifest_id: "#{options.props.manifest_id}.#{folderName}" # unique namespace to this pack - com.cdsm.customer.project.module
						org_id: "#{options.props.org_id}_#{index}" # unique to this pack. This is not the Customer Org. It's how to organise scos
						org_name: options.projectName # Title of this project
						sco_id: "#{options.projectName}_#{folderName}_#{index}" # unique to this pack. This is not the Customer Org. It's how to organise scos
						sco_name: folderName # Title of this project
						sco_pass_score: 0.5 # Scaled value 0 - 1 
				files: [
					cwd: folder
					src: ["**/*.*"]
					dest: "ims_manifest.xml"
				]

			}

		# configure writeManifest task
		manifestTasks = for conf in writeManifestConfigs
			taskLable = "sco_manifest_#{conf.options.props.sco_name}"
			grunt.config ['writeManifest', taskLable], conf
			"writeManifest:#{taskLable}"

		grunt.task.run manifestTasks


	###*
	 * Run These Tasks!!!!
	 * e.g. `grunt scormify package` to both scormify and zip the scos up
	 * or run them separately 
	 * e.g `grunt scormify` to just create the scos in the temp folder 
	###

	grunt.loadTasks "tasks"
	grunt.registerTask "scormify", ["clean:temp", "copy:content", "multiDestCopy:scormFiles", "writeIMSManifests"]
	grunt.registerTask "package", ["clean:output", "zipFolders"]