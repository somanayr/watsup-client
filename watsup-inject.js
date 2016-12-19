//Handles form interception
function analyze_form(form){
	if(!has_password_field(form)) return;
		
	document.forms[i].addEventListener("submit", function(){
		var form = this.form;
		form.onsubmit = on_form_sent
	}
}

function add_form_listeners(){
	for (var i = 0; i < document.forms.length; i++) {
		var form = document.forms[i];
		
		analyze_form(form);
		
	}
}

function has_password_field(form){
	for(var j = 0; j < form.elements.length; j++){
		var field = form.elements[j];
		if(field.type == "password"){ //Identify as password field
			return true;
		}
	}
}


//Handles swap out of form variables
function on_form_sent(event, form){
	
}
	
function extract_form_data(form){
	password_fields = []; //Len 1 -> login; Len 2 -> Registration, must match value; Len 3 -> Suspicious
	username_field = -1; //If -1, username field could not be identified
	for(var j = 0; j < form.elements.length; j++){
		var field = form.elements[j];
		if(field.type == "password"){ //Identify as password field
			password_fields.push(j);
		}
	}
	
	if(password.fields.length >= 1){ //Should look for a username field
		//FIXME this needs to be seriously improved. Looking for the first field up could cause problems.
		//Since the username is half of the salt, failure is very bad
		for(var j = password_fields[0]; j >= 0; j--){ //Finds the first text field above the first password field
			var field = form.elements[j];
			if(field.type == "email" || field.type == "text"){
				
			}
		}
	}
	
	return [password_field, username_field];
}