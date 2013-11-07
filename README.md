# Web App Scormifier

Set of Grunt tasks to help package web folders as SCOs

## Getting Started
- make sure you have [node](http://nodejs.org/) installed
- make sure you have git installed, and it works from the command line
- clone this repo! `git clone https://github.com/CDSMOpen/webapp_scormifier`

### Installing the node scripts
Run the following scripts from the command line in the root of the project folder

`npm install -g grunt-cli`
: This installs the grunt command line interface globally which allows you to run grunt tasks from the command line

`npm install` 
: installs all other node dependencies

### Adding the target folders
Put the folders you want to package into the `input` folder, grouped by the content project, like so.

    - input
        -   project_name
            - LO1
            - LO2   

### Running the scripts
From the command line:

`grunt scormify`
: copies each source folder into the working directory, adds all the required scorm files from `scorm_base` and writes an `imsmanifest.xml` file for each

`grunt package` 
: takes every folder from the *working* directory, zips it up and puts it in the *output* folder

`grunt scormify package`
: runs one script after the other

### Further Reading
- [Configuring Grunt Tasks](http://gruntjs.com/configuring-tasks)
- [Globbing Patterns & Wildcards](http://www.tldp.org/LDP/GNU-Linux-Tools-Summary/html/x11655.htm) - useful for targeting specific folders from your grunt tasks

