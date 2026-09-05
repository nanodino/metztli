# Description
Metztli is a project making it easy to enter lunatask tasks via handwriting them on an iPad. Due dates for tasks are parsed using natural language, and both absolute (`September 5th`) and relative (`tomorrow`, `next Monday`) dates are recognized.

# Why?
The physical act of note-taking improves retention. But sometimes you just really need reminders. A hybrid system is worth exploring.

# Usage
You'll need an iPad with scribble turned on, the Notes app, Shortcuts (the Apple service, not the SaaS previously known as Clubhouse), this service, and a Lunatask account.

## Setup
### Deployment
TODO: add deployment instructions using tailscale funnels for reachability

### Lunatask credentials
Open Lunatask on your desktop. Navigate to Settings > Access tokens > New token. Give it whatever name you want, then copy it into the `LUNATASK_TOKEN` variable.

Then, pick the area you want new tasks to default to. Right-click on its name, hit `Area Settings`, then copy the area ID into the `LUNATASK_DEFAULT_AREA_ID` variable.

### Setup Notes
Create two new folders in your Notes app. First, one called `Metztli Notes` (or similar). Then, create a second folder called `Metztli Archive`, to move notes into after processing.

### Build the shortcut
Open the Shortcuts app on your iPad and create a new shortcut. It needs to have the following actions:
1. Find Notes - filter by `Metztli Notes` folder and sort by date created.
2. Repeat with each:
	a. Get text from notes
	b. Get contents of URL: `POST` to your URL, setting the headers `x-secret` to your `SHORTCUT_SECRET` and `Content-Type` to `application/json`. The request body should look like:

	```
	{ "text": [Text from step 2a] }
	```
	c. Get Dictionary from Input on the URL response, to read `failed`
	d. If `failed` is 0, move the note to the `Metztli Archive` folder. Otherwise, leave the note in place so nothing is lost if something goes wrong and show a notification with the error

### Automate the trigger
In the Shortcuts app, go to the Automation tab and create a Personal Automation. Turn off `Ask Before Running`. You can choose the automations you want, for instance use Time of Day to process them on a schedule, or run it every time the notes app is closed.

## end-to-end process
1. You write `- pick up photos on Friday`, `- set up Tailscale funnels`, and `- write documentation next week` in a note.
2. The automation fires when you set it up to do so.
3. The Shortcut sends the text to your metztli server and moves the note to Archive so it won't be reprocessed.
4. Metztli splits the text into lines, parses the dates, strips the title of the date phrase, and creates Lunatask tasks in the area you selected. You can then move them as needed.
5. Ta-da.

# name
Metztli is a nahuatl word that means moon.
