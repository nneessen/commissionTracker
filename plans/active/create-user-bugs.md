Currently Creating a new user is broken again.

admin page -> add new user button -> add new user dialog ->
email of new user im trying to create: nickneessen.ffl@gmail.com

first name: TEST
last name: AGENT

phone: 8594335907

upline: no upline

additional roles: agent(active)

status: approved(agent)

on submit, i get the following error in the console:
userService.ts:248 POST https://pcyaqwodnyrpkaiojnpz.supabase.co/functions/v1/create-auth-user 400 (Bad Request)
create @ userService.ts:248
await in create
createUser @ userService.ts:861
handleAddUser @ AdminControlCenter.tsx:196
handleSave @ AddUserDialog.tsx:93
executeDispatch @ react-dom_client.js?v=095a5428:13622
runWithFiberInDEV @ react-dom_client.js?v=095a5428:997
processDispatchQueue @ react-dom_client.js?v=095a5428:13658
(anonymous) @ react-dom_client.js?v=095a5428:14071
batchedUpdates$1 @ react-dom_client.js?v=095a5428:2626
dispatchEventForPluginEventSystem @ react-dom_client.js?v=095a5428:13763
dispatchEvent @ react-dom_client.js?v=095a5428:16784
dispatchDiscreteEvent @ react-dom_client.js?v=095a5428:16765Understand this error
installHook.js:1 [userService.create] Edge function failed: {status: 400, statusText: '', error: 'Database error creating new user', details: 'AuthApiError: Database error creating new user', fullResult: {…}}
