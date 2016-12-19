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
	var data = extract_form_fields(form);
	if(data[0].length == 0){
		return true; //No action necessary, not a password form
	}
	if(data[1] == -1){
		alert("Unable to continue; Unknown username");
		return false;
	} else if (data[0].length > 2) {
		alert("More than 2 password fields");
		return false;
	} else if (data[0].length == 1){
		var username = form.elements[data[1]];
		//FIXME: Might be worth asking if we've never seen this username on this site
		var keypair = derived_keypair(derived_password(form.elements[data[0][0]].value, username, hostname));
		var nonce = ""; //FIXME
		var nonce = decrypt_nonce(keypair, nonce);
		form.elements[data[0][0]].value = nonce;
		//TODO decrypt nonce to prove identity
	} else if (data[0].length == 2) {
		//Note this check really isn't a great solution. Someone could easily duplicate the contents of one field into a hidden field and we wouldn't know
		if (form.elements[data[0][0]].value != form.elements[data[0][1]]){ 
			alert("Mismatched password fields -- is this actually a registration form?");
			return false;
		}
		var username = form.elements[data[1]];
		var keypair = derived_keypair(derived_password(form.elements[data[0][0]].value, username, hostname));
		var pubkey = publicKeyString(keypair);
		form.elements[data[0][0]].value = pubkey;
		form.elements[data[0][1]].value = pubkey;
	} else {
		alert("Unknown case. Please report to devs");
		return false;
	}
	return true;
}
	
function extract_form_fields(form){
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
				username_field = j;
				break;
			}
		}
	}
	
	return [password_fields, username_field];
}

//Handles crypto calls
function derived_password(original_password, hostname, username){
	//FIXME should use PBKDF2 instead; SHA256 is not a key derivation function
	var salt = SHA256(hostname) + SHA256(username);
	var salted = SHA256(original_password) + salt
	var hashed = SHA256(salted);
	for(var i = 0; i < 50; i++) { //50 iterations
		hashed = SHA256(hashed + salt);
	}
	salted = 0;
	original_password = 0; //Try to get original password removed from memory ASAP
	return hashed;
}

function dervived_keypair(derived_password){
	return cryptico.generateRSAKey(derived_password, 2048); //1024 is breakable. Keys need to last a long time.
}

function decrypt_nonce(privkey, encr_nonce){
	return cryptico.decrypt(encr_nonce, privkey);
}