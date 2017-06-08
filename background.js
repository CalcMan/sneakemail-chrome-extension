$(document).ajaxError(function(event, jqXHR, ajaxSettings, thrownError) {
        console.log('unknown ajax error: '+event);
    }
);

function captureInputField(tab) {
    field = { tab: tab.id, fieldVar : 'sneakemail_generated_addr' }
    
    chrome.tabs.executeScript(field.tab, 
        {code : "document."+field.fieldVar+" = document.activeElement;"});
        
    return field;
}

// insert text to active element
function setField(field, text) {
    chrome.tabs.executeScript(field.tab, 
        {code:"document."+field.fieldVar+".value = '"+text+"';"});
}

function isLoggedIn(homepageHTML) {
    var $scratch = $('#scratchpad').html(homepageHTML);
    var found = $scratch.find('#search_id');
    $('#scratchpad').html('');
    return found.size();
}

//convert the page url to the appropriate sneakemail name to search/create
function urlToSneakemailName(url) {
    var domain = url.split('/')[2];
    var domains = domain.split('.');
    return domains[domains.length-2]+'.'+domains[domains.length-1];
}

//Confirm username/password are saved
function isAuthAvailable(){
    return localStorage.username && localStorage.password;
}

// insert sneakemail address to active page element
function insertAddress(info, tab) {
    var field = captureInputField(tab);
    setField(field, 'Sneakemail Filler init...');
    
    if (!isAuthAvailable()){
        chrome.pageAction.show(tab.id);
        setField(field, 'Login top right & try again');
        return;
    }

    //login
    $.ajax('https://sneakemail.com/', {
        success : function(data, textStatus, jqXHR) {
            var $scratch = $('#scratchpad').html(data);
            var found = $scratch.find('input[name="authenticity_token"]');
            if(found.size())
                login(info, tab, field, found.val());
            else {
                console.log('failed to find authenticity token');
                setField(targetField, 'The man with nine fingers, he ran away!');
            }
            $scratch.html('');
        },
        error : function() {
            console.log('failed on pre-login');
            setField(targetField, 'The decision of the executive officer for the week was not verified');
        },
    });
}

function login(info, tab, field, authenticity_token) {
    var emailLabel = urlToSneakemailName(info.pageUrl);
    setField(field, emailLabel+': Logging in...');
    login_info = {
        username : localStorage.username,
        password : localStorage.password,
        authenticity_token : authenticity_token,
        remember_me : "true"
    }
    //login
    $.ajax('https://sneakemail.com/auth/login', {
        type : 'post',
        data : login_info,
        success : function(data, textStatus, jqXHR) {
            if(!isLoggedIn(data)) {
                chrome.pageAction.show(tab.id);
                setField(field, 'Sneakemail Login Failed');
            }
            else
                searchAddress(emailLabel, field)
        },
        error : function() {
            console.log('failed on login call');
            setField(field, 'The bugfix is in the Castle of AAARRRGHHH...');
        },
    });
}

function searchAddress(emailLabel, targetField){
    setField(targetField, emailLabel+': Searching...');
    
    $.ajax('https://sneakemail.com/search/names/name/'+emailLabel, {
        success : function(data, textStatus, jqXHR) {
            var $scratch = $('#scratchpad').html(data);
            var found = $scratch.find('#activate_address');
            if(found.size())
                setField(targetField, found.val());
            else
                createAddress($scratch, emailLabel, targetField);
            $scratch.html('');
        },
        error : function() {
            console.log('failed on search');
            setField(targetField, 'Maybe the developer is pining for the fjords?');
        },
    });
}

function createAddress($newFormPage, emailLabel, targetField){
    setField(targetField, emailLabel+': Creating...');
    
    var createData = {
        notes : 'auto-generated by Chrome extension',
        folder_pulldown : $newFormPage.find('#folder_pulldown').val()
    };
    $newFormPage.find('form:last input').each(function(index) {
        createData[this.name] = this.value;
    });
    delete createData['grey'];
    
    var url = 'https://sneakemail.com'+$newFormPage.find('form:last').attr('action');
    
    $.ajax(url, {
        type : 'post',
        data : createData,
        success : function(data, textStatus, jqXHR) {
            var found = $('#scratchpad').html(data).find('#activate_address');
            if(found.size())
                setField(targetField, found.val());
            else {
                setField(targetField, 'And god said... Oops.'); //creation failed
            }
        },
        error : function() {
            console.log('failed on create');
            setField(targetField, '1... 2... 5! (doh)');
        },
    });
}

//TODO: add content_script that creates this menu and calls an event into background page on click
//  That allows the background script to be non-persistent and use less memory
var title = "Sneakemail address here";
var id = chrome.contextMenus.create(
    {"title": title, "contexts":["editable"], "onclick": insertAddress},
    function() {
        if(chrome.extension.lastError) {
            console.log("menu item create error: " + chrome.extension.lastError.message);
        }
    }
    );
