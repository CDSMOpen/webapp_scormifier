<!--
// FS SCORM - fscommand adapter for ADL SCORM 2004 and Flash MX 2004 Learning Interactions
// version 1.0    12/10/04
// version 1.1	  10/01/08 - Nik Goile, CDSM. Updated to support Objectives and Navigation commands
// Modified by Andrew Chemey, Macromedia
// Based on FS SCORM adapater version 1.2.4:
// 		Fragments Copyright 2002 Pathlore Software Corporation All rights Reserved
// 		Fragments Copyright 2002 Macromedia Inc. All rights reserved.
// 		Fragments Copyright 2003 Click2learn, Inc. All rights reserved.
// 		Developed by Tom King, Macromedia,
// 		             Leonard Greenberg, Pathlore,
// 		             and Claude Ostyn, Click2learn, Inc.
// 		Includes code by Jeff Burton and Andrew Chemey, Macromedia (01/09/02)
// -----------------------------------------------------------------
// Change these preset values to suit your taste and requirements.
// Way to search for API object (0 - starts with bottom up; 1 - starts top down)
var g_intAPIOrder = 1;
var g_bShowApiErrors = false; 	// change to true to show error messages
var g_bInitializeOnLoad = true; // change to false to not initialize LMS when HTML page loads
// Translate these strings if g_bShowApiErrors is true
// and you need to localize the application
var g_strAPINotFound = "Management system interface not found.";
var g_strAPITooDeep = "Cannot find API - too deeply nested.";
var g_strAPIInitFailed = "Found API but LMSInitialize failed.";
var g_strAPISetError = "Trying to set value but API not available.";
var g_strFSAPIError = 'LMS API adapter returned error code: "%1"\nWhen FScommand called API.%2\nwith "%3"';
var g_strDisableErrorMsgs = "Select cancel to disable future warnings.";
// Change g_bSetCompletedAutomatically to true if you want the status to
// be set to completed automatically when calling LMSFinish. Normally,
// this flag remains false if the Flash movie itself sets status
// to completed by sending a FSCommand to set status to "completed",
// "passed" or "failed" (both of which imply "completed")
var g_bSetCompletedAutomatically = false;
// This value is normally given by the LMS, but in case it is not
// this is the default value to use to determine passed/failed.
// Set this null if the Flash actionscript uses its own method
// to determine passed/fail, otherwise set to a value from 0 to 1
// inclusive (may be a floating point value, e.g "0.75".
var g_SCO_MasteryScore = null; // allowable values: 0.0..1.0, or null
//==================================================================
// WARNING!!!
// Do not modify anything below this line unless you know exactly what
// you are doing!
// You should not have to change these two values as the Flash template
// presets are based on them.
var g_nSCO_ScoreMin = 0; 		// must be a number
var g_nSCO_ScoreMax = 100; 		// must be a number > nSCO_Score_Min
// Per SCORM specification, the LMS provided mastery score,
// if any, will override the SCO in interpreting whether the score
// should be interpreted when the pass/fail status is determined.
// The template tries to obtain the mastery score, and if it
// is available, to set the status to passed or failed accordingly
// when the SCO sends a score. The LMS may not actually make the
// determination until the SCO has been terminated.
// Default value for this flag is true. Set it to false if don't
// want to predict how the LMS will set pass/fail status based on
// the mastery score (the LMS will win in the end anyway).
var g_bInterpretMasteryScore = false;
// This script implements various aspects of
// common logic behavior of a SCO.
/////////// API INTERFACE INITIALIZATION AND CATCHER FUNCTIONS ////////
var g_nFindAPITries = 0;
var g_objAPI = null;
var g_bInitDone = false;
var g_bFinishDone = false;
var	g_bSCOBrowse = false;
var g_dtmInitialized = new Date(); // will be adjusted after initialize
var g_bMasteryScoreInitialized = false;
var g_varInterval = "";			// global interval
var g_intIntervalSecs = 3 		// Number of seconds to wait for SCORM API to load
var g_intPollSecs = 0.25			// Number of seconds to poll for API
var g_intCurrentTime = new Date().getTime();
var g_intAPI = 0;				// Type of API to start searching for; allowable values: 0 - SCORM 2004; 1 - SCORM 1.2 (or 1.1)
var g_aryAPI = ["1.0", "0.2"]	// Array that stores the API versions
var g_strAPIVersion = -1;
function AlertUserOfAPIError(strText) {
	if (g_bShowApiErrors) {
		var s = strText + "\n\n" + g_strDisableErrorMsgs;
		if (!confirm(s)){
			g_bShowApiErrors = false
		}
	}
}
function ExpandString(s){
	var re = new RegExp("%","g")
	for (i = arguments.length-1; i > 0; i--){
		s2 = "%" + i;
		if (s.indexOf(s2) > -1){
			re.compile(s2,"g")
			s = s.replace(re, arguments[i]);
		}
	}
	return s
}
function findAPI(win)
{
	// Search the window hierarchy for an object named "API_1484_11" for SCORM 2004 or "API" for SCORM 1.2 or below
	// Look in the current window (win) and recursively look in any child frames
	if(g_intAPI == 0)
	{
		if(win.API_1484_11 != null)
		{
			return win.API_1484_11;
		}
	} else if(g_intAPI == 1 || g_intAPI == "") {
		if (win.API != null)
		{
			g_strAPIVersion = g_aryAPI[g_intAPI];
			return win.API;
		}
	}
	if (win.length > 0)  // check frames
	{
		for (var i=0;i<win.length;i++)
		{
			var objAPI = findAPI(win.frames[i]);
			if (objAPI != null)
			{
				return objAPI;
			}
		}
	}
	return null;
}
function getAPI(intAPISearchOrder)
{
	// intAPISearchOrder is 0 - start at current window and work way up; 1 - start at top window and work way down.
	var objAPI = null;
	intAPISearchOrder=((typeof(intAPISearchOrder)=='undefined')?0:intAPISearchOrder);
	if(intAPISearchOrder==0)
	{
		// start and the current window and recurse up through parent windows/frames
		objAPI = findAPI(window);
		if((objAPI==null) && (window.opener != null) && (typeof(window.opener) != "undefined"))
		{
			objAPI = findAPI(window.opener);
		} else if((objAPI==null) && (window.parent != null) && (typeof(window.parent) != "undefined")) {
			objAPI = findAPI(window.parent);
		}
		if((objAPI==null) && (g_intAPI < (g_aryAPI.length-1)))
		{
			g_intAPI++;
			objAPI = getAPI(intAPISearchOrder);
		}
	} else {
		// start at the top window and recurse down through child frames
		objAPI = findAPI(this.top);
		if (objAPI == null)
		{
			// the API wasn't found in the current window's hierarchy.  If the
			// current window has an opener (was launched by another window),
			// check the opener's window hierarchy.
			objTopWindow=window.top;
			objTopWindow = objTopWindow.opener;
			while (objTopWindow && !objAPI)
			{
				//checking window opener
				objAPI = findAPI(objTopWindow.top);
				if (objAPI==null) objTopWindow = objTopWindow.opener;
			}
			if(objAPI==null && g_intAPI < (g_aryAPI.length-1))
			{
				g_intAPI++;
				objAPI = getAPI(intAPISearchOrder);
			}
		}
	}
	if(objAPI==null)
	{
		// can't find API
	} else if(objAPI != null && g_strAPIVersion == -1) {
		g_strAPIVersion = objAPI.version;
	}
	return objAPI;
}
function waitForAPI()
{
	if(new Date().getTime() > (g_intCurrentTime + g_intIntervalSecs*1000) || APIOK())
	{
		// timed out or found API
		clearInterval(g_varInterval);
		if(!APIOK())
		{
			g_objAPI = null;
		} else {
			if (g_bInitializeOnLoad) {
				SCOInitialize()
			}
		}
	} else {
		g_objAPI = getAPI(g_intAPIOrder);
	}
}
function APIOK() {
	return ((typeof(g_objAPI)!= "undefined") && (g_objAPI != null))
}
function SCOInitialize() {
	var err = true;
	if (!g_bInitDone) {
		if (!APIOK()) {
			AlertUserOfAPIError(g_strAPINotFound);
			err = false
		} else {
			err = g_objAPI.Initialize("");
			if (err == "true") {
				g_bSCOBrowse = (g_objAPI.GetValue("cmi.mode") == "browse");
				if (!g_bSCOBrowse) {
					if (g_objAPI.GetValue("cmi.completion_status") == "not attempted") {
						err = g_objAPI.SetValue("cmi.completion_status","incomplete")
					}
				}
			} else {
				AlertUserOfAPIError(g_strAPIInitFailed)
			}
		}
		if (typeof(SCOInitData) != "undefined") {
			// The SCOInitData function can be defined in another script of the SCO
			SCOInitData()
		}
		g_dtmInitialized = new Date();
	}
	g_bInitDone = true;
	return (err + "") // Force type to string
}
function SCOFinish() {
	if ((APIOK()) && (g_bFinishDone == false)) {
		SCOReportSessionTime()
		if (g_bSetCompletedAutomatically){
			SCOSetStatusCompleted();
		}
		if (typeof(SCOSaveData) != "undefined"){
			// The SCOSaveData function can be defined in another script of the SCO
			SCOSaveData();
		}
		g_bFinishDone = (g_objAPI.Terminate("") == "true");
	}
	return (g_bFinishDone + "" ) // Force type to string
}
// Call these catcher functions rather than trying to call the API adapter directly
function SCOGetValue(nam)			{return ((APIOK())?g_objAPI.GetValue(nam.toString()):"")}
function SCOCommit()					{return ((APIOK())?g_objAPI.Commit(""):"false")}
function SCOGetLastError()		{return ((APIOK())?g_objAPI.GetLastError():"-1")}
function SCOGetErrorString(n)	{return ((APIOK())?g_objAPI.GetErrorString(n):"No API")}
function SCOGetDiagnostic(p)	{return ((APIOK())?g_objAPI.GetDiagnostic(p):"No API")}
//LMSSetValue is implemented with more complex data
//management logic below
var g_bMinScoreAcquired = false;
var g_bMaxScoreAcquired = false;
// Special logic begins here
function SCOSetValue(nam,val){
	var err = "";
	if (!APIOK()){
			AlertUserOfAPIError(g_strAPISetError + "\n" + nam + "\n" + val);
			err = "false"
	} else if (nam == "cmi.score.raw") err = privReportRawScore(val)
	if (err == ""){
			err = g_objAPI.SetValue(nam,val.toString() + "");
			if (err != "true") return err
	}
	if (nam == "cmi.score.min"){
		g_bMinScoreAcquired = true;
		g_nSCO_ScoreMin = val
	}
	else if (nam == "cmi.score.max"){
		g_bMaxScoreAcquired = true;
		g_nSCO_ScoreMax = val
	}
	return err
}
function privReportRawScore(nRaw) { // called only by SCOSetValue
	if (isNaN(nRaw)) return "false";
	if (!g_bMinScoreAcquired){
		if (g_objAPI.SetValue("cmi.score.min",g_nSCO_ScoreMin+"")!= "true") return "false"
	}
	if (!g_bMaxScoreAcquired){
		if (g_objAPI.SetValue("cmi.score.max",g_nSCO_ScoreMax+"")!= "true") return "false"
	}
	if (g_objAPI.SetValue("cmi.score.raw", nRaw)!= "true") return "false";
	g_bMinScoreAcquired = false;
	g_bMaxScoreAcquired = false;
	if (!g_bMasteryScoreInitialized){
		var nTemp = SCOGetValue("cmi.scaled_passing_score");
		nTemp = (nTemp <= 0?0:nTemp * 100);
		var nMasteryScore = parseInt(nTemp,10);
		if (!isNaN(nMasteryScore)) g_SCO_MasteryScore = nMasteryScore
	}
  	if ((g_bInterpretMasteryScore)&&(!isNaN(g_SCO_MasteryScore))){
    	var stat = (nRaw >= g_SCO_MasteryScore? "passed" : "failed");
    	if (SCOSetValue("cmi.success_status",stat) != "true") return "false";
  	}
  	return "true"
}
function MillisecondsToCMIDuration(n) {
//Convert duration from milliseconds to 0000:00:00.00 format
	var hms = "";
	var dtm = new Date();	dtm.setTime(n);
	var h = "000" + Math.floor(n / 3600000);
	var m = "0" + dtm.getMinutes();
	var s = "0" + dtm.getSeconds();
	var cs = "0" + Math.round(dtm.getMilliseconds() / 10);
	hms = "PT" + h.substr(h.length-4)+"H"+m.substr(m.length-2)+"M";
	hms += s.substr(s.length-2)+"S";
	return hms
}
// SCOReportSessionTime is called automatically by this script,
// but you may call it at any time also from the SCO
function SCOReportSessionTime() {
	var dtm = new Date();
	var n = dtm.getTime() - g_dtmInitialized.getTime();
	return SCOSetValue("cmi.session_time",MillisecondsToCMIDuration(n))
}
// Since only the designer of a SCO knows what completed means, another
// script of the SCO may call this function to set completed status.
// The function checks that the SCO is not in browse mode, and
// avoids clobbering a "passed" or "failed" status since they imply "completed".
function SCOSetStatusCompleted(){
	var stat = SCOGetValue("cmi.completion_status");
	if (SCOGetValue("cmi.lesson_mode") != "browse"){
		if ((stat!="completed") && (stat != "passed") && (stat != "failed")){
			return SCOSetValue("cmi.completion_status","completed")
		}
	} else return "false"
}
// Objective management logic
function SCOSetObjectiveData(id, elem, v) {
	var result = "false";
	var i = SCOGetObjectiveIndex(id);
	
	if (isNaN(i)) {
		i = parseInt(SCOGetValue("cmi.objectives._count"));
		if (isNaN(i)) i = 0;
		if (SCOSetValue("cmi.objectives." + i + ".id", id) == "true"){
			result = SCOSetValue("cmi.objectives." + i + "." + elem, v)
		}
	} else {
		result = SCOSetValue("cmi.objectives." + i + "." + elem, v);
		if (result != "true") {
			// Maybe this LMS accepts only journaling entries
			i = parseInt(SCOGetValue("cmi.objectives._count"));
			if (!isNaN(i)) {
				if (SCOSetValue("cmi.objectives." + i + ".id", id) == "true"){
					result = SCOSetValue("cmi.objectives." + i + "." + elem, v)
				}
			}
		}
	}
	return result
}

/*function setObjectiveSuccessStatus(id, val) {
	var objNum = SCOGetObjectiveIndex( id );
	if (objNum == -1) {
        return false;
    }
	return SCOSetValue("cmi.objectives." + objNum + ".success_status", val) == "true";
}*/

function SCOGetObjectiveData(id, elem) {
	var i = SCOGetObjectiveIndex(id);
	if (!isNaN(i)) {
		return SCOGetValue("cmi.objectives." + i + "."+elem)
	}
	return ""
}
function SCOGetObjectiveIndex(id){
	var i = -1;
	var nCount = parseInt(SCOGetValue("cmi.objectives._count"));
	if (!isNaN(nCount)) {
		for (i = nCount-1; i >= 0; i--){ //walk backward in case LMS does journaling
			if (SCOGetValue("cmi.objectives." + i + ".id") == id) {
				return i
			}
		}
	}
	return NaN
}
// Functions to convert AICC compatible tokens or abbreviations to SCORM tokens
function AICCTokenToSCORMToken(strList,strTest){
	var a = strList.split(",");
	var c = strTest.substr(0,1).toLowerCase();
	for (i=0;i<a.length;i++){
			if (c == a[i].substr(0,1)) return a[i]
	}
	return strTest
}
function normalizeStatus(status){
	return AICCTokenToSCORMToken("completed,incomplete,not attempted,failed,passed", status)
}
function normalizeInteractionType(theType){
	return AICCTokenToSCORMToken("true-false,choice,fill-in,matching,performance,sequencing,likert,numeric", theType)
}
function normalizeInteractionResult(result){
	var strInteractionResult = AICCTokenToSCORMToken("correct,wrong,unanticipated,neutral", result)
	strInteractionResult = (strInteractionResult=="wrong"?"incorrect":strInteractionResult);
	return strInteractionResult;
}
function checkInteractionResponse(response_str)
{
	var result_str = "";
	for(var char_int=0;char_int<response_str.length;char_int++)
	{
		if(response_str.substr(char_int,1) == "." || response_str.substr(char_int,1) == ",")
		{
			if(response_str.substr(char_int - 1,1) != "[" && response_str.substr(char_int + 1,1) != "]")
			{
				result_str += "[" + response_str.substr(char_int,1) + "]";
			} else {
				result_str += response_str.substr(char_int,1);
			}
		} else {
			result_str += response_str.substr(char_int,1);
		}
	}
	result_str = (result_str==""?"0":result_str);
	return result_str;
}
function formatTimestamp(time_var)
{
	return formatDate() + "T" + formatTime(time_var, undefined, undefined, 2);
}
// ******************************************************************
// *
// *     Method:           formatTime
// *     Description:      Formats seconds (passed as parameter) to
// *                       PTxHyMzS
// *     Returns:          String (time formatted as HHHH:MM:SS
// *
// ******************************************************************
function formatTime(time_var, minutes_str, seconds_str, typeFormat_int)
{
	var days_str, hours_str, formattedTime_str;
	days_str = "0";
	if(time_var == undefined)
	{
		// create time based on today's current time
		var time_obj = new Date();
		hours_str = time_obj.getHours();
		minutes_str = time_obj.getMinutes();
		seconds_str = time_obj.getSeconds();
	} else if(typeof(time_var) == "string" && time_var.indexOf(":") > -1) {
		var time_obj = time_var.split(":");
		hours_str = time_obj[0];
		minutes_str = time_obj[1];
		seconds_str = time_obj[2];
	} else {
		days_str    = "0";
		seconds_str = "0";
		minutes_str = "0";
		hours_str     = "0";
		seconds_str = Math.round(time_var);
		if(seconds_str > 59)
		{
			minutes_str = Math.round(seconds_str / 60);
			seconds_str = seconds_str - (minutes_str * 60);
		}
		if(minutes_str > 59)
		{
			hours_str = Math.round(minutes_str / 60);
			minutes_str = minutes_str - (hours_str * 60);
		}
		if(hours_str > 23)
		{
			days_str = Math.round(hours_str / 24);
			hours_str = hours_str - (days_str * 24);
		}
	}
	if(typeFormat_int == undefined || typeFormat_int == 1)
	{
		formattedTime_str = "P";
		if(days_str != "0")
		{
			formattedTime_str += days_str + "D";
		}
		formattedTime_str += "T" + hours_str + "H" + minutes_str + "M" + seconds_str + "S";
	} else {
		formattedTime_str = formatNum(hours_str, 2) + ":" + formatNum(minutes_str, 2) + ":" + formatNum(seconds_str, 2);
	}
	return formattedTime_str;
}
// ******************************************************************
// *
// *     Method:           formatDate
// *     Description:      Formats seconds or "MM/DD/YYYY"
// *     Returns:          String (date formatted as "YYYY-MM-DD")
// *
// ******************************************************************
function formatDate(date_var, day_str, year_str)
{
	if (date_var == undefined) {
		// Create date based on today's date
		var date_obj = new Date();
		date_var = formatNum((date_obj.getMonth()+1), 2);
		day_str  = formatNum((date_obj.getDate()), 2);
		year_str = (date_obj.getFullYear());
	} else if(typeof(date_var) == "string" && date_var.indexOf("/") > -1) {
		// Convert from MM/DD/YYYY
		var date_obj = date_var.split("/");
		date_var = formatNum(date_obj[0], 2);
		day_str  = formatNum(date_obj[1], 2);
		year_str = formatNum(date_obj[2], 4);
	}
	var formattedDate_str = (year_str + "-" + date_var + "-" + day_str);
	return formattedDate_str;
}
// ******************************************************************
// *
// *    Method:         formatNum
// *    Description:     Converts the number passed to this function
// *                   to a padded value, typically 2-digit or
// *                   4-digit number (e.g. 2 to 02, or 2 to 0002)
// *    Returns:        String (padded with # of 0's passed
// *
// ******************************************************************
function formatNum (initialValue_var, numToPad_int)
{
	var paddedValue_str = "";                         // String; Contains the value padded with 0's
	var i = 0;                                     // Integer; Variable used for looping
	var initialValue_str = initialValue_var.toString();    // String; Converts parameter "initializeValue_var" explicitly to string
	if (initialValue_str.length > numToPad_int)
	{
		// error - length of initial value already exceeds the number to pad
		// Will return the initialValue_var without additional padding
	} else {
		for (var i = 1; i <= (numToPad_int - initialValue_str.length); i++)
		{
			paddedValue_str = paddedValue_str + "0";
		}
	}
	paddedValue_str = paddedValue_str + initialValue_var;
	return paddedValue_str;
}
// Detect Internet Explorer
var g_bIsInternetExplorer = navigator.appName.indexOf("Microsoft") != -1;
// Handle fscommand messages from a Flash movie, remapping
// any AICC Flash template commands to SCORM if necessary
function pedagogue_content_interface_DoFSCommand(command, args){
	//alert("FSCOMMAND CALLED: " + command + " - " + args);
	var pedagogue_content_interfaceObj = g_bIsInternetExplorer ? pedagogue_content_interface : document.pedagogue_content_interface;
	// no-op if no SCORM API is available
	var myArgs = new String(args);
	var cmd = new String(command);
	var v = "";
	var err = "true";
	var arg1, arg2, n, s, i;
	var sep = myArgs.indexOf(",");
	if (sep > -1){
		arg1 = myArgs.substr(0, sep); // Name of data element to get from API
		arg2 = myArgs.substr(sep+1) 	// Name of Flash movie variable to set
	} else {
		arg1 = myArgs
	}
	
	if (!APIOK()) return;
	if (cmd.substring(0,3) == "LMS"){
		// Handle "LMSxxx" FScommands (compatible with fsSCORM html template)
		if ( cmd == "LMSInitialize" ){
			err = (APIOK() + "")
			// The actual LMSInitialize is called automatically by the template
		}	else if ( cmd == "LMSSetValue" ){
			//alert('LMSSetValue: \r\rArg1: ' + arg1 + '\rArg2: ' + arg2);
			err = SCOSetValue(arg1,arg2)
			//alert("RESULT: "+ err);
		} 	else if ( cmd == "LMSSetObjectiveSuccess" ){
			err = SCOSetObjectiveData(arg1, "success_status", arg2);
			//err = setObjectiveSuccessStatus( arg1, arg2 );
			//alert("OBJECTIVE SET: "+ err);
		} else if ( cmd == "LMSNavigate" ){
			err = doNavigationRequest( arg1, arg2 );
		} else if ( cmd == "LMSConfirmActive" ){
			//alert("CONFIRMING ACTIVE!");
			pedagogue_content_interfaceObj.SetVariable(arg2, true);
		} else if ( cmd == "LMSFinish" ){
			err = SCOFinish()
			// Handled automatically by the template, but the movie
			// may call it earlier.
		}	else if ( cmd == "LMSCommit" ){
			err = SCOCommit()
		}	else if ( cmd == "LMSFlush" ){
			// no-op
			// LMSFlush is not defined in SCORM and calling it causes test suite error
		}	else if ((arg2) && (arg2.length > 0)){
			if ( cmd == "LMSGetValue") {
				//alert'LMSSetValue: \r\rArg1: ' + arg1 + '\rArg2: ' + arg2);
				pedagogue_content_interfaceObj.SetVariable(arg2, SCOGetValue(arg1));
			}	else if ( cmd == "LMSGetLastError") {
				pedagogue_content_interfaceObj.SetVariable(arg2, SCOGetLastError(arg1));
			}	else if ( cmd == "LMSGetErrorString") {
				pedagogue_content_interfaceObj.SetVariable(arg2, SCOGetLastError(arg1));
			}	else if ( cmd == "LMSGetDiagnostic") {
				pedagogue_content_interfaceObj.SetVariable(arg2, SCOGetDiagnostic(arg1));
			}	else {
				// for unknown LMSGetxxxx extension
				v = eval('g_objAPI.' + cmd + '(\"' + arg1 + '\")');
				pedagogue_content_interfaceObj.SetVariable(arg2,v);
			}
		} else if (cmd.substring(0,3) == "LMSGet") {
			err = "-2: No Flash variable specified"
		}
		// end of handling "LMSxxx" cmds
	} else if ((cmd.substring(0,6) == "MM_cmi")||(cmd.substring(0,6) == "CMISet")) {
		// Handle a Macromedia Learning Components FScommands.
		// These are using AICC HACP data model conventions,
		// so remap data from AICC to SCORM as necessary.
		var F_intData = myArgs.split(";");
		if (cmd == "MM_cmiSendInteractionInfo") {
			n = SCOGetValue("cmi.interactions._count");
			s = "cmi.interactions." + n + ".";
			// Catch gross errors to avoid SCORM compliance test failure
			// If no ID is provided for this interaction, we cannot record it
			v = F_intData[2]
			if ((v == null) || (v == "")) err = 201; // If no ID, makes no sense to record
			if (err =="true"){
				err = SCOSetValue(s + "id", v)
			}
			if (err =="true"){
				var re = new RegExp("[{}]","g")
				for (i=1; (i<9) && (err=="true"); i++){
					v = F_intData[i];
					if ((v == null) || (v == "")) continue
					if (i == 1){
						err = SCOSetValue(s + "timestamp", formatTimestamp(v))
					} else if (i == 3){
						err = SCOSetValue(s + "objectives.0.id", v)
					} else if (i == 4){
						err = SCOSetValue(s + "type", normalizeInteractionType(v))
					} else if (i == 5){
						// strip out "{" and "}" from response
						v = v.replace(re, "");
						err = SCOSetValue(s + "correct_responses.0.pattern", checkInteractionResponse(v))
					} else if (i == 6){
						// strip out "{" and "}" from response
						v = v.replace(re, "");
						err = SCOSetValue(s + "learner_response", checkInteractionResponse(v))
					} else if (i == 7){
						err = SCOSetValue(s + "result", normalizeInteractionResult(v))
					} else if (i == 8){
						err = SCOSetValue(s + "weighting", v)
					} else if (i == 9){
						err = SCOSetValue(s + "latency", v)
					}
				}
			}
		} else if (cmd == "MM_cmiSendObjectiveInfo"){
			err = SCOSetObjectiveData(F_intData[1], ".score.raw", F_intData[2])
			if (err=="true"){
				SCOSetObjectiveData(F_intData[1], ".status", normalizeStatus(F_intData[3]))
			}
		} else if ((cmd=="CMISetScore") ||(cmd=="MM_cmiSendScore")){
			err = SCOSetValue("cmi.score.raw", F_intData[0]);
		} else if ((cmd=="CMISetStatus") || (cmd=="MM_cmiSetLessonStatus")){
			var strTempStatus = normalizeStatus(F_intData[0]);
			if (strTempStatus == "passed" || strTempStatus == "failed")
			{
				err = SCOSetValue("cmi.success_status", normalizeStatus(F_intData[0]))
			} else {
				err = SCOSetValue("cmi.completion_status", normalizeStatus(F_intData[0]))
			}
		} else if (cmd=="CMISetTime"){
			err = SCOSetValue("cmi.session_time", formatTime(F_intData[0]))
		} else if (cmd=="CMISetCompleted"){
			err = SCOSetStatusCompleted()
		} else if (cmd=="CMISetStarted"){
			err = SCOSetValue("cmi.completion_status", "incomplete")
		} else if (cmd=="CMISetPassed"){
			SCOSetValue("cmi.completion_status", "completed");
			err = SCOSetValue("cmi.success_status", "passed")
		} else if (cmd=="CMISetFailed"){
			SCOSetValue("cmi.completion_status", "completed");
			err = SCOSetValue("cmi.success_status", "failed")
		} else if (cmd=="CMISetData"){
			err = SCOSetValue("cmi.suspend_data", F_intData[0])
		} else if (cmd=="CMISetLocation"){
			err = SCOSetValue("cmi.location", F_intData[0])
		} else if (cmd=="CMISetTimedOut"){
			err = SCOSetValue("cmi.exit", "time-out")
		} // Other Learning Component FScommands are no-ops in this context
	} else {
		if (cmd=="CMIFinish" || cmd=="CMIExitAU"){
			err = SCOFinish()
		} else if (cmd=="CMIInitialize" || cmd=="MM_StartSession"){
			err = SCOInitialize()
		} else {
			// Unknown command; may be invoking an API extension
			// If commands comes with a 2nd argument, assume a value is expected
			// otherwise assume it is just a cmd
			if (eval('g_objAPI.' + cmd)) {
				v = eval('g_objAPI.' + cmd + '(\"' + arg1 + '\")');
				if ((arg2) && (arg2.length > 0)){
					pedagogue_content_interfaceObj.SetVariable(arg2,v)
				} else {
					err = v
				}
			} else {
				err = "false"
			}
		}
	}
	// End of command translation and processing
	// handle detected errors, such LMS error returns
	if ((g_bShowApiErrors) && (err != "true")) {
		AlertUserOfAPIError(ExpandString(g_strFSAPIError, err, cmd, args))
	}
	return err
}

//Do navigation commands
function doNavigationRequest( request, target ){
	//alert("DO NAV REQUEST: "+ request + " - " + target);
	if (!APIOK()) return;
	
	/*if (g_objAPI.GetValue("cmi.completion_status") != "completed") {
		g_objAPI.SetValue("cmi.completion_status", "completed");
	}
	g_objAPI.SetValue("cmi.exit", "");*/
	
	if ( request == "continue" ){
		//g_objAPI.SetValue("adl.nav.request", "continue");
		SCOSetValue("adl.nav.request", "continue");
	} else if ( request == "choice" ){
		var choiceTarget = "{target=" + target + "}choice";
		//alert("Going to: "+ choiceTarget);
		//Nav to the target
		//g_objAPI.SetValue("adl.nav.request", choiceTarget);
		SCOSetValue("adl.nav.request", choiceTarget);
	}
	g_objAPI.Terminate("");
	g_objAPI = null;
}

//-->