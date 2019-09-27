function buildAddOn(e) {
  setEmails(e);
  return buildRoot();
}

function buildRoot() {
  return buildCard({mode: "root", nav: "init"});
}

function universalAction__search() {
  var card = buildCard({mode: "search", nav:"init"});
  return CardService.newUniversalActionResponseBuilder().displayAddOnCards([card]).build();
}

function universalAction__settings() {
  var cardParams = {mode: "userSettings", user: getUser(), nav: "init"};
  
  var card = buildCard(cardParams);
  
  var cardsUniversalAction = CardService.newUniversalActionResponseBuilder()
    .displayAddOnCards([card]).build();
  
  return cardsUniversalAction;
}


/*///////////////////////////////////////////
                                card builder
*////////////////////////////////////////////


function buildCard(cardParams) {
  var card = CardService.newCardBuilder();
  var section = [];
  var cardDetails;
  
  cardParams = cardParams.parameters ? cardParams.parameters : cardParams;
  
  switch (cardParams.mode) {
    case "root":
      cardDetails = buildCard__root(cardParams); break; 
      
    case "create":
      cardDetails = buildCard__create(cardParams); break;
      
    case "read":
      cardDetails = buildCard__read(cardParams); break;
      
    case "edit":
      cardDetails = buildCard__edit(cardParams); break;
      
    case "search":
      cardDetails = buildCard__search(cardParams); break;
      
    case "display":
      cardDetails = buildCard__display(cardParams); break;
      
    case "userSettings":
      cardDetails = buildCard__userSettings(cardParams); break;
      
  }
 
  card.setHeader(cardDetails.header);
  cardDetails.section.forEach(function(section){
    card.addSection(section);
  });
  card =  card.build(); 
  
  
  if (cardParams.nav == "init") return card;

  ////////////////////////

  var nav = CardService.newNavigation();

  if (!cardParams.nav || cardParams.nav == "push") nav.pushCard(card);
  
  if (cardParams.nav == "popToRootAndUpdateAndPush") {
    updatedRootCard = buildCard({mode: "root", nav: "init"});
    nav.popToRoot().updateCard(updatedRootCard).pushCard(card);
  }
  
  if (cardParams.nav == "popAndUpdate") {
    nav.popCard().updateCard(card);
  }
  
  if (cardParams.nav == "update") {
    nav.updateCard(card);
  }
    
  return CardService
    .newActionResponseBuilder()
    .setNavigation(nav)
    .build();
}



/*///////////////////////////////////////////
                                        cards
*////////////////////////////////////////////

function buildCard__root() {
  var emails = getEmails();
  var header = CardService.newCardHeader().setTitle(emails.length == 1 ? emails.length + " email address found" : emails.length + " email addresses found").setImageUrl(getIcon("email_blue"));
  var section = CardService.newCardSection();
  
  emails.forEach(function(email) {
    var fetchParams = {
      table: "Contacts",
      filter: [
        {field: "Email", query: email.address},
        {field: "Email Secondary", query: email.address}
      ]
    };

    var records = fetchAirtable(fetchParams).records[0];        
    Logger.log(JSON.stringify(records));
    var actionParams__read = {icon: "arrow_blue", mode: "read", table: "Contacts", record: records ? records.id : null};
    var actionParams__create = {icon: "arrow_grey", mode: "create", table: "Contacts", email: JSON.stringify(email)};
    var vendorRollType = records && records.fields["Vendor Roll Type"] ? records.fields["Vendor Roll Type"].join(", ") : "";
    
    var labelParams = {
      topLabel: email.name ? email.name : "",
      content: records ? "<b><font color='#4285F4'>" + email.address + "</font></b>" : email.address,
      bottomLabel: records ? vendorRollType : "Not in Airtable",
      button:  buildImageButton(records ? actionParams__read : actionParams__create)
    };
    
    section.addWidget(buildLabel(labelParams));
  });
  
  return {
    header: header,
    section: [section]
  }
}

function buildCard__create(cardParams) {
  var header = CardService.newCardHeader().setTitle("Create new contact").setImageUrl(getIcon("fiber_new"));
  var section = CardService.newCardSection();
  var fields = getFields(cardParams.table);
  var email = JSON.parse(cardParams.email)
  
  fields.forEach(function(field) {
    var value = "";
    if (field == "Email") value = email.address;
    if (field == "Contact") value = email.name ? email.name : "";
    var inputParams = {field: field, type: getInputType(field), value: value};
    var labelParams = {topLabel: field, content: "", bottomLabel: "Linked field cannot be indirectly updated"};
    
    section.addWidget(inputParams.type == "linked" ? buildLabel(labelParams) : buildInput(inputParams));
  });
  
  var buttonParams = {text: "Create new record", func: "buildCard__post", style: "true"};
  section.addWidget(buildButton(buttonParams));
  
  return {header: header, section: [section]};
}





function buildCard__post(e) {
  var fieldsToPost = getProperlyFormattedFormInputs(e.formInputs);
  var fetchParams = {table: "Contacts", method: "POST", fieldsToPost: fieldsToPost};
  
  fetchAirtable(fetchParams); // Post data to Airtable
  
  fetchParams = {
    table: "Contacts",
    filter: [
      {field: "Email", query: fieldsToPost["Email"]}
    ]
  };
  
  var cardParams = {mode: "read", table: "Contacts", nav: "popToRootAndUpdateAndPush", record: fetchAirtable(fetchParams).records[0].id};
 
  return buildCard(cardParams);
}





function buildCard__read(cardParams) {
  var header = CardService.newCardHeader().setTitle((cardParams.table == "Companies" ? "Company" : cardParams.table) + " Details").setImageUrl(getIcon(cardParams.table));
  var section = [CardService.newCardSection()];
  var fields = getFields(cardParams.table);
  var record = fetchAirtable({table: cardParams.table, filter: [{caseSensitive: "true", query: cardParams.record}]}).records[0];
  
  fields.forEach(function(field){
    if (record.fields[field]) {
      if (field == "Marketing Type") record.fields[field] = record.fields[field];
      var labelParams = {topLabel: field, content: record.fields[field] ? [].concat(record.fields[field]).join(", ") : ""};
      
      if (getInputType(field) == "linked" ) {
        var newSection = CardService.newCardSection().setHeader(field).setCollapsible(true).setNumUncollapsibleWidgets(5);
        var fetchParams = {table: field, filter: record.fields[field].map(function(query){return {query: query, caseSensitive: true};}).slice(0,20)};
        var linkedRecords = fetchAirtable(fetchParams).records.reverse();
        
        linkedRecords.forEach(function(linkedRecord) {
          var actionParams__read = {icon: "arrow_blue", mode: "read", nav: "push", table: field, record: linkedRecord.id};
          var labelParams = {
            content: linkedRecord.fields[getFields(field)[0]],
            bottomLabel: linkedRecord.fields[getFields(field)[1]],
            topLabel: linkedRecord.fields["Vendor Roll Type"] ? linkedRecord.fields["Vendor Roll Type"].join(", ") : "", 
            button: buildImageButton(actionParams__read)
          };
          
          var label = buildLabel(labelParams)
          newSection.addWidget(label);
        });
        
        section.push(newSection);
      }
      else if (getInputType(field) == "attachment") {
        var newSection = CardService.newCardSection().setHeader(field).setCollapsible(true).setNumUncollapsibleWidgets(5);
        
        record.fields[field].reverse().forEach(function(attachment){
          var actionParams = {url: (attachment.type == "application/pdf" ? "https://docs.google.com/gview?url=" : "") + attachment.url, icon:"arrow_grey"}; 
          var labelParams = {content: attachment.filename, button: buildImageButton(actionParams)};
          newSection.addWidget(buildLabel(labelParams));
        });
        
        section.push(newSection);
      }
      else {
        section[0].addWidget(buildLabel(labelParams));
      }
    }
  });
  
  var actionParams__edit = {text:"edit", mode: "edit", nav: "push", table: cardParams.table, record: record.id};
  var actionParams__refresh = {text: "refresh", mode: "read", nav: "update", table: cardParams.table, record: record.id};
  var buttonParams__openAT = {text: "open in airtable", url: getOpenAirtableURL({table: cardParams.table, record: record.id})};
  
  var buttonSet = CardService.newButtonSet().addButton(buildButton(actionParams__edit)).addButton(buildButton(actionParams__refresh)).addButton(buildButton(buttonParams__openAT));
  var newSection = CardService.newCardSection().addWidget(buttonSet)
  section.push(newSection);
  
  return {header: header, section: section}; 
}



function buildCard__edit(cardParams) {
  var header = CardService.newCardHeader().setTitle("Edit");
  var section = CardService.newCardSection(); 
  
  var fields = getFields(cardParams.table);
  var record = fetchAirtable({table: cardParams.table, filter:[{caseSensitive: true, query: cardParams.record}]}).records[0];
  
  fields.forEach(function(field) {
    var inputParams = {type: getInputType(field), field: field, value: record.fields[field] ? record.fields[field] : ""};
    var labelParams = {topLabel: field, content: record.fields[field] ? [].concat(record.fields[field]).join(", ") : "" , bottomLabel: "This field cannot be indirectly updated"};
    
    section.addWidget(getInputType(field) == "linked" || getInputType(field) == "attachment" ? (labelParams.content = "", buildLabel(labelParams)) : buildInput(inputParams));
  });
  
  var actionParams__update = {text:"update", style: "true", func:"buildCard__update", table: cardParams.table, record: record.id};
  section.addWidget(buildButton(actionParams__update));
  
  return {header: header, section: [section]};
}



function buildCard__update(e) {
  var cardParams = e.parameters;
  getFields(cardParams.table)
    .filter(function(field){if (getInputType(field) == "select" && !e.formInputs[field]) return field})
    .forEach(function(field){e.formInputs[field] = []});
  
  var fieldsToPost = getProperlyFormattedFormInputs(e.formInputs);
  var fetchParams = {method: "PATCH", table: cardParams.table, record: cardParams.record, fieldsToPost: fieldsToPost};
  
  fetchAirtable(fetchParams); // Update data in Airtable
  
  var cardParams = {mode: "read", table: cardParams.table, nav: "popAndUpdate", record: cardParams.record};
 
  return buildCard(cardParams);
}


function buildCard__search(cardParams) {
  var header = CardService.newCardHeader().setTitle("Search for stuff").setImageUrl(getIcon("search_blue"));
  var section = [];
  
  
  var inputParams = [
    {table: "Contacts", fields: ["Contact", "Email", "Email Secondary"]},
    {table: "Companies", fields: ["Name"]},
    {table: "Pipeline", fields: ["Name", /*"Company","Contact"*/, "SO#", "Pipeline Stage & Category"]}
  ];
  
  inputParams.forEach(function(inputParam, i) {
    var newSection = CardService.newCardSection().setCollapsible(true).setNumUncollapsibleWidgets(1);
    newSection.addWidget(buildLabel({content: "<b><font color='#333333'>" + inputParam.table + "</font></b>"}));
    
    inputParam.fields.forEach(function(field) {
      var inputParams = {field: field, type: getInputType(field)};
      newSection.addWidget(buildInput(inputParams));
    });
    
    var actionParams = {text: "Search", style: "true", func:"buildCard__searchFields", table: inputParam.table, fields: JSON.stringify(inputParam.fields)};
    section.push(newSection.addWidget(buildButton(actionParams)));
  });
  
  return {header: header, section: section};
}



function buildCard__searchFields(e) {
  var fields = JSON.parse(e.parameters.fields);
  var formInputs = getProperlyFormattedFormInputs(e.formInputs);
  var fetchParams = {table: e.parameters.table, filter: []};
  
  fields.forEach(function(field){
    if (formInputs[field]) fetchParams.filter.push({field: field, query: formInputs[field]});
  });
  
  ////////////////////
  
  var records = fetchAirtable(fetchParams).records;
  var section = CardService.newCardSection();
  var sortBy = getFields(e.parameters.table)[0];
  
  if (records.length) {
    records = records.sort(function(a,b) {
      if (a.fields[sortBy].toLowerCase() > b.fields[sortBy].toLowerCase()) return 1;
      else if (a.fields[sortBy].toLowerCase() < b.fields[sortBy].toLowerCase()) return -1;
      else return 0;
    });

    records.forEach(function(record){
      var actionParams = {icon: "arrow_blue", mode: "read", table: e.parameters.table, record: record.id};
      var labelParams = {
        content: record.fields[getFields(e.parameters.table)[0]],
        bottomLabel: record.fields[getFields(e.parameters.table)[1]],
        topLabel: record.fields["Vendor Roll Type"] ? record.fields["Vendor Roll Type"].join(", ") : "",
        button: buildImageButton(actionParams)};
      
      section.addWidget(buildLabel(labelParams));
    });
  } else section.addWidget(buildLabel({content: "No search results"}));
  
  var cardParams = {mode: "display", section: section};
  return buildCard(cardParams);
}



function buildCard__display(cardParams) {
  var header = CardService.newCardHeader().setTitle("Search results").setImageUrl(getIcon("list_blue"));
  var section = cardParams.section;
  
  return {header: header, section: [section]};
}

function getUser() {
  var userProperties = PropertiesService.getUserProperties();
  return userProperties.getProperty("USER_NAME");
}

function updateUserSettings(e) {
  var userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty("USER_NAME", e.formInputs.User[0]);
}


function getUserViews() {
  var userProperties = PropertiesService.getUserProperties();
  var obj = JSON.parse(userProperties.getProperty("USER_VIEWS"));
  return obj && obj[getUser()] ? obj[getUser()] : "";
}

function updateUserSettingsViews(e) {
  var userProperties = PropertiesService.getUserProperties();
  var obj = userProperties.getProperty("USER_VIEWS") ? userProperties.getProperty("USER_VIEWS") : {};
  var tempObj = obj.length ? JSON.parse(obj) : {};
  tempObj[getUser()] = e.formInput;
  
  userProperties.setProperty("USER_VIEWS", JSON.stringify(tempObj));
}


function buildCard__userSettings(cardParams) {
  var header  = CardService.newCardHeader().setTitle("Settings").setImageUrl(getIcon("settings_blue"));
  var section = CardService.newCardSection();
  var inputParams = {field: "User", type: "select", onChange: buildAction({func: "updateUserSettings"})};
  
  if (cardParams.user)
    inputParams.value = cardParams.user;
  
  section.addWidget(buildInput(inputParams));
  
  var buttonParams = {text: "update user views", style: "true", func: "changeUserViews"};
  section.addWidget(buildButton(buttonParams));
  
  return {header: header, section: [section]};
}

function changeUserViews() {
  var card = CardService.newCardBuilder().setHeader(CardService.newCardHeader().setTitle("Set Airtable views for " + getUser()).setImageUrl(getIcon("view_carousel")));
  var section = CardService.newCardSection();
 
  var labelParams = {
    topLabel: "Copy and paste view IDs into inputs below.",
    content: "",
    bottomLabel: "View ID begins with 'viw'. Do not include question mark."
  }; 
  section.addWidget(buildLabel(labelParams));
  
  var userViews = getUserViews();
 
  var inputs = [
    {field: "Contacts", value: userViews ? userViews.Contacts : ""},
    {field: "Companies", value: userViews ? userViews.Companies : ""},
    {field: "Pipeline", value: userViews ? userViews.Pipeline : ""}
  ].forEach(function(input){
    section.addWidget(buildInput(input));
  })
  
  
  var buttonParams = {text: "Update", style: "true", func: "updateUserViews"};
  section.addWidget(buildButton(buttonParams));
  
  
  card.addSection(section);
  
  card = card.build();
   var nav = CardService.newNavigation();
  
   nav.pushCard(card);
  
    return CardService
    .newActionResponseBuilder()
    .setNavigation(nav)
    .build();  
}

function updateUserViews(e) {  
  updateUserSettingsViews(e);
  
  var nav = CardService.newNavigation().popCard();
  
  return CardService
  .newActionResponseBuilder()
  .setNavigation(nav)
  .build();  
}


/*///////////////////////////////////////////
                            extra stuff
*////////////////////////////////////////////


function setEmails(e) {
  var userProperties = PropertiesService.getUserProperties();
  
  var accessToken = e.messageMetadata.accessToken;
  GmailApp.setCurrentMessageAccessToken(accessToken);

  var messageId = e.messageMetadata.messageId;
  var currentMessage = GmailApp.getMessageById(messageId);
  
  var emails = [];
  var thread = currentMessage.getThread().getMessages();
  
  thread.forEach(function(message){
    var from = message.getFrom();
    var cc = message.getCc();
    var bcc = message.getBcc();
    var to = message.getTo();
    
    emails = emails.concat([from]).concat([to]);;
    if (cc) emails = emails.concat(cc.split(", "));
    if (bcc) emails = emails.concat(bcc.split(", "));
  });
 
  
  emails = emails.map(function(email){
    var name;
    var address;
    
    if (email.indexOf("<") >= 0) {
      name = email.substring(0, email.indexOf("<") - 1);
      address = email.substring(email.indexOf("<") + 1, email.length - 1);
    } else address = email; 
    
    return {name: name, address: address};
  });
  
  emails = emails.sort(sortEmailsIfNameExists);
  
  emails = emails.filter(function(email, i, a){
    var addresses = a.map(function(a){
      return a.address;
    });
    
    return addresses.indexOf(email.address) == i;
  });
  
  emails = emails.sort(sortEmails);
  
  userProperties.deleteProperty("email");
  userProperties.setProperties({emails: JSON.stringify(emails)});
}

function sortEmailsIfNameExists(a,b) {
  if (a.name) return -1;
  else if (b.name) return 1;
  else return 0;
}

function sortEmails(a,b) {
  if (a.address.toLowerCase() > b.address.toLowerCase()) return 1
  else if (a.address.toLowerCase() < b.address.toLowerCase() ) return -1;
  else return 0;
}


function getEmails() {
  var userProperties = PropertiesService.getUserProperties();
  return JSON.parse(userProperties.getProperty("emails"));
}


function getProperlyFormattedFormInputs(formInputs) {
  var keys = Object.keys(formInputs);
  
Logger.log(JSON.stringify(formInputs));
  
  keys.forEach(function(field){
    if (getInputType(field) == "single" || (getInputType(field) == "select" && getInputOptions(field).fix)) {
      if (formInputs[field][0].length > 0) formInputs[field] = formInputs[field][0];
      else formInputs[field] = null;
    } 
  });
  
  return formInputs;
}



/*///////////////////////////////////////////
                            build ui elements
*////////////////////////////////////////////

function getIcon(name) {
  return {
    fiber_new: "https://www.gstatic.com/images/icons/material/system/1x/fiber_new_grey600_48dp.png",
    email_blue: "https://www.gstatic.com/images/icons/material/system/1x/email_googblue_48dp.png",
    settings_blue: "https://www.gstatic.com/images/icons/material/system/1x/settings_googblue_48dp.png",
    list_blue: "https://www.gstatic.com/images/icons/material/system/1x/list_googblue_48dp.png",
    view_carousel: "https://www.gstatic.com/images/icons/material/system/1x/view_carousel_googblue_48dp.png",
    
    search_blue: "https://www.gstatic.com/images/icons/material/system/1x/search_googblue_48dp.png",
    
    arrow_blue: "https://www.gstatic.com/images/icons/material/system/1x/keyboard_arrow_right_googblue_48dp.png",
    arrow_grey: "https://www.gstatic.com/images/icons/material/system/1x/keyboard_arrow_right_grey600_48dp.png",
    
    edit_blue: "https://www.gstatic.com/images/icons/material/system/1x/edit_googblue_48dp.png", 
    edit_grey: "https://www.gstatic.com/images/icons/material/system/1x/edit_grey600_48dp.png", 
    
    face_blue: "https://www.gstatic.com/images/icons/material/system/1x/face_googblue_48dp.png",
    face_grey: "https://www.gstatic.com/images/icons/material/system/1x/face_grey600_48dp.png",
    
    store_blue: "https://www.gstatic.com/images/icons/material/system/1x/linear_scale_googblue_48dp.png",
    store_grey: "https://www.gstatic.com/images/icons/material/system/1x/linear_scale_grey600_48dp.png",
    
    pipeline_blue: "https://www.gstatic.com/images/icons/material/system/1x/linear_scale_googblue_48dp.png",
    pipeline_grey: "https://www.gstatic.com/images/icons/material/system/1x/linear_scale_grey600_48dp.png",
    
    Contacts:  "https://www.gstatic.com/images/icons/material/system/1x/child_care_googblue_48dp.png",
    Companies: "https://www.gstatic.com/images/icons/material/system/1x/work_outline_googblue_48dp.png",
    Pipeline: "https://www.gstatic.com/images/icons/material/system/1x/linear_scale_googblue_48dp.png"
  }[name];
}

function buildAction(actionParams) {
  var action = CardService
    .newAction()
    .setFunctionName(actionParams.func ? actionParams.func : "buildCard")
    .setParameters(actionParams)
  return action;
}

function buildButton(actionParams) {
  var button = CardService.newTextButton().setText(actionParams.text).setOnClickAction(buildAction(actionParams));
  if (actionParams.style) button.setTextButtonStyle(CardService.TextButtonStyle.FILLED);
  if (actionParams.url) button.setOpenLink(CardService.newOpenLink().setUrl(actionParams.url));
  return button;
}


function buildImageButton(actionParams) {
  var button = CardService.newImageButton();
  button.setIconUrl(getIcon(actionParams.icon));
  if (!actionParams.url) button.setOnClickAction(buildAction(actionParams));
  else button.setOpenLink(CardService.newOpenLink().setUrl(actionParams.url));
  return button;
}


function buildLabel(labelParams) {
  var label = CardService.newKeyValue().setContent(labelParams.content).setMultiline(true);
  
  if (labelParams.bottomLabel) label.setBottomLabel(labelParams.bottomLabel);
  if (labelParams.topLabel) label.setTopLabel(labelParams.topLabel);
  if (labelParams.button) label.setButton(labelParams.button);
  
  return label;
}


function buildInput(inputParams) {  
  if (inputParams.type == "select") {
    var input;
    var inputOptions = getInputOptions(inputParams.field);
    input = CardService.newSelectionInput().setTitle(inputParams.field).setFieldName(inputParams.field).setType(inputOptions.type);
    
    inputOptions.options.forEach(function(option) {
      input.addItem(option, option, (inputParams.value &&inputParams.value.indexOf(option) > -1 && option) ? true : false);
    });
    
    if (inputParams.onChange) input.setOnChangeAction(inputParams.onChange);
    
    return input;
  }
  
  else if (inputParams.type == "linked") {
    var labelParams = {
      topLabel: inputParams.field,
      content: inputParams.field,
      bottomLabel: "This record can only be changed in Airtable"
    };
     return CardService.newTextInput().setTitle(inputParams.field).setFieldName(inputParams.field);
    return buildLabel(inputParams);
  }
  
  else if (inputParams.type == "date") {
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var years = Array(10).fill("").map(function(a,i){return i + 2018;});
    var days = Array(31).fill("").map(function(a,i){return i + 1;});
    /*
       Disabled
    */
    var monthInput = CardService.newSelectionInput().setTitle("Month").setFieldName("Month");
  }
  
  else {
    var title = ["MRW Action", "MLK Action", "Seth Action", "Ship"].indexOf(inputParams.field) !== -1 ? inputParams.field + " (yyyy-mm-dd)" : inputParams.field;
    var input = CardService.newTextInput().setTitle(title).setFieldName(inputParams.field).setMultiline(true);
    if (inputParams.value) input.setValue(inputParams.value);
    return input;
  }
}



/*///////////////////////////////////////////
                           airtable utilities
*////////////////////////////////////////////

function getFields(table) {
  var fields = {
    "Contacts": ["Contact", "Email", "Companies", "Marketing Type", "Pipeline", "Notes / Relations", "Job Title", "Vendor Roll Type", "Phone Numbers", "Email Secondary"],
    "Companies": ["Name", "Account #", "Company Phone", "Misc Vendor Notes", "All Pricing", "Trade: Catalog / Pricing", "Dealer Pricing & Other Documents", "Contacts", "Pipeline"],
    "Pipeline": ["Name", "Pipeline Stage & Category", "Employee", "Contacts", "Companies", "Notes", "Ticket / Default", "SO#", "Ship"].concat(getUser() ? getUserFields() : [])
  }[table];
  return fields;
}

function getUserFields() {
  return {
    "Michael": ["MRW Priority", "MRW Action"],
    "Michele": ["MLK Priority", "MLK Action", "Tracking Info - MASTER PUT EVERYTHING HERE"],
    "Seth": ["Seth Priority", "Seth Action"]
  }[getUser()];
}

function getInputOptions(field) {
  return {
    "Vendor Roll Type": {type: CardService.SelectionInputType.CHECK_BOX, options: ["Accounting", "Sales", "Order Entry", "Customer Service", "Marketing", "Owner", "Logistics", "Trade Portal"]},
    "Marketing Type": {type: CardService.SelectionInputType.CHECK_BOX, options: ["Unsubscribed", "Development", "Employee", "Friend", "Trade & Commercial Portal", "Retail Newsletter", "Bounced", "Buys Through Another Company"]},
    "Employee": {type: CardService.SelectionInputType.CHECK_BOX, options: ["Michael","Johnny","Beau","Michele)","Seth","Margaret","Extra Hand","Nick","Jay","Dom"]},
    "Pipeline Stage & Category": {type: CardService.SelectionInputType.CHECK_BOX, options: ["Interested Lead","Waiting on Floor Models","Make a Quote","Quote Sent - Waiting","Waiting Payment","Quote Stalled - Punt","Customer Service in Progress","Holding Orders","Generate PO","Problem w/ Order","Waiting SO","SO in Review","Waiting SO Changes","Holding at Vendor","Waiting Shipping","Partially Shipped","Split Shipped - Part in Transit","Split Shipped - Part Arrived","In Transit - Container","In Transit - Truck","Picking Up","Checking In / Confirm Arrival","Partially Received","Consolidating","Waiting Arrival to Schedule Delivery","Make Appointment","Appointment Set","Unresolved Accounting Issue","Accounting & Crosscheck","Third Party Referral","Store Logistics / Help","Company Organizing","Considering for Floor","Purchasing","Development","Marketing","Human Resources","Tech Tasks","Potential Leads","Product Load","Borrowed Samples"]},
    "MRW Priority": {type: CardService.SelectionInputType.DROPDOWN, fix: true, options: ["", "", "Atomic - Now", "High", "Low", "Waiting", "Waiting - Today", "MRW Review", "Completed"]},
    "MLK Priority": {type: CardService.SelectionInputType.DROPDOWN, fix: true, options: ["", "", "Atomic - Now", "High", "Low", "Waiting", "Waiting - Today", "MLK Review", "Completed"]},
    "Seth Priority": {type: CardService.SelectionInputType.DROPDOWN, fix: true, options: ["", "", "Atomic - Now", "High", "Low", "Waiting", "Waiting - Today", "Seth Review", "Completed"]},
    "User": {type: CardService.SelectionInputType.DROPDOWN, fix: true, options: ["Michael", "Michele", "Seth"]}
  }[field];
}


function getInputType(field) {
  var date = ["MRW Action", "MLK Action", "Seth Action", "Ship"];
  var select = ["Employee", "Marketing Type", "Pipeline Stage & Category", "Priority", "User", "MRW Priority", "MLK Priority", "Seth Priority", "Vendor Roll Type"];
  var linked_fields = ["Contacts", "Companies", "Pipeline"];
  var attachment = ["Trade: Catalog / Pricing", "Dealer Pricing & Other Documents", "Ticket / Default"];
  
  if (select.indexOf(field) !== -1) return "select";
  if (linked_fields.indexOf(field) !== -1) return "linked";
  if (attachment.indexOf(field) !== -1) return "attachment";
 // if (date.indexOf(field) !== -1) return "date";
  return "single";
}


function buildFetchFilter(entries) {
  var filterParams = "";
  
  entries.forEach(function(entry) {
    if (entry.caseSensitive) filterParams += "record_id='" + entry.query + "',"
    else if (typeof entry.query !== "string") {
      filterParams += "AND(";
      entry.query.forEach(function(query){
        filterParams += "SEARCH('" + query.toLowerCase() + "', LOWER({" + entry.field + "})),";
      });
      filterParams = filterParams.slice(0,-1) + "),";
    }
    else filterParams += "SEARCH('" + entry.query.toLowerCase() + "', LOWER({" + entry.field + "})),";
  });
  
  var filter = "&filterByFormula=OR(" + encodeURIComponent(filterParams.slice(0,-1)) + ")&sort[0][field]=lastModified&sort[0][direction]=asc";
  return filter;
}


function buildNotification(notificationParams) {
  return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
          .setText(notificationParams.text))
      .build();
}

function getOpenAirtableURL(fetchParams) {
  var table = {
    "Contacts": " table ID ",
    "Companies": " table ID ",
    "Pipeline": " table ID "
  }[fetchParams.table];

  return "https://www.airtable.com/" + table + getView(fetchParams.table) + "/" + fetchParams.record;
}

function getView(table) {
  var views = {
    "Contacts": {"Michael": " view ID "},
    "Companies": {"Michael": " view ID "},
    "Pipeline":{"Michael": " view ID "}
  };
  
  var userViews = getUserViews();
  return userViews && userViews[table] ? "/" + userViews[table] : "";
}

function fetchAirtable(fetchParams, previousData) {
//  Logger.log("fetch params\n\n" + JSON.stringify(fetchParams));
  var base = " app ID /";
  var table = {
    "Contacts": " table ID ",
    "Companies": " table ID ",
    "Pipeline": " table ID "
  }[fetchParams.table];
  var key = " key ";
  var filter = fetchParams.filter ? buildFetchFilter(fetchParams.filter) : ""; 
  var offset = fetchParams.offset ? "&offset=" + fetchParams.offset : "";
  var record = fetchParams.method == "PATCH" ? "/" + fetchParams.record : "";
  
  var httpParams = {
    "method": fetchParams.method ? fetchParams.method : "GET",
    "contentType": "application/json",
    "muteHttpExceptions": false,
    "payload": fetchParams.fieldsToPost ? JSON.stringify({fields: fetchParams.fieldsToPost}) : ""
  };

  var url = "https://api.airtable.com/v0/" + base + table + record + "?api_key=" + key + filter + offset;
//    Logger.log("url\n\n" + url);
  
  
  var response = UrlFetchApp.fetch(url, httpParams);
  var json = response.getContentText();
  var data = JSON.parse(json); 
 

  if (previousData) data.records.concat(previousData.records);
  if (data.offset) {
    fetchParams.filter = "";
    fetchParams.offset = data.offset;
    return fetchAirtable(fetchParams, previousData);
  }
  
  return data;
}
