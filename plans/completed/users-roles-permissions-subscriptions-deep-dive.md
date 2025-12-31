I am 100% certain that my user repositories, user services, user roles/permissions, along with the subscription features is not working entirely the way that it should.

What does work?

- Creating a user works

But there are many issues.

1. when creating a trainer/contracting admin, the user somehow is being put in the recruiting list table in the admin page, which is wrong. trainers and contracting admins
   don't need access to policies table, analytics, targets, etc. They simply just need access to each recruit regardless of agency, bound to the IMO, and need the ability to create their own re-usable
   templates etc, which i think somewhat is working, except theres issues with the global templates in the training hub, not being able to delete a global template for some reason.

but altogether, we need to carefully scrutinize how all of these services tie together and ensure that when users are created, they have to proper access they need and if roles/permissions apply
they won't have access to specific pages of the application. and we also need to make sure that trainers/contracting admins, are included for anything regarding subscriptions. i will allow
those roles to have access without subscriptions.

what exactly does creating a user that has admin privleges allow?

why in the edit user dialog, are there two clickable roles for active agents?
Theres one thats 'Active Agent' and theres another which is 'Agent (Active)'...why are there two of the what i assume to be the exact same?

and not only that but in the admin page, under the roles & permissions tab, its displaying them both as follows:

Active Agent active_agent Licensed agent with application access 7 1

and

Agent (Active) agent Licensed agent selling policies 25 10

WHY?

in Admin Page -> roles & permissions tab -> clicking action button for any role does nothing at all

where is the super-admin role? Thats only me. one user only. nickneessen@thestandardhq.com

what responsibities does the admin have?

why when adding a new user, are we not able to select the IMO, or the agency? this should be implemented but only for recruits and agents.

if its other roles, IMO must be selected, but agency, can be optional, in the event those roles are in fact handling imos entirely. but some agencies may want their own office staff only tied to their speicific agecy.
