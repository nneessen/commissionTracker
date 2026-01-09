Policies Page

Function thats encoutnering an issue:

- edit policy

Problem needing diagnosed:

- on initial render of policy page, when you click on a single policy and click edit, the dialog populates everything correct.
- this is the object on first time thats clicked: [PolicyForm] Populating form for policy: {policyId: 'e099c086-c69d-4ac0-a884-850cd528d6b5', policyNumber: 'Kawanya', clientName: 'Kawanya Poke', carrierId: '0db015b9-defc-4184-b7ca-2063d9ed4caf', carriersLoaded: 13}

then in the console after the update this object gets logged: [PolicyForm] Populating form for policy: {policyId: 'e099c086-c69d-4ac0-a884-850cd528d6b5', policyNumber: 'Kawanya', clientName: 'Unknown', carrierId: '5fcc1244-46ed-4b41-bed1-b3e088433bdd', carriersLoaded: 13} and youll see those fields clearing out.

Then after you click update, then go back to click edit one more time again, everything is wrong.

- client name is says Unknown, state is empty, age is empty, and the carrier/product comp changes to something different(wrong comps are being displayed somehow)

this is the object after clicking the 2nd time around: [PolicyForm] Populating form for policy: {policyId: 'e099c086-c69d-4ac0-a884-850cd528d6b5', policyNumber: 'Kawanya', clientName: 'Unknown', carrierId: 'd619cc12-0a24-4242-9a2d-3dada1fb4b1e', carriersLoaded: 13}

Why is this happening? Needs fix...
